import TelegramBot from 'node-telegram-bot-api';

let botInstance = null;

function getBot(token) {
  if (botInstance) return botInstance;
  if (!token) throw new Error('Token do Telegram não configurado');
  botInstance = new TelegramBot(token, { polling: false });
  return botInstance;
}

/**
 * Formata uma lista de vagas em mensagem Telegram (Markdown)
 */
function formatJobMessage(jobs, cargo, localizacao) {
  const header = `🎯 *${jobs.length} ${jobs.length === 1 ? 'nova vaga' : 'novas vagas'} — ${cargo}*\n📍 ${localizacao}\n${'─'.repeat(30)}`;

  const body = jobs.map((job, i) => {
    const titulo = escapeMarkdown(job.titulo_vaga);
    const empresa = escapeMarkdown(job.empresa || 'Empresa não informada');
    const local = escapeMarkdown(job.localizacao || localizacao);
    const fonte = job.fonte || 'Portal';

    let linha = `\n*${i + 1}\\. ${titulo}*\n`;
    linha += `🏢 ${empresa}\n`;
    linha += `📍 ${local}`;
    if (job.salario) linha += ` │ 💰 ${escapeMarkdown(job.salario)}`;
    if (job.modalidade) linha += ` │ ${modalityEmoji(job.modalidade)} ${job.modalidade}`;
    if (job.tipo_contrato) linha += ` │ 📋 ${job.tipo_contrato}`;
    linha += `\n🔗 [Ver vaga no ${fonte}](${job.url_vaga})`;

    return linha;
  }).join('\n');

  const footer = `\n${'─'.repeat(30)}\n🤖 _Hunt\\. Agregador de Vagas_`;

  return header + body + footer;
}

function modalityEmoji(mod) {
  if (mod === 'Remoto') return '🏠';
  if (mod === 'Híbrido') return '🔀';
  return '🏢';
}

// Escapar caracteres especiais do Markdown V2 do Telegram
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Envia mensagem para o grupo do Telegram
 * Divide em múltiplas mensagens se for grande demais (limite: 4096 chars)
 */
export async function sendToTelegram(token, chatId, jobs, cargo, localizacao) {
  const bot = getBot(token);

  if (jobs.length === 0) return { sent: 0 };

  // Enviar em lotes de 10 vagas para não estourar o limite de tamanho
  const BATCH_SIZE = 10;
  let totalSent = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const isFirst = i === 0;
    const batchLabel = jobs.length > BATCH_SIZE 
      ? `${cargo} — Parte ${Math.floor(i / BATCH_SIZE) + 1}`
      : cargo;

    const message = formatJobMessage(batch, isFirst ? cargo : batchLabel, localizacao);

    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      });
      totalSent += batch.length;

      // Pequeno delay entre mensagens para evitar rate limit do Telegram
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`[Telegram] Erro ao enviar mensagem:`, error.message);
      // Tentar enviar como texto simples se MarkdownV2 falhar
      try {
        const plainMsg = batch.map((j, idx) => 
          `${i + idx + 1}. ${j.titulo_vaga}\n${j.empresa} | ${j.localizacao}\n${j.url_vaga}`
        ).join('\n\n');

        await bot.sendMessage(chatId, `🎯 Vagas: ${cargo}\n\n${plainMsg}`, {
          disable_web_page_preview: true
        });
        totalSent += batch.length;
      } catch (fallbackError) {
        console.error(`[Telegram] Fallback também falhou:`, fallbackError.message);
      }
    }
  }

  return { sent: totalSent };
}

/**
 * Testa a conexão enviando uma mensagem simples
 */
export async function testTelegramConnection(token, chatId) {
  const bot = new TelegramBot(token, { polling: false });
  await bot.sendMessage(chatId, '✅ *Hunt\\. conectado com sucesso\\!*\n_O bot está pronto para enviar vagas automaticamente\\._', {
    parse_mode: 'MarkdownV2'
  });
  return true;
}
