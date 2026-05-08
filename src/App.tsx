import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider, useAuth, getDashboardRoute } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import PrimeiroAcesso from './pages/PrimeiroAcesso';
import RecuperarSenha from './pages/RecuperarSenha';
import AlterarSenhaObrigatoria from './pages/AlterarSenhaObrigatoria';
import CapacitacaoDashboard from './pages/capacitacao/CapacitacaoDashboard';
import AgendarMunicipio from './pages/capacitacao/AgendarMunicipio';
import ListaAgendamentos from './pages/capacitacao/ListaAgendamentos';
import EditarAgendamento from './pages/capacitacao/EditarAgendamento';
import CadastrarEnfermeiraInstrutora from './pages/capacitacao/CadastrarEnfermeiraInstrutora';
import CadastrarEnfermeiraAluna from './pages/capacitacao/CadastrarEnfermeiraAluna';
import ListaEnfermeirasInstrutoras from './pages/capacitacao/ListaEnfermeirasInstrutoras';
import ListaEnfermeirasAlunas from './pages/capacitacao/ListaEnfermeirasAlunas';
import VisualizarAluna from './pages/capacitacao/VisualizarAluna';
import EditarAluna from './pages/capacitacao/EditarAluna';
import ListaPacientesCapacitacao from './pages/capacitacao/ListaPacientesCapacitacao';
import ProntuarioPaciente from './pages/capacitacao/ProntuarioPaciente';
import CadastrarPacienteCapacitacao from './pages/capacitacao/CadastrarPacienteCapacitacao';
import RegistrarAtendimento from './pages/capacitacao/RegistrarAtendimento';
import AmbulatorlalDashboard from './pages/ambulatorial/AmbulatororialDashboard';
import CadastrarPaciente from './pages/ambulatorial/CadastrarPaciente';
import DadosGinecologicos from './pages/ambulatorial/DadosGinecologicos';
import Consultas from './pages/ambulatorial/Consultas';
import RetornoPaciente from './pages/ambulatorial/RetornoPaciente';
import ListaPacientesAmbulatorial from './pages/ambulatorial/ListaPacientes';
import CadastrarInstrutoraAmbulatorial from './pages/ambulatorial/CadastrarInstrutora';
import ListaInstrutorasAmbulatorial from './pages/ambulatorial/ListaInstrutoras';
import DistribuicaoDashboard from './pages/distribuicao/DistribuicaoDashboard';
import CadastroSolicitacao from './pages/distribuicao/CadastroSolicitacao';
import ListaEspera from './pages/distribuicao/ListaEspera';
import DistribuicaoMunicipios from './pages/distribuicao/DistribuicaoMunicipios';
import CadastrarResponsavel from './pages/distribuicao/CadastrarResponsavel';
import CadastrarProfissional from './pages/gestao/CadastrarProfissional';
import GestaoDashboard from './pages/gestao/GestaoDashboard';
import ListaProfissionais from './pages/gestao/ListaProfissionais';
import EditarProfissional from './pages/gestao/EditarProfissional';
import AuditoriaLogs from './pages/gestao/AuditoriaLogs';

