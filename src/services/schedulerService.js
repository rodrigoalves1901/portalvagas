import cron from 'node-cron';
import { listAutomations, updateAutomation, getSentJobs, markJobsAsSent } from './automationService.js';
import { searchAggregatedJobs } from './jobScraperService.js';
import { sendToTelegram } from './telegramService.js';

let scheduledTask = null;

/**
 * Executa uma automação específica
 */
export async function runAutomation(automation) {
  const { id, cargo, localizacao, salarioMin, salarioMax, firecrawlKey, telegramToken, telegramChatId } = automation;

  console.log(`[Scheduler] ▶ Executando automação "${id}" — ${cargo} em ${localizacao}`);

  try {
    // 1. Buscar vagas
    const allJobs = await searchAggregatedJobs(
      cargo,
      localizacao,
      salarioMin || '',
      salarioMax || '',
      firecrawlKey
    );

    // 2. Filtrar apenas vagas novas (não enviadas antes)
    const sentUrls = getSentJobs(id);
    const newJobs = allJobs.filter(j => !sentUrls.has(j.url_vaga));

    console.log(`[Scheduler] "${cargo}": ${allJobs.length} vagas totais, ${newJobs.length} novas`);

    // 3. Enviar apenas as novas (máximo 30 por envio para não spam)
    const toSend = newJobs.slice(0, 30);

    if (toSend.length > 0) {
      await sendToTelegram(telegramToken, telegramChatId, toSend, cargo, localizacao);
      markJobsAsSent(id, toSend.map(j => j.url_vaga));
    } else {
      console.log(`[Scheduler] Nenhuma vaga nova para enviar.`);
    }

    // 4. Atualizar status da automação
    updateAutomation(id, {
      lastRun: new Date().toISOString(),
      lastCount: newJobs.length
    });

    return { success: true, total: allJobs.length, newJobs: toSend.length };
  } catch (error) {
    console.error(`[Scheduler] Erro na automação "${id}":`, error.message);
    updateAutomation(id, { lastRun: new Date().toISOString(), lastError: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Executa TODAS as automações ativas
 */
async function runAllActiveAutomations() {
  const automations = listAutomations().filter(a => a.active);

  if (automations.length === 0) {
    console.log('[Scheduler] Nenhuma automação ativa.');
    return;
  }

  console.log(`[Scheduler] ⏰ Disparando ${automations.length} automação(ões)...`);

  for (const automation of automations) {
    await runAutomation(automation);
    // Intervalo entre automações para não sobrecarregar a API
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('[Scheduler] ✅ Todas as automações concluídas.');
}

/**
 * Inicia o agendador — 20h horário de Brasília (23:00 UTC)
 */
export function startScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  // Cron: "0 23 * * *" = todo dia às 23:00 UTC = 20:00 BRT
  scheduledTask = cron.schedule('0 23 * * *', async () => {
    console.log(`\n[Scheduler] 🔔 Tarefa agendada iniciada: ${new Date().toLocaleString('pt-BR')}`);
    await runAllActiveAutomations();
  }, {
    timezone: 'America/Sao_Paulo'
  });

  console.log('[Scheduler] ✅ Agendador iniciado — execução diária às 20:00 (horário de Brasília)');
  return scheduledTask;
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
