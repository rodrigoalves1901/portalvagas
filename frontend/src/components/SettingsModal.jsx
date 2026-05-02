import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function SettingsModal({ isOpen, onClose }) {
  const { firecrawlKey, setFirecrawlKey } = useAppContext();
  const [localKey, setLocalKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalKey(firecrawlKey || '');
    }
  }, [isOpen, firecrawlKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    setFirecrawlKey(localKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121212] border-2 border-[#ccff00] p-8 max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-[#ccff00] transition-colors"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-3xl font-bold mb-2 tracking-tighter uppercase text-[#ccff00]">Configurações</h2>
        <p className="text-gray-400 mb-6 text-sm">Configure suas credenciais para buscar as vagas na web.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase mb-2 tracking-wide text-white">Firecrawl API Key</label>
            <input 
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="fc-..."
              className="w-full bg-black border border-gray-700 text-white p-3 focus:outline-none focus:border-[#ccff00] transition-colors font-mono"
            />
          </div>
          
          <button 
            onClick={handleSave}
            className="acid-button w-full py-4 mt-4"
          >
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
