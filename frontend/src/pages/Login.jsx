import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setUser({ name: username });
          navigate('/dashboard');
        } else {
          setError('Senha incorreta!');
        }
      } catch (err) {
        setError('Erro ao conectar com o servidor');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col md:flex-row overflow-hidden">
      {/* Esquerda: 70% Tipografia Massiva */}
      <div className="md:w-[70%] p-12 md:p-24 flex flex-col justify-center relative border-b md:border-b-0 md:border-r border-white/10">
        <div className="absolute top-8 left-12 text-[#ccff00] font-bold tracking-widest text-sm uppercase">
          Portalempregos // Agregador
        </div>
        
        <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black leading-[0.85] tracking-tighter text-white">
          HUNT.<br />
          <span className="text-[#ccff00]">YOUR.</span><br />
          NEXT.<br />
          ROLE.
        </h1>
        
        <p className="mt-12 text-gray-400 max-w-md text-lg leading-relaxed border-l-2 border-[#ccff00] pl-6">
          Motor de agregação de vagas em alta performance. 
          Extração paralela usando LLMs nos principais portais.
        </p>
      </div>
      
      {/* Direita: 30% Formulário Mínimo */}
      <div className="md:w-[30%] p-12 md:p-16 flex flex-col justify-center">
        <form onSubmit={handleLogin} className="space-y-8 max-w-sm">
          <div>
            <label className="block text-sm font-bold uppercase mb-4 tracking-widest text-white">
              Identificação
            </label>
            <input 
              type="text" 
              placeholder="SEU NOME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-bold text-white placeholder-white/10 focus:outline-none focus:border-[#ccff00] transition-colors py-2 mb-6"
            />
            <input 
              type="password" 
              placeholder="SENHA"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-bold text-white placeholder-white/10 focus:outline-none focus:border-[#ccff00] transition-colors py-2"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold uppercase tracking-tighter">{error}</p>}
          
          <button 
            type="submit" 
            className="acid-button w-full py-5 text-xl tracking-wider group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-between px-4">
              <span>Acessar Radar</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