function deriveActiveSection(pathname: string): string {
  const path = pathname.replace(/^\//, '');
  const segments = path.split('/');
  const module = segments[0];
  const sub = segments[1];

  if (!module) return '';

  const subMap: Record<string, string> = {
    dashboard: 'dashboard',
    'cadastrar-profissional': 'cadastrar-profissional',
    profissionais: 'lista-profissionais',
    'editar-profissional': 'lista-profissionais',
    pacientes: 'pacientes',
    'cadastrar-paciente': 'pacientes',
    'retorno-paciente': 'pacientes',
    instrutoras: 'instrutoras',
    'cadastrar-instrutora': 'instrutoras',
    agendamentos: 'agendamentos',
    'agendar-municipio': 'agendamentos',
    'enfermeiras-instrutoras': 'instrutoras',
    'enfermeiras-alunas': 'enfermeiras-alunas',
    alunas: 'enfermeiras-alunas',
    aluna: 'enfermeiras-alunas',
    'cadastrar-aluna': 'enfermeiras-alunas',
    'cadastro-solicitacao': 'cadastro',
    'lista-espera': 'lista-espera',
    'distribuicao-municipios': 'municipios',
    'cadastrar-responsavel': 'cadastro',
    auditoria: 'auditoria',
  };

  const subKey = sub ? (subMap[sub] ?? sub) : 'dashboard';
  return `${module}-${subKey}`;
}

function AppContent() {
  const location = useLocation();
  const activeSection = deriveActiveSection(location.pathname);
  const { usuario, permissoes, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (usuario.primeiro_acesso === 1 || (usuario as any).must_change_password === 1) {
    return (
      <Routes>
        <Route path="/alterar-senha" element={<AlterarSenhaObrigatoria />} />
        <Route path="*" element={<Navigate to="/alterar-senha" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeSection={activeSection}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col">
        <Header userName={usuario.nome_completo} onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to={getDashboardRoute(usuario.cargo)} replace />} />
            <Route path="/login" element={<Navigate to={getDashboardRoute(usuario.cargo)} replace />} />
            <Route path="/recuperar-senha" element={<Navigate to={getDashboardRoute(usuario.cargo)} replace />} />
            <Route path="/alterar-senha" element={<Navigate to={getDashboardRoute(usuario.cargo)} replace />} />

            <Route path="/gestao/dashboard" element={
              <ProtectedRoute requiredPermission="acessoGestao">
                <GestaoDashboard />
              </ProtectedRoute>
            } />
            <Route path="/gestao/cadastrar-profissional" element={
              <ProtectedRoute requiredPermission="podeCriarProfissionais">
                <CadastrarProfissional />
              </ProtectedRoute>
            } />
            <Route path="/gestao/profissionais" element={
              <ProtectedRoute requiredPermission="acessoGestao">
                <ListaProfissionais />
              </ProtectedRoute>
            } />
            <Route path="/gestao/editar-profissional/:id" element={
              <ProtectedRoute requiredPermission="podeEditarProfissionais">
                <EditarProfissional />
              </ProtectedRoute>
            } />
            <Route path="/gestao/auditoria" element={
              <ProtectedRoute requiredPermission="acessoAuditoria">
                <AuditoriaLogs />
              </ProtectedRoute>
            } />

            <Route path="/ambulatorial/dashboard" element={
              <ProtectedRoute requiredPermission="acessoAmbulatorial">
                <ProtectedRoute requiredPermission="naoRecepcionista">
                  <AmbulatorlalDashboard />
                </ProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/pacientes" element={
              <ProtectedRoute requiredPermission="acessoAmbulatorial">
                <ListaPacientesAmbulatorial />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/cadastrar-paciente" element={
              <ProtectedRoute requiredPermission="acessoAmbulatorial">
                <CadastrarPaciente />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/cadastrar-paciente/dados-ginecologicos" element={
              <ProtectedRoute requiredPermission="acessoAmbulatorial">
                <DadosGinecologicos />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/cadastrar-paciente/consultas" element={
              <ProtectedRoute requiredPermission="naoRecepcionista">
                <Consultas />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/pacientes/:id/consultas" element={
              <ProtectedRoute requiredPermission="naoRecepcionista">
                <Consultas />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/retorno-paciente" element={
              <ProtectedRoute requiredPermission="naoRecepcionista">
                <RetornoPaciente />
              </ProtectedRoute>
            } />
            <Route path="/ambulatorial/cadastrar-instrutora" element={<CadastrarInstrutoraAmbulatorial />} />
            <Route path="/ambulatorial/instrutoras" element={<ListaInstrutorasAmbulatorial />} />

            <Route path="/capacitacao/dashboard" element={<CapacitacaoDashboard />} />
            <Route path="/capacitacao/agendar-municipio" element={<AgendarMunicipio />} />
            <Route path="/capacitacao/agendamentos" element={<ListaAgendamentos />} />
            <Route path="/capacitacao/agendamentos/:id/editar" element={<EditarAgendamento />} />
            <Route path="/capacitacao/cadastrar-instrutora" element={<CadastrarEnfermeiraInstrutora />} />
            <Route path="/capacitacao/cadastrar-aluna" element={<CadastrarEnfermeiraAluna />} />
            <Route path="/capacitacao/enfermeiras-instrutoras" element={<ListaEnfermeirasInstrutoras />} />
            <Route path="/capacitacao/enfermeiras-alunas" element={<ListaEnfermeirasAlunas />} />
            <Route path="/capacitacao/alunas" element={<ListaEnfermeirasAlunas />} />
            <Route path="/capacitacao/aluna/:id" element={<VisualizarAluna />} />
            <Route path="/capacitacao/aluna/:id/editar" element={<EditarAluna />} />
            <Route path="/capacitacao/pacientes" element={<ListaPacientesCapacitacao />} />
            <Route path="/capacitacao/pacientes/:id" element={<CadastrarPacienteCapacitacao />} />
            <Route path="/capacitacao/pacientes/:id/atendimento" element={<RegistrarAtendimento />} />
            <Route path="/capacitacao/registrar-atendimento/:id" element={<RegistrarAtendimento />} />
            <Route path="/capacitacao/pacientes/:id/prontuario" element={<ProntuarioPaciente />} />
            <Route path="/capacitacao/prontuario/:id" element={<ProntuarioPaciente />} />
            <Route path="/capacitacao/cadastrar-paciente/:id" element={<CadastrarPacienteCapacitacao />} />

            <Route path="/distribuicao/dashboard" element={<DistribuicaoDashboard />} />
            <Route path="/distribuicao/cadastro-solicitacao" element={<CadastroSolicitacao />} />
            <Route path="/distribuicao/lista-espera" element={<ListaEspera />} />
            <Route path="/distribuicao/distribuicao-municipios" element={<DistribuicaoMunicipios />} />
            <Route path="/distribuicao/cadastrar-responsavel" element={<CadastrarResponsavel />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
