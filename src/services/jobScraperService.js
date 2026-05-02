import FirecrawlApp from '@mendable/firecrawl-js';

// ─── PADRÕES DE LIXO (títulos inválidos) ────────────────────

const JUNK_TITLE_PATTERNS = [
  // Seções de detalhe de vaga (Indeed retorna isso quando bloqueia a listagem)
  /^dados\s+da\s+vaga$/i,
  /^tipo\s+de\s+vaga$/i,
  /^localiza[çc][aã]o$/i,
  /^benef[ií]cios/i,
  /^turno\s+e\s+hor[áa]rio/i,
  /^hor[áa]rio\s+de\s+trabalho/i,
  /^descri[çc][aã]o\s+completa/i,
  /^requisitos/i,
  /^responsabilidades/i,
  /^sobre\s+a\s+(empresa|vaga)/i,
  /^o\s+que\s+(oferecemos|buscamos|voc[eê])/i,
  /^carga\s+hor[áa]ria/i,
  /^regime\s+de\s+contrata/i,
  /^n[ií]vel\s+de\s+experi[eê]ncia/i,
  /^forma[çc][aã]o\s+acad[eê]mica/i,
  /^informa[çc][õo]es\s+adicionais/i,
  /^candidate-se/i,
  /^aplicar\s+agora/i,
  /^ver\s+mais\s+vagas/i,
  /ícone[-\s]salvar/i,
  /job\s+post\s*$/i,
  /^\d+\s+km\s+de\s+voc[eê]/i,
  /^home\s+office\s+\(\d+\)/i,
  /^vagas\s+de\s+emprego\s+de\s+/i,  // Títulos de listagem da Infojobs
  /^emprego\s+de\s+/i,
  /^vaga\s+(de\s+)?emprego/i,
  // Navegação e UI
  /^skip\s/i, /^pular/i, /^menu/i, /^nav/i, /^footer/i,
  /^cookie/i, /^crie\s+seu/i, /^cadastr/i, /^login$/i,
  /^entrar$/i, /^sign\s/i, /^ordenar/i, /^filtrar/i,
  /^buscar$/i, /^pesquisar$/i, /receba\s+alertas/i,
  /^continuar$/i, /^fechar$/i, /^voltar$/i,
  /^\*\*/i, /^&nbsp/i
];

function isJunk(title) {
  if (!title) return true;
  const t = title.trim();
  if (t.length < 8 || t.length > 200) return true;
  return JUNK_TITLE_PATTERNS.some(p => p.test(t));
}

