import { useState, useEffect } from 'react';
import { 
  Bot, Plus, Trash2, Play, Power, PowerOff, CheckCircle2, 
  AlertCircle, Loader2, Clock, ChevronDown, ChevronUp,
  Send, Briefcase, MapPin, DollarSign, Hash
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const API = '/api';

export function Automations() {
  const { firecrawlKey } = useAppContext();
  const [automations, setAutomations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [testingConn, setTestingConn] = useState(false);
  const [toast, setToast] = useState(null);

  const defaultForm = {
    name: '',
    cargo: '',
    localizacao: '',
    salarioMin: '',
    salarioMax: '',
    firecrawlKey: firecrawlKey || '',
    telegramToken: '8376247018:AAFzcfio13kN5T-kj5MsFzIvBTCwoPEQ2Pg',
    telegramChatId: '-5252328360'
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { fetchAutomations(); }, []);

  async function fetchAutomations() {
    try {
      const r = await fetch(`${API}/automations`);
      setAutomations(await r.json());
    } catch { /* ignore */ }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`${API}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error);
      }
      const created = await r.json();
      setAutomations(prev => [...prev, created]);
      setShowForm(false);
      setForm(defaultForm);
      showToast('Automação criada com sucesso!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remover esta automação?')) return;
    await fetch(`${API}/automations/${id}`, { method: 'DELETE' });
    setAutomations(prev => prev.filter(a => a.id !== id));
    showToast('Automação removida.');
  }

  async function handleToggle(automation) {
    const r = await fetch(`${API}/automations/${automation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !automation.active })
    });
    const updated = await r.json();
    setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
  }

  async function handleRunNow(automation) {
    setRunningId(automation.id);
    try {
      const r = await fetch(`${API}/automations/${automation.id}/run`, { method: 'POST' });
      const result = await r.json();
      if (result.success) {
        showToast(`✅ ${result.newJobs} vaga(s) nova(s) enviada(s) ao Telegram!`);
      } else {
        showToast(result.error || 'Erro ao executar', 'error');
      }
      await fetchAutomations();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRunningId(null);
    }
  }

  async function handleTestTelegram() {
    if (!form.telegramToken || !form.telegramChatId) {
      showToast('Preencha o Token e Chat ID do Telegram', 'error');
      return;
    }
    setTestingConn(true);
    try {
      const r = await fetch(`${API}/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: form.telegramToken, chatId: form.telegramChatId })
      });
      const data = await r.json();
      if (data.success) showToast('✅ Telegram conectado! Verifique o grupo.');
      else showToast(data.error, 'error');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTestingConn(false);
    }
  }

  function formatDate(iso) {
    if (!iso) return 'Nunca executou';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 font-mono text-sm flex items-center gap-2 shadow-lg ${
          toast.type === 'error' 
            ? 'bg-red-900 text-red-200 border border-red-700' 
            : 'bg-[#1a2a00] text-[#ccff00] border border-[#ccff00]/30'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Bot className="text-[#ccff00]" size={24} />
            Automações
          </h1>
          <p className="text-gray-500 text-xs font-mono mt-1">
            Envio automático de vagas para grupos do Telegram • Todo dia às 20:00
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#ccff00] text-black font-bold text-xs uppercase px-4 py-2 hover:bg-[#e5ff66] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Nova Automação
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-[#ccff00]/20 bg-[#111] p-6 mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-5 flex items-center gap-2">
            <Plus size={14} className="text-[#ccff00]" /> Configurar Nova Automação
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="field-label">Nome da Automação</label>
              <input
                type="text"
                required
                placeholder="Ex: Gerente de TI em Londrina"
                className="hunt-input"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="field-label"><Briefcase size={11} className="inline mr-1" />Cargo(s)</label>
              <input
                type="text"
                required
                placeholder="Ex: Gerente de TI, Coordenador de TI"
                className="hunt-input"
                value={form.cargo}
                onChange={e => setForm({...form, cargo: e.target.value})}
              />
              <span className="text-[10px] text-gray-600 font-mono">Separe com vírgula para múltiplos</span>
            </div>

            {/* Localização */}
            <div>
              <label className="field-label"><MapPin size={11} className="inline mr-1" />Localização</label>
              <input
                type="text"
                required
                placeholder="Ex: Londrina, Remoto"
                className="hunt-input"
                value={form.localizacao}
                onChange={e => setForm({...form, localizacao: e.target.value})}
              />
            </div>

            {/* Salário */}
            <div>
              <label className="field-label"><DollarSign size={11} className="inline mr-1" />Salário Mínimo (R$)</label>
              <input
                type="text"
                placeholder="Ex: 5000"
                className="hunt-input"
                value={form.salarioMin}
                onChange={e => setForm({...form, salarioMin: e.target.value})}
              />
            </div>
            <div>
              <label className="field-label"><DollarSign size={11} className="inline mr-1" />Salário Máximo (R$)</label>
              <input
                type="text"
                placeholder="Ex: 15000"
                className="hunt-input"
                value={form.salarioMax}
                onChange={e => setForm({...form, salarioMax: e.target.value})}
              />
            </div>

            {/* Firecrawl Key */}
            <div className="md:col-span-2">
              <label className="field-label">🔑 Firecrawl API Key</label>
              <input
                type="password"
                required
                placeholder="fc-..."
                className="hunt-input font-mono"
                value={form.firecrawlKey}
                onChange={e => setForm({...form, firecrawlKey: e.target.value})}
              />
            </div>

            {/* Telegram Token */}
            <div>
              <label className="field-label"><Bot size={11} className="inline mr-1" />Telegram Bot Token</label>
              <input
                type="password"
                required
                placeholder="1234567890:AAF..."
                className="hunt-input font-mono"
                value={form.telegramToken}
                onChange={e => setForm({...form, telegramToken: e.target.value})}
              />
            </div>

            {/* Chat ID */}
            <div>
              <label className="field-label"><Hash size={11} className="inline mr-1" />Chat ID do Grupo</label>
              <input
                type="text"
                required
                placeholder="-100123456789"
                className="hunt-input font-mono"
                value={form.telegramChatId}
                onChange={e => setForm({...form, telegramChatId: e.target.value})}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ccff00] text-black font-bold text-xs uppercase px-5 py-2.5 hover:bg-[#e5ff66] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar Automação
            </button>
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={testingConn}
              className="border border-white/10 text-gray-400 font-bold text-xs uppercase px-4 py-2.5 hover:border-[#ccff00]/30 hover:text-[#ccff00] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testingConn ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Testar Telegram
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(defaultForm); }}
              className="text-gray-600 hover:text-gray-300 text-xs font-mono uppercase"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTA DE AUTOMAÇÕES */}
      {automations.length === 0 ? (
        <div className="border border-white/5 p-12 text-center">
          <Bot size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Nenhuma automação configurada</p>
          <p className="text-gray-600 text-xs mt-2">Crie sua primeira regra para enviar vagas automaticamente ao Telegram.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {automations.map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              running={runningId === automation.id}
              onDelete={() => handleDelete(automation.id)}
              onToggle={() => handleToggle(automation)}
              onRunNow={() => handleRunNow(automation)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 border border-white/5 p-4 bg-[#111]">
        <div className="flex items-start gap-3">
          <Clock size={14} className="text-[#ccff00] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">Agendamento automático</p>
            <p className="text-xs text-gray-500 mt-1">
              O sistema executa todas as automações ativas automaticamente todos os dias às <strong className="text-white">20:00</strong> (horário de Brasília). 
              Apenas vagas novas (não enviadas anteriormente) serão incluídas no disparo.
              Você também pode executar manualmente a qualquer momento clicando em "Executar Agora".
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .field-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; font-family: monospace; }
        .hunt-input { width: 100%; background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 12px; font-size: 13px; outline: none; transition: border-color 0.15s; }
        .hunt-input:focus { border-color: rgba(204,255,0,0.4); }
        .hunt-input::placeholder { color: #374151; }
      `}</style>
    </div>
  );
}

