import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
dotenv.config();

// Pega a key do argumento ou do .env
const apiKey = process.argv[2] || process.env.FIRECRAWL_API_KEY;

if (!apiKey) {
  console.error('❌ Passe a API key como argumento: node test-firecrawl.js fc-xxx');
  process.exit(1);
}

const app = new FirecrawlApp({ apiKey });

console.log('=== TESTE 1: Firecrawl search() ===');
console.log('Buscando: "vagas comprador londrina"');
console.log('---');

try {
  const searchResult = await app.search('vagas comprador londrina site:indeed.com OR site:infojobs.com.br OR site:catho.com.br', {
    limit: 5,
    lang: 'pt-BR',
    country: 'BR'
  });
  
  console.log('Search retornou com sucesso!');
  console.log('Tipo do resultado:', typeof searchResult);
  console.log('Keys:', Object.keys(searchResult));
  
  if (searchResult.success && searchResult.data) {
    console.log('Quantidade de resultados:', searchResult.data.length);
    searchResult.data.forEach((item, i) => {
      console.log(`\n--- Resultado ${i+1} ---`);
      console.log('URL:', item.url);
      console.log('Title:', item.title);
      console.log('Markdown (primeiros 200 chars):', item.markdown?.substring(0, 200));
    });
  } else {
    console.log('Resultado completo:', JSON.stringify(searchResult, null, 2).substring(0, 2000));
  }
} catch (err) {
  console.error('Search falhou:', err.message);
}

console.log('\n\n=== TESTE 2: Firecrawl scrape() simples (markdown) ===');
console.log('URL: https://www.infojobs.com.br/empregos.aspx?palavra=comprador');
console.log('---');

try {
  const scrapeResult = await app.scrape('https://www.infojobs.com.br/empregos.aspx?palavra=comprador', {
    formats: ['markdown'],
    onlyMainContent: true,
    waitFor: 5000,
    timeout: 30000
  });
  
  console.log('Scrape retornou com sucesso!');
  console.log('Tipo do resultado:', typeof scrapeResult);
  console.log('Keys:', Object.keys(scrapeResult));
  
  if (scrapeResult.success) {
    console.log('success: true');
    if (scrapeResult.data) {
      console.log('data keys:', Object.keys(scrapeResult.data));
      console.log('Markdown (primeiros 500 chars):', scrapeResult.data.markdown?.substring(0, 500));
    }
    if (scrapeResult.markdown) {
      console.log('Markdown direto (primeiros 500 chars):', scrapeResult.markdown?.substring(0, 500));
    }
  } else {
    console.log('Resultado completo:', JSON.stringify(scrapeResult, null, 2).substring(0, 2000));
  }
} catch (err) {
  console.error('Scrape falhou:', err.message);
}