function clean(text, max = 400) {
  if (!text) return '';
  return text
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[#*`]/g, '')
    .replace(/\([^)]*https?[^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/&nbsp;?/g, ' ')
    .trim()
    .substring(0, max);
}

function extractSalary(text) {
  const m = text.match(/R\$\s?[\d.,]+(?:\s*(?:a|até|-|~)\s*R\$\s?[\d.,]+)?/i);
  return m ? m[0].trim() : null;
}

function extractModality(t) {
  if (/\bremoto\b|\bremote\b|\bhome\s?office\b/i.test(t)) return 'Remoto';
  if (/\bh[ií]brido\b|\bhybrid\b/i.test(t)) return 'Híbrido';
  if (/\bpresencial\b|\bon.?site\b/i.test(t)) return 'Presencial';
  return null;
}

function extractContract(t) {
  if (/\bCLT\b/i.test(t)) return 'CLT';
  if (/\bPJ\b|pessoa\s+jur[ií]dica/i.test(t)) return 'PJ';
  if (/est[áa]gio|estagiário/i.test(t)) return 'Estágio';
  return null;
}

function extractLevel(t) {
  if (/\bj[uú]nior\b|\bjr\b/i.test(t)) return 'Júnior';
  if (/\bpleno\b/i.test(t)) return 'Pleno';
  if (/\bs[eê]nior\b|\bsr\b/i.test(t)) return 'Sênior';
  if (/\bgerente\b|\bmanager\b|\bl[ií]der\b|\bcoordenador\b/i.test(t)) return 'Gerencial';
  return null;
}

// ─── FILTRO DE LOCALIZAÇÃO ──────────────────────────────────

/**
 * Verifica se a localização de uma vaga corresponde aos locais buscados.
 * Aceita: localidade contida no campo, ou vaga remota/home office.
 */
function locationMatches(jobLocation, searchedLocals) {
  if (!jobLocation) return false;
  const loc = jobLocation.toLowerCase();

  // Vagas remotas sempre passam
  if (/remoto|home.?office/i.test(loc)) return true;

  // Verificar se algum local buscado está na localização da vaga
  return searchedLocals.some(local => {
    const l = local.toLowerCase().trim();
    return loc.includes(l) || l.includes(loc.split(/[\s,-]/)[0]);
  });
}

// ─── FILTRO DE RELEVÂNCIA DE CARGO ─────────────────────────

function cargoMatches(title, cargo) {
  if (!title || !cargo) return false;
  const t = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const c = cargo.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const words = c.split(/\s+/).filter(w => w.length > 2);
  return words.some(w => t.includes(w));
}

// ─── PARSER DE LISTAGEM (Catho/Infojobs) ───────────────────

/**
 * Extrai vagas individuais de markdown de páginas de listagem.
 * REGRA FUNDAMENTAL: só aceita vagas com URL ÚNICA (não a URL da listagem).
 */
function parseListingMarkdown(markdown, fonte, listingUrl, cargo, localizacao, searchedLocals) {
  const vagas = [];
  const lines = markdown.split('\n');

  let currentVaga = null;
  let contextLines = [];

  const flushCurrent = () => {
    if (!currentVaga) return;

    const ctx = contextLines.join(' ');

    // Completar dados ausentes com o contexto
    if (!currentVaga.salario) currentVaga.salario = extractSalary(ctx);
    if (!currentVaga.modalidade) currentVaga.modalidade = extractModality(ctx);
    if (!currentVaga.tipo_contrato) currentVaga.tipo_contrato = extractContract(ctx);
    if (!currentVaga.descricao_curta) currentVaga.descricao_curta = clean(ctx, 300);

    // ✅ REGRA: só aceitar vagas com URL própria (diferente da listagem)
    const hasUniqueUrl = currentVaga.url_vaga &&
      currentVaga.url_vaga !== listingUrl &&
      currentVaga.url_vaga.startsWith('http');

    // ✅ REGRA: título deve ser relevante ao cargo
    const titleIsRelevant = cargoMatches(currentVaga.titulo_vaga, cargo);

    // ✅ REGRA: localização deve corresponder (ou ser remoto)
    const locOk = locationMatches(currentVaga.localizacao, searchedLocals) ||
      locationMatches(ctx, searchedLocals);

    if (hasUniqueUrl && !isJunk(currentVaga.titulo_vaga) && titleIsRelevant && locOk) {
      vagas.push(currentVaga);
    } else {
      const reason = !hasUniqueUrl ? 'sem URL única'
        : isJunk(currentVaga.titulo_vaga) ? 'título lixo'
        : !titleIsRelevant ? `irrelevante para "${cargo}"`
        : 'localização não correspondente';
      console.log(`[${fonte}] Descartado (${reason}): "${currentVaga.titulo_vaga}" em ${currentVaga.localizacao}`);
    }

    currentVaga = null;
    contextLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detectar link markdown: [título](url)
    const linkMatch = trimmed.match(/^\[([^\]]{8,150})\]\((https?:\/\/[^)]+)\)/);

    if (linkMatch) {
      const potTitle = linkMatch[1];
      const potUrl = linkMatch[2];

      // Só iniciar nova vaga se a URL for diferente da listagem e o título não for lixo
      if (potUrl !== listingUrl && !isJunk(potTitle)) {
        flushCurrent();
        currentVaga = {
          titulo_vaga: clean(potTitle, 120),
          empresa: 'Não informada',
          localizacao: localizacao, // padrão do search
          salario: null,
          url_vaga: potUrl,
          fonte,
          descricao_curta: '',
          tipo_contrato: null,
          nivel: extractLevel(potTitle),
          modalidade: extractModality(potTitle),
          data_publicacao: null
        };
        contextLines = [];
      } else if (currentVaga) {
        // Link dentro do contexto da vaga atual
        contextLines.push(potTitle);
      }
    } else if (currentVaga) {
      contextLines.push(trimmed);

      // Extrair campos inline do contexto
      if (!currentVaga.salario) currentVaga.salario = extractSalary(trimmed);
      if (!currentVaga.modalidade) currentVaga.modalidade = extractModality(trimmed);
      if (!currentVaga.tipo_contrato) currentVaga.tipo_contrato = extractContract(trimmed);

      // Tentar capturar localização da linha (Infojobs/Catho frequentemente listam)
      const locMatch = trimmed.match(/\b(São Paulo|Rio de Janeiro|Curitiba|Belo Horizonte|Porto Alegre|Brasília|Salvador|Londrina|Maringá|Campinas|Campo Grande|Florianópolis|Goiânia|Fortaleza|Recife|Vitória|Joinville|Ribeirão Preto|Natal|São Luís|Teresina|Maceió|João Pessoa|Aracaju|Porto Velho|Manaus|Belém|Macapá|Boa Vista|Palmas|Cuiabá|Dourados|Três Lagoas|Corumbá|Uberlândia|Sorocaba|Guarulhos|São Bernardo|Santo André|Osasco|Niterói|Duque de Caxias)[^,.\n]*/i);
      if (locMatch) currentVaga.localizacao = locMatch[0].trim().substring(0, 60);
    }
  }

  flushCurrent();

  console.log(`[${fonte}] ✅ ${vagas.length} vagas válidas extraídas da listagem`);
  return vagas;
}