// ─── AUTOMATION CARD ────────────────────────────────────────

function AutomationCard({ automation, running, onDelete, onToggle, onRunNow, formatDate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border transition-colors ${automation.active ? 'border-white/10 bg-[#111]' : 'border-white/5 bg-[#0d0d0d] opacity-60'}`}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${automation.active ? 'bg-[#ccff00]' : 'bg-gray-600'}`} />
              <h3 className="font-bold text-white text-sm truncate">{automation.name || automation.cargo}</h3>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 font-mono">
              <span className="flex items-center gap-1"><Briefcase size={10} /> {automation.cargo}</span>
              <span className="flex items-center gap-1"><MapPin size={10} /> {automation.localizacao}</span>
              {automation.salarioMin && <span className="flex items-center gap-1"><DollarSign size={10} /> R$ {automation.salarioMin}{automation.salarioMax ? ` – ${automation.salarioMax}` : '+'}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRunNow}
              disabled={running}
              title="Executar agora"
              className="text-xs font-bold uppercase px-3 py-1.5 border border-[#ccff00]/20 text-[#ccff00] hover:bg-[#ccff00]/10 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {running ? 'Buscando...' : 'Executar'}
            </button>
            <button
              onClick={onToggle}
              title={automation.active ? 'Pausar' : 'Ativar'}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              {automation.active ? <Power size={16} className="text-[#ccff00]" /> : <PowerOff size={16} />}
            </button>
            <button
              onClick={onDelete}
              title="Remover"
              className="text-gray-600 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-600 hover:text-gray-300 p-1"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-600 font-mono">
          <span className="flex items-center gap-1">
            <Clock size={10} /> Último envio: <span className="text-gray-400">{formatDate(automation.lastRun)}</span>
          </span>
          {automation.lastCount !== undefined && (
            <span>Vagas novas: <span className={`font-bold ${automation.lastCount > 0 ? 'text-[#ccff00]' : 'text-gray-500'}`}>{automation.lastCount}</span></span>
          )}
          {automation.lastError && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> Erro recente
            </span>
          )}
        </div>

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500 font-mono space-y-1">
            <p>🤖 Bot Token: {automation.telegramToken ? '****' + automation.telegramToken.slice(-6) : 'não configurado'}</p>
            <p>💬 Chat ID: {automation.telegramChatId || 'não configurado'}</p>
            <p>🔑 Firecrawl Key: {automation.firecrawlKey ? '****' + automation.firecrawlKey.slice(-6) : 'não configurado'}</p>
            <p>📅 Criado em: {formatDate(automation.createdAt)}</p>
            {automation.lastError && <p className="text-red-400">⚠️ Último erro: {automation.lastError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
