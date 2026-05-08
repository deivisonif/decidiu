import { LayoutDashboard, Calendar, Users, UserCheck, UserPlus, Building2, ChevronDown, ChevronUp, Package, Settings, List, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getDashboardRoute } from '../contexts/AuthContext';

interface SidebarProps {
  activeSection: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeSection, isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { permissoes, usuario } = useAuth();

  const activeModule = activeSection.split('-')[0];

  const isGestaoExpanded = activeModule === 'gestao';
  const isAmbulatoriaExpanded = activeModule === 'ambulatorial';
  const isCapacitacaoExpanded = activeModule === 'capacitacao';
  const isDistribuicaoExpanded = activeModule === 'distribuicao';

  const handleNavigation = (_section: string, path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div className={`w-64 bg-[#1a4d2e] text-white h-screen fixed left-0 top-0 overflow-y-auto z-40 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="p-4 border-b border-green-800">
        <button
          onClick={() => {
            const route = usuario ? getDashboardRoute(usuario.cargo) : '/';
            navigate(route);
            onClose?.();
          }}
          className="flex items-center justify-center gap-3 py-1 w-full hover:opacity-80 transition-opacity"
          aria-label="Ir para o dashboard"
        >
          <img
            src="/CRIAPNG.png"
            alt="Logo CRIA"
            className="h-12 object-contain"
          />
          <img
            src="/DecidiuPNG.png"
            alt="Logo DeciDIU"
            className="h-14 object-contain"
          />
        </button>
      </div>

      <div className="p-4">
        {permissoes.acessoGestao && (
          <>
            <button
              onClick={() => handleNavigation('gestao-dashboard', '/gestao/dashboard')}
              className={`w-full text-left px-4 py-2 rounded mb-1 flex items-center justify-between ${
                activeSection === 'gestao' || activeSection.startsWith('gestao-') ? 'bg-green-600' : 'hover:bg-green-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Gestão
              </div>
              {isGestaoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isGestaoExpanded && (
              <div className="ml-4 mt-2 mb-2 border-l-2 border-green-700 pl-2">

                <button
                  onClick={() => handleNavigation('gestao-dashboard', '/gestao/dashboard')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'gestao-dashboard' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>

                {(permissoes.podeCriarProfissionais || permissoes.podeCriarAlunos) && (
                  <button
                    onClick={() => handleNavigation('gestao-cadastrar-profissional', '/gestao/cadastrar-profissional')}
                    className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                      activeSection === 'gestao-cadastrar-profissional' ? 'bg-green-700' : 'hover:bg-green-700'
                    }`}
                  >
                    <UserPlus size={16} />
                    Cadastrar Profissional
                  </button>
                )}

                {permissoes.acessoGestao && (
                  <button
                    onClick={() => handleNavigation('gestao-lista-profissionais', '/gestao/profissionais')}
                    className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                      activeSection === 'gestao-lista-profissionais' ? 'bg-green-700' : 'hover:bg-green-700'
                    }`}
                  >
                    <List size={16} />
                    Lista de Profissionais
                  </button>
                )}

                {(permissoes.acessoTotal || (permissoes.acessoGestao && !permissoes.somenteVisualizarAlunos && !permissoes.podeEditarApenasCapacitacao)) && (
                  <button
                    onClick={() => handleNavigation('gestao-auditoria', '/gestao/auditoria')}
                    className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                      activeSection === 'gestao-auditoria' ? 'bg-green-700' : 'hover:bg-green-700'
                    }`}
                  >
                    <Shield size={16} />
                    Trilha de Auditoria
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {permissoes.acessoAmbulatorial && (
          <button
            onClick={() => {
              if (!permissoes.apenasRecepcionista) {
                handleNavigation('ambulatorial', '/ambulatorial/dashboard');
              } else {
                handleNavigation('ambulatorial-pacientes', '/ambulatorial/pacientes');
              }
            }}
            className={`w-full text-left px-4 py-2 rounded mb-1 flex items-center justify-between ${
              activeSection === 'ambulatorial' || activeSection.startsWith('ambulatorial-') ? 'bg-green-600' : 'hover:bg-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={16} />
              Ambulatorial
            </div>
            {isAmbulatoriaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}

        {isAmbulatoriaExpanded && permissoes.acessoAmbulatorial && (
          <div className="ml-4 mt-2 mb-2 border-l-2 border-green-700 pl-2">

            {!permissoes.apenasRecepcionista && (
              <button
                onClick={() => handleNavigation('ambulatorial-dashboard', '/ambulatorial/dashboard')}
                className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                  activeSection === 'ambulatorial-dashboard' ? 'bg-green-700' : 'hover:bg-green-700'
                }`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
            )}

            {(permissoes.acessoTotal || !permissoes.apenasVisualizacao) && (
              <button
                onClick={() => handleNavigation('ambulatorial-pacientes', '/ambulatorial/pacientes')}
                className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                  activeSection === 'ambulatorial-pacientes' ? 'bg-green-700' : 'hover:bg-green-700'
                }`}
              >
                <Users size={16} />
                Pacientes
              </button>
            )}
          </div>
        )}

        {permissoes.acessoCapacitacao && (
          <button
            onClick={() => handleNavigation('capacitacao', '/capacitacao/dashboard')}
            className={`w-full text-left px-4 py-2 rounded mb-1 flex items-center justify-between ${
              activeSection === 'capacitacao' || activeSection.startsWith('capacitacao-') ? 'bg-green-600' : 'hover:bg-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              Capacitação
            </div>
            {isCapacitacaoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}

        {isCapacitacaoExpanded && permissoes.acessoCapacitacao && (
          <div className="ml-4 mt-2 mb-2 border-l-2 border-green-700 pl-2">

            <button
              onClick={() => handleNavigation('capacitacao-dashboard', '/capacitacao/dashboard')}
              className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                activeSection === 'capacitacao-dashboard' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>

            {(permissoes.acessoTotal || !permissoes.apenasVisualizacao) && (
              <>
                <button
                  onClick={() => handleNavigation('capacitacao-agendamentos', '/capacitacao/agendamentos')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'capacitacao-agendamentos' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <Calendar size={16} />
                  Agendamentos
                </button>

                <button
                  onClick={() => handleNavigation('capacitacao-enfermeiras-alunas', '/capacitacao/enfermeiras-alunas')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'capacitacao-enfermeiras-alunas' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <UserCheck size={16} />
                  Enfermeiros(as) Alunos(as)
                </button>

                <button
                  onClick={() => handleNavigation('capacitacao-pacientes', '/capacitacao/pacientes')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'capacitacao-pacientes' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <Users size={16} />
                  Pacientes
                </button>
              </>
            )}
          </div>
        )}

        {permissoes.acessoDistribuicao && (
          <button
            onClick={() => handleNavigation('distribuicao', '/distribuicao/dashboard')}
            className={`w-full text-left px-4 py-2 rounded mb-1 flex items-center justify-between ${
              activeSection === 'distribuicao' || activeSection.startsWith('distribuicao-') ? 'bg-green-600' : 'hover:bg-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package size={16} />
              Distribuição/Insumos
            </div>
            {isDistribuicaoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}

        {isDistribuicaoExpanded && permissoes.acessoDistribuicao && (
          <div className="ml-4 mt-2 mb-2 border-l-2 border-green-700 pl-2">

            <button
              onClick={() => handleNavigation('distribuicao-dashboard', '/distribuicao/dashboard')}
              className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                activeSection === 'distribuicao-dashboard' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>

            {(permissoes.acessoTotal || !permissoes.apenasVisualizacao) && (
              <>
                <button
                  onClick={() => handleNavigation('distribuicao-cadastro', '/distribuicao/cadastro-solicitacao')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'distribuicao-cadastro' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <UserPlus size={16} />
                  Cadastro de Solicitação
                </button>

                <button
                  onClick={() => handleNavigation('distribuicao-lista-espera', '/distribuicao/lista-espera')}
                  className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                    activeSection === 'distribuicao-lista-espera' ? 'bg-green-700' : 'hover:bg-green-700'
                  }`}
                >
                  <Calendar size={16} />
                  Lista de Espera
                </button>
              </>
            )}

            <button
              onClick={() => handleNavigation('distribuicao-municipios', '/distribuicao/distribuicao-municipios')}
              className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 text-sm mb-1 ${
                activeSection === 'distribuicao-municipios' ? 'bg-green-700' : 'hover:bg-green-700'
              }`}
            >
              <Package size={16} />
              Distribuição para Municípios
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
