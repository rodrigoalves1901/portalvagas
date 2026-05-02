import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const AUTOMATIONS_FILE = path.join(DATA_DIR, 'automations.json');
const SENT_JOBS_FILE = path.join(DATA_DIR, 'sent_jobs.json');

// Garantir que o diretório de dados existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── AUTOMAÇÕES ────────────────────────────────────────────

export function listAutomations() {
  return readFile(AUTOMATIONS_FILE, []);
}

export function createAutomation(data) {
  const automations = listAutomations();
  const newAutomation = {
    id: Date.now().toString(),
    ...data,
    active: true,
    createdAt: new Date().toISOString(),
    lastRun: null,
    lastCount: 0
  };
  automations.push(newAutomation);
  writeFile(AUTOMATIONS_FILE, automations);
  return newAutomation;
}

export function updateAutomation(id, data) {
  const automations = listAutomations();
  const idx = automations.findIndex(a => a.id === id);
  if (idx === -1) return null;
  automations[idx] = { ...automations[idx], ...data };
  writeFile(AUTOMATIONS_FILE, automations);
  return automations[idx];
}

export function deleteAutomation(id) {
  const automations = listAutomations().filter(a => a.id !== id);
  writeFile(AUTOMATIONS_FILE, automations);
  return true;
}

// ─── CONTROLE DE DUPLICATAS ────────────────────────────────

export function getSentJobs(automationId) {
  const all = readFile(SENT_JOBS_FILE, {});
  return new Set(all[automationId] || []);
}

export function markJobsAsSent(automationId, urls) {
  const all = readFile(SENT_JOBS_FILE, {});
  const existing = new Set(all[automationId] || []);
  urls.forEach(url => existing.add(url));
  
  // Manter apenas os últimos 500 por automação para não crescer infinito
  const limited = [...existing].slice(-500);
  all[automationId] = limited;
  writeFile(SENT_JOBS_FILE, all);
}
