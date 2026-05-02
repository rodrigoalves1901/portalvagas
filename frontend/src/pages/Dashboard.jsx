import { useState, useMemo } from 'react';
import { 
  Search, Briefcase, MapPin, DollarSign, ExternalLink, 
  Loader2, Building2, ChevronDown, ChevronUp,
  Wifi, Monitor, Home, X, SlidersHorizontal, LayoutGrid, List
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function Dashboard() {
  const { firecrawlKey } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filtros
  const [filters, setFilters] = useState({
    fonte: [],
    modalidade: [],
    tipo_contrato: [],
    nivel: [],
    apenasComSalario: false
  });

  const [formData, setFormData] = useState({
    cargo: '',
    localizacao: '',
    salarioMin: '',
    salarioMax: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!formData.cargo || !formData.localizacao) return;

    if (!firecrawlKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setJobs([]);
    setHasSearched(true);
    setFilters({ fonte: [], modalidade: [], tipo_contrato: [], nivel: [], apenasComSalario: false });

    try {
      const API = '/api';
      const response = await fetch(`${API}/jobs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-firecrawl-key': firecrawlKey
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar vagas');
      }

      setJobs(data.vagas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Extrair opções de filtro dos resultados
  const filterOptions = useMemo(() => {
    const fontes = [...new Set(jobs.map(j => j.fonte).filter(Boolean))];
    const modalidades = [...new Set(jobs.map(j => j.modalidade).filter(Boolean))];
    const contratos = [...new Set(jobs.map(j => j.tipo_contrato).filter(Boolean))];
    const niveis = [...new Set(jobs.map(j => j.nivel).filter(Boolean))];
    return { fontes, modalidades, contratos, niveis };
  }, [jobs]);

  // Aplicar filtros
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filters.fonte.length > 0 && !filters.fonte.includes(job.fonte)) return false;
      if (filters.modalidade.length > 0 && !filters.modalidade.includes(job.modalidade)) return false;
      if (filters.tipo_contrato.length > 0 && !filters.tipo_contrato.includes(job.tipo_contrato)) return false;
      if (filters.nivel.length > 0 && !filters.nivel.includes(job.nivel)) return false;
      if (filters.apenasComSalario && !job.salario) return false;
      return true;
    });
  }, [jobs, filters]);

  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({ fonte: [], modalidade: [], tipo_contrato: [], nivel: [], apenasComSalario: false });
  };

  const activeFilterCount = filters.fonte.length + filters.modalidade.length + filters.tipo_contrato.length + filters.nivel.length + (filters.apenasComSalario ? 1 : 0);

  const modalityIcon = (mod) => {
    if (mod === 'Remoto') return <Wifi size={12} />;
    if (mod === 'Híbrido') return <Home size={12} />;
    if (mod === 'Presencial') return <Monitor size={12} />;
    return null;
  };

  const fonteColor = (fonte) => {
    const colors = {
      'Indeed': { bg: '#1a3d7c', text: '#6c9bff' },
      'Infojobs': { bg: '#1a4a2e', text: '#4ade80' },
      'Catho': { bg: '#4a1a1a', text: '#f87171' },
      'LinkedIn': { bg: '#1a3347', text: '#60a5fa' },
      'Glassdoor': { bg: '#2d2d1a', text: '#fbbf24' },
      'Web': { bg: '#2d2d2d', text: '#a3a3a3' },
    };
    return colors[fonte] || colors['Web'];
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* SEARCH BAR */}
      <div className="border-b border-white/10 bg-[#151515]">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row">
          <div className="flex-[2] flex items-center px-5 py-3 border-b md:border-b-0 md:border-r border-white/10">
            <Briefcase className="text-[#ccff00] mr-3 shrink-0" size={18} />
            <div className="w-full">
              <input 
                type="text" 
                placeholder="Cargo ou Função"
                required
                className="w-full bg-transparent text-sm font-semibold text-white placeholder-gray-600 focus:outline-none"
                value={formData.cargo}
                onChange={e => setFormData({...formData, cargo: e.target.value})}
              />
              <span className="text-[9px] text-gray-600 font-mono">Separe com vírgula para buscar vários</span>
            </div>
          </div>
          
          <div className="flex-[2] flex items-center px-5 py-3 border-b md:border-b-0 md:border-r border-white/10">
            <MapPin className="text-[#ccff00] mr-3 shrink-0" size={18} />
            <div className="w-full">
              <input 
                type="text" 
                placeholder="Localização"
                required
                className="w-full bg-transparent text-sm font-semibold text-white placeholder-gray-600 focus:outline-none"
                value={formData.localizacao}
                onChange={e => setFormData({...formData, localizacao: e.target.value})}
              />
              <span className="text-[9px] text-gray-600 font-mono">Ex: São Paulo, Remoto</span>
            </div>
          </div>

          <div className="flex-1 flex items-center px-5 py-3 gap-2 border-b md:border-b-0 md:border-r border-white/10">
            <DollarSign className="text-[#ccff00] shrink-0" size={16} />
            <input 
              type="text" 
              placeholder="Min"
              className="w-full bg-transparent text-xs font-semibold text-white placeholder-gray-600 focus:outline-none"
              value={formData.salarioMin}
              onChange={e => setFormData({...formData, salarioMin: e.target.value})}
            />
            <span className="text-gray-600 text-xs">—</span>
            <input 
              type="text" 
              placeholder="Max"
              className="w-full bg-transparent text-xs font-semibold text-white placeholder-gray-600 focus:outline-none"
              value={formData.salarioMax}
              onChange={e => setFormData({...formData, salarioMax: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-[#ccff00] text-black font-bold uppercase text-sm px-8 py-4 hover:bg-[#e5ff66] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Buscar
          </button>
        </form>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1">
        
        {/* SIDEBAR - FILTROS */}
        {hasSearched && jobs.length > 0 && (
          <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 border-r border-white/10 bg-[#111] shrink-0 hidden md:block`}>
            <div className="p-5 sticky top-[105px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-[#ccff00]" />
                  Filtros
                </h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-[10px] text-[#ccff00] hover:underline uppercase font-mono">
                    Limpar ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Filtro: Portal */}
              {filterOptions.fontes.length > 0 && (
                <FilterSection title="Portal">
                  {filterOptions.fontes.map(fonte => (
                    <FilterChip 
                      key={fonte} 
                      label={fonte} 
                      active={filters.fonte.includes(fonte)}
                      onClick={() => toggleFilter('fonte', fonte)}
                      color={fonteColor(fonte)}
                    />
                  ))}
                </FilterSection>
              )}

              {/* Filtro: Modalidade */}
              {filterOptions.modalidades.length > 0 && (
                <FilterSection title="Modalidade">
                  {filterOptions.modalidades.map(mod => (
                    <FilterChip 
                      key={mod} 
                      label={mod} 
                      active={filters.modalidade.includes(mod)}
                      onClick={() => toggleFilter('modalidade', mod)}
                      icon={modalityIcon(mod)}
                    />
                  ))}
                </FilterSection>
              )}

              {/* Filtro: Contrato */}
              {filterOptions.contratos.length > 0 && (
                <FilterSection title="Tipo de Contrato">
                  {filterOptions.contratos.map(tipo => (
                    <FilterChip 
                      key={tipo} 
                      label={tipo} 
                      active={filters.tipo_contrato.includes(tipo)}
                      onClick={() => toggleFilter('tipo_contrato', tipo)}
                    />
                  ))}
                </FilterSection>
              )}

              {/* Filtro: Nível */}
              {filterOptions.niveis.length > 0 && (
                <FilterSection title="Nível">
                  {filterOptions.niveis.map(nivel => (
                    <FilterChip 
                      key={nivel} 
                      label={nivel} 
                      active={filters.nivel.includes(nivel)}
                      onClick={() => toggleFilter('nivel', nivel)}
                    />
                  ))}
                </FilterSection>
              )}

              {/* Filtro: Com Salário */}
              <FilterSection title="Salário">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={filters.apenasComSalario}
                    onChange={() => setFilters(prev => ({ ...prev, apenasComSalario: !prev.apenasComSalario }))}
                    className="accent-[#ccff00]"
                  />
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Apenas com salário visível</span>
                </label>
              </FilterSection>
            </div>
          </aside>
        )}

        {/* JOB RESULTS */}
        <main className="flex-1 min-h-[60vh]">
          
          {/* EMPTY STATE */}
          {!isLoading && jobs.length === 0 && !error && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
              <Search size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 font-mono text-sm uppercase tracking-widest mb-2">
                {hasSearched 
                  ? "Nenhuma vaga encontrada com estes parâmetros"
                  : "Pronto para a caçada"
                }
              </p>
              <p className="text-gray-600 text-xs max-w-md">
                {hasSearched 
                  ? "Tente palavras-chave diferentes ou remova filtros de localização para ampliar os resultados."
                  : "Preencha os campos acima e clique em Buscar para encontrar vagas nos principais portais do Brasil."
                }
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="m-6 border border-red-500/30 bg-red-500/10 p-5 text-red-300 font-mono text-sm">
              <strong className="text-red-400">ERRO:</strong> {error}
            </div>
          )}

          {/* LOADING */}
          {isLoading && (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-[#ccff00]/20 rounded-full"></div>
                <div className="w-16 h-16 border-2 border-[#ccff00] border-t-transparent rounded-full absolute top-0 animate-spin"></div>
              </div>
              <p className="text-[#ccff00] font-mono uppercase tracking-widest text-xs animate-pulse">
                Buscando vagas nos portais...
              </p>
              <p className="text-gray-600 text-xs">Indeed · Infojobs · Catho</p>
            </div>
          )}

          {/* RESULTS HEADER */}
          {!isLoading && jobs.length > 0 && (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111]">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {filteredJobs.length}
                    <span className="text-gray-500 ml-1">
                      {filteredJobs.length !== jobs.length && `de ${jobs.length}`} vagas encontradas
                    </span>
                  </span>
                  {activeFilterCount > 0 && (
                    <button 
                      onClick={clearFilters}
                      className="text-xs text-[#ccff00] hover:underline flex items-center gap-1"
                    >
                      <X size={12} /> Limpar filtros
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`p-1.5 border transition-colors hidden md:block ${sidebarOpen ? 'border-[#ccff00]/30 text-[#ccff00]' : 'border-white/10 text-gray-500'}`}
                    title="Mostrar/ocultar filtros"
                  >
                    <Filter size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 border transition-colors ${viewMode === 'list' ? 'border-[#ccff00]/30 text-[#ccff00]' : 'border-white/10 text-gray-500'}`}
                  >
                    <List size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 border transition-colors ${viewMode === 'grid' ? 'border-[#ccff00]/30 text-[#ccff00]' : 'border-white/10 text-gray-500'}`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>

              {/* JOB LIST */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-0' : ''}>
                {filteredJobs.map((job, idx) => (
                  <div 
                    key={idx} 
                    className={`border-b border-white/5 hover:bg-[#1a1a1a] transition-colors group ${viewMode === 'grid' ? 'border-r border-white/5' : ''}`}
                  >
                    <div className="p-5">
                      {/* ROW 1: Title + Source Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 
                          className="text-base font-semibold text-white group-hover:text-[#ccff00] transition-colors cursor-pointer leading-snug flex-1"
                          onClick={() => setExpandedJob(expandedJob === idx ? null : idx)}
                        >
                          {job.titulo_vaga}
                        </h3>
                        <span 
                          className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider shrink-0"
                          style={{ 
                            backgroundColor: fonteColor(job.fonte).bg, 
                            color: fonteColor(job.fonte).text 
                          }}
                        >
                          {job.fonte}
                        </span>
                      </div>

                      {/* ROW 2: Company + Location */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-gray-600" />
                          {job.empresa}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-600" />
                          {job.localizacao}
                        </span>
                        {job.data_publicacao && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-600" />
                            {job.data_publicacao}
                          </span>
                        )}
                      </div>

                      {/* ROW 3: Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {job.salario && (
                          <span className="text-[11px] px-2 py-0.5 bg-[#ccff00]/10 text-[#ccff00] font-semibold">
                            {job.salario}
                          </span>
                        )}
                        {job.modalidade && (
                          <span className="text-[11px] px-2 py-0.5 bg-white/5 text-gray-300 flex items-center gap-1">
                            {modalityIcon(job.modalidade)} {job.modalidade}
                          </span>
                        )}
                        {job.tipo_contrato && (
                          <span className="text-[11px] px-2 py-0.5 bg-white/5 text-gray-300">
                            {job.tipo_contrato}
                          </span>
                        )}
                        {job.nivel && (
                          <span className="text-[11px] px-2 py-0.5 bg-white/5 text-gray-300">
                            {job.nivel}
                          </span>
                        )}
                      </div>

                      {/* ROW 4: Description (expandable) */}
                      {job.descricao_curta && (
                        <p className={`text-xs text-gray-500 leading-relaxed ${expandedJob === idx ? '' : 'line-clamp-2'}`}>
                          {job.descricao_curta}
                        </p>
                      )}

                      {/* ROW 5: Actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <button
                          onClick={() => setExpandedJob(expandedJob === idx ? null : idx)}
                          className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 uppercase font-mono"
                        >
                          {expandedJob === idx ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Detalhes</>}
                        </button>
                        <a
                          href={job.url_vaga}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-[#ccff00] hover:text-white flex items-center gap-1.5 uppercase tracking-wide transition-colors"
                        >
                          Ver vaga <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// =============================================
// SUB-COMPONENTES
// =============================================

function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-5">
      <button 
        onClick={() => setOpen(!open)} 
        className="flex items-center justify-between w-full text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 hover:text-white transition-colors"
      >
        {title}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </div>
  );
}

function FilterChip({ label, active, onClick, icon, color }) {
  return (
    <button
      onClick={onClick}
      className={`text-left text-xs px-2.5 py-1.5 transition-all flex items-center gap-1.5 ${
        active 
          ? 'bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30' 
          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