// ─── SCRAPE DE PÁGINA DE LISTAGEM ──────────────────────────

async function scrapeListingPage(app, url, portalName, cargo, localizacao, searchedLocals) {
  console.log(`[${portalName}] Raspando: ${url}`);
  try {
    const response = await app.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 5000,
    });

    const markdown = response?.markdown || '';
    if (!markdown || markdown.length < 200) {
      console.log(`[${portalName}] ⚠️ Markdown vazio ou muito curto (${markdown.length} chars) — portal pode estar bloqueando`);
      return [];
    }

    console.log(`[${portalName}] Markdown: ${markdown.length} chars`);
    return parseListingMarkdown(markdown, portalName, url, cargo, localizacao, searchedLocals);
  } catch (err) {
    console.error(`[${portalName}] Erro: ${err.message}`);
    return [];
  }
}

// ─── BUSCA VIA FIRECRAWL SEARCH (fallback para Indeed) ─────

/**
 * Usa o Firecrawl Search para encontrar URLs de vagas individuais do Indeed.
 * O Search retorna resultados com URL, título e descrição — sem precisar do Scrape.
 */
async function searchIndeed(app, cargo, localizacao) {
  const query = `site:indeed.com.br "${cargo}" "${localizacao}" vaga emprego`;
  console.log(`[Indeed] Search: "${query}"`);

  try {
    const result = await app.search(query, { limit: 10, lang: 'pt', country: 'BR' });
    const items = result?.data || result?.web || (Array.isArray(result) ? result : []);
    if (!Array.isArray(items) || items.length === 0) return [];

    const vagas = [];
    for (const item of items) {
      const title = clean(item.title || '', 120);
      const url = item.url || '';
      const desc = item.description || item.snippet || '';

      if (!url || isJunk(title)) continue;
      if (!cargoMatches(title, cargo)) continue;
      // Rejeitar URLs de listagem — aceitar apenas páginas de vagas individuais
      if (url.includes('/jobs?') || url.includes('/empregos?') || url.includes('/empregos-de-')) continue;

      vagas.push({
        titulo_vaga: title,
        empresa: 'Não informada',
        localizacao: localizacao,
        salario: extractSalary(desc),
        url_vaga: url,
        fonte: 'Indeed',
        descricao_curta: clean(desc, 300),
        tipo_contrato: extractContract(desc) || extractContract(title),
        nivel: extractLevel(title),
        modalidade: extractModality(desc) || extractModality(title),
        data_publicacao: null
      });
    }
    console.log(`[Indeed] ${vagas.length} vagas individuais encontradas`);
    return vagas;
  } catch (err) {
    console.error(`[Indeed] Erro: ${err.message}`);
    return [];
  }
}

// ─── BUSCA LINKEDIN VIA SEARCH API ─────────────────────────

