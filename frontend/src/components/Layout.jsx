import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Search, Bot, Settings, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { SettingsModal } from './SettingsModal';
import { useState } from 'react';

export function Layout() {
  const { user, setUser, firecrawlKey } = useAppContext();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLogout() {
    setUser(null);
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex">
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* SIDEBAR NAV */}
      <aside className="w-[220px] shrink-0 border-r border-white/10 bg-[#111] flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-lg font-black tracking-tighter text-white uppercase">
            HUNT<span className="text-[#ccff00]">.</span>
          </span>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5 uppercase tracking-widest">Agregador de Vagas</p>
        </div>

        {/* User */}
        <div className="px-6 py-4 border-b border-white/5">
          <p className="text-xs font-semibold text-white">{user?.name}</p>
          <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${firecrawlKey ? 'bg-[#ccff00]' : 'bg-red-500'}`} />
            <span className="text-gray-500">{firecrawlKey ? 'API Conectada' : 'API não configurada'}</span>
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#ccff00]/10 text-[#ccff00] border-l-2 border-[#ccff00]'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Search size={16} /> Buscar Vagas
          </NavLink>

          <NavLink
            to="/automations"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#ccff00]/10 text-[#ccff00] border-l-2 border-[#ccff00]'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Bot size={16} /> Automações
          </NavLink>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={16} /> Configurações
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
