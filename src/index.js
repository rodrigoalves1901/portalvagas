import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { searchAggregatedJobs } from './services/jobScraperService.js';
import { 
  listAutomations, 
  createAutomation, 
  updateAutomation, 
  deleteAutomation 
} from './services/automationService.js';
import { testTelegramConnection } from './services/telegramService.js';
import { startScheduler, runAutomation } from './services/schedulerService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS e JSON
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do Frontend em Produção
const __dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
}

// ─── BUSCA DE VAGAS ────────────────────────────────────────

app.post('/api/jobs/search', async (req, res) => {
  try {
    const { cargo, localizacao, salarioMin, salarioMax } = req.body;
    if (!cargo || !localizacao) {
      return res.status(400).json({ error: 'Os campos cargo e localizacao são obrigatórios.' });
    }

    const firecrawlKey = req.headers['x-firecrawl-key'];
    const jobs = await searchAggregatedJobs(cargo, localizacao, salarioMin, salarioMax, firecrawlKey);
    return res.json({ success: true, count: jobs.length, vagas: jobs });
  } catch (error) {
    console.error('Erro na rota de busca:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a busca' });
  }
});

// ─── AUTOMAÇÕES (CRUD) ─────────────────────────────────────

app.get('/api/automations', (req, res) => {
  res.json(listAutomations());
});

app.post('/api/automations', (req, res) => {
  const { cargo, localizacao, salarioMin, salarioMax, firecrawlKey, telegramToken, telegramChatId, name } = req.body;
  if (!cargo || !localizacao || !firecrawlKey || !telegramToken || !telegramChatId) {
    return res.status(400).json({ error: 'Campos obrigatórios: cargo, localizacao, firecrawlKey, telegramToken, telegramChatId' });
  }
  const automation = createAutomation({ name, cargo, localizacao, salarioMin, salarioMax, firecrawlKey, telegramToken, telegramChatId });
  res.status(201).json(automation);
});

app.patch('/api/automations/:id', (req, res) => {
  const updated = updateAutomation(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Automação não encontrada' });
  res.json(updated);
});

app.delete('/api/automations/:id', (req, res) => {
  deleteAutomation(req.params.id);
  res.json({ success: true });
});

// Executar uma automação manualmente agora
app.post('/api/automations/:id/run', async (req, res) => {
  const automations = listAutomations();
  const automation = automations.find(a => a.id === req.params.id);
  if (!automation) return res.status(404).json({ error: 'Automação não encontrada' });

  try {
    const result = await runAutomation(automation);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Testar conexão Telegram
app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;
  try {
    await testTelegramConnection(token, chatId);
    res.json({ success: true, message: 'Mensagem de teste enviada com sucesso!' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── INICIAR SERVIDOR ──────────────────────────────────────

const PORT = process.env.PORT || 3000;
// Rota para o Frontend (SPA Catch-all)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`🚀 Motor de Agregação de Vagas rodando na porta ${port}`);
  startScheduler();
});