async function searchLinkedIn(app, cargo, localizacao) {
  const query = `site:linkedin.com/jobs "${cargo}" "${localizacao}"`;
  console.log(`[LinkedIn] Search: "${query}"`);

  try {
    const result = await app.search(query, { limit: 10, lang: 'pt', country: 'BR' });
    const items = result?.data || result?.web || (Array.isArray(result) ? result : []);
    if (!Array.isArray(items) || items.length === 0) return [];

    const vagas = [];
    for (const item of items) {
      const title = clean(item.title || '', 120);
      const url = item.url || '';
      const desc = item.description || item.snippet || '';

      if (!url || isJunk(title)) continue;
      if (!cargoMatches(title, cargo)) continue;
      // Aceitar apenas URLs de vagas individuais do LinkedIn
      if (!url.includes('linkedin.com/jobs/view/') && !url.includes('linkedin.com/jobs/collections/')) continue;

      vagas.push({
        titulo_vaga: title.replace(/\s*[-–|]\s*LinkedIn.*$/i, '').trim(),
        empresa: 'Não informada',
        localizacao: localizacao,
        salario: extractSalary(desc),
        url_vaga: url,
        fonte: 'LinkedIn',
        descricao_curta: clean(desc, 300),
        tipo_contrato: extractContract(desc) || extractContract(title),
        nivel: extractLevel(title),
        modalidade: extractModality(desc) || extractModality(title),
        data_publicacao: null
      });
    }
    console.log(`[LinkedIn] ${vagas.length} vagas encontradas`);
    return vagas;
  } catch (err) {
    console.error(`[LinkedIn] Erro: ${err.message}`);
    return [];
  }
}


// ─── CONTROLLER PRINCIPAL ───────────────────────────────────

export async function searchAggregatedJobs(cargo, localizacao, salarioMin, salarioMax, apiKey) {
  const cargos = cargo.split(',').map(c => c.trim()).filter(Boolean);
  const locais = localizacao.split(',').map(l => l.trim()).filter(Boolean);

  console.log(`\n[JobScraper] === BUSCA INICIADA ===`);
  console.log(`[JobScraper] Cargos: ${cargos.join(', ')}`);
  console.log(`[JobScraper] Locais: ${locais.join(', ')}`);

  const app = new FirecrawlApp({ apiKey: apiKey || process.env.FIRECRAWL_API_KEY });
  let allJobs = [];

  for (const c of cargos) {
    for (const l of locais) {
      console.log(`\n[JobScraper] ▶ Buscando "${c}" em "${l}"`);

      const qCargo = encodeURIComponent(c);
      const qLocal = encodeURIComponent(l);
      // Catho: formato slug (lowercase, espaços → hífen)
      const cathoSlugCargo = c.toLowerCase().replace(/\s+/g, '-');
      const cathoSlugLocal = l.toLowerCase().replace(/\s+/g, '-');

      const tasks = [
        // Infojobs — listagem com filtro de localidade correto
        scrapeListingPage(
          app,
          `https://www.infojobs.com.br/vagas-de-${qCargo.toLowerCase().replace(/%20/g, '-')}-em-${qLocal.toLowerCase().replace(/%20/g, '-')}.aspx`,
          'Infojobs', c, l, locais
        ),
        // Catho — listagem com cidade formatada (slug)
        scrapeListingPage(
          app,
          `https://www.catho.com.br/vagas/${cathoSlugCargo}/${cathoSlugLocal}/`,
          'Catho', c, l, locais
        ),
        // Indeed — via Search API (evita bloqueio do scrape direto)
        searchIndeed(app, c, l),
        // LinkedIn — via Search API
        searchLinkedIn(app, c, l)
      ];

      const results = await Promise.allSettled(tasks);
      results.forEach(r => {
        if (r.status === 'fulfilled') allJobs = allJobs.concat(r.value);
        else console.error('[JobScraper] Task falhou:', r.reason?.message);
      });
    }
  }

  // Deduplicar por URL (chave primária)
  const seen = new Map();
  for (const job of allJobs) {
    if (!seen.has(job.url_vaga)) seen.set(job.url_vaga, job);
  }
  const unique = [...seen.values()];

  console.log(`\n[JobScraper] === RESULTADO FINAL: ${unique.length} vagas únicas ===\n`);
  return unique;
}
