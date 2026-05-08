import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type Cargo =
  | 'Administrador'
  | 'Coordenador'
  | 'Enfermeiro(a) Instrutor(a)'
  | 'Enfermeiro(a) Aluno(a)'
  | 'Médico(a) / Enfermeiro(a) Ambulatorial'
  | 'Responsável por Insumos'
  | 'Visitante'
  | 'Recepcionista';

export interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string | null;
  cargo: Cargo;
  status: string;
  primeiro_acesso: number;
  created_at: string;
}

export interface Permissoes {
  acessoTotal: boolean;
  podeGerenciarHierarquia: boolean;
  podeCriarProfissionais: boolean;
  podeAlterarSenhas: boolean;
  acessoAmbulatorial: boolean;
  acessoCapacitacao: boolean;
  acessoDistribuicao: boolean;
  acessoGestao: boolean;
  apenasVisualizacao: boolean;
  podeCriarAlunos: boolean;
  podeVisualizarInstrutores: boolean;
  podeAlterarSenhaInstrutores: boolean;
  podeEditarProfissionais: boolean;
  podeExcluirProfissionais: boolean;
  podeAlterarStatusProfissionais: boolean;
  podeExportarDados: boolean;
  somenteVisualizarAlunos: boolean;
  podeEditarApenasCapacitacao: boolean;
  apenasRecepcionista: boolean;
}

export function getDashboardRoute(cargo: Cargo | string): string {
  switch (cargo) {
    case 'Administrador':
    case 'Coordenador':
      return '/gestao/dashboard';
    case 'Enfermeiro(a) Instrutor(a)':
    case 'Enfermeiro(a) Aluno(a)':
      return '/capacitacao/dashboard';
    case 'Médico(a) / Enfermeiro(a) Ambulatorial':
      return '/ambulatorial/dashboard';
    case 'Responsável por Insumos':
      return '/distribuicao/dashboard';
    case 'Recepcionista':
      return '/ambulatorial/pacientes';
    case 'Visitante':
      return '/capacitacao/dashboard';
    default:
      return '/capacitacao/dashboard';
  }
}

interface AuthContextType {
  usuario: Usuario | null;
  permissoes: Permissoes;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<Usuario>;
  logout: () => void;
  atualizarSenha: (novaSenha: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function calcularPermissoes(cargo: Cargo): Permissoes {
  const basePermissoes: Permissoes = {
    acessoTotal: false,
    podeGerenciarHierarquia: false,
    podeCriarProfissionais: false,
    podeAlterarSenhas: false,
    acessoAmbulatorial: false,
    acessoCapacitacao: false,
    acessoDistribuicao: false,
    acessoGestao: false,
    apenasVisualizacao: false,
    podeCriarAlunos: false,
    podeVisualizarInstrutores: false,
    podeAlterarSenhaInstrutores: false,
    podeEditarProfissionais: false,
    podeExcluirProfissionais: false,
    podeAlterarStatusProfissionais: false,
    podeExportarDados: false,
    somenteVisualizarAlunos: false,
    podeEditarApenasCapacitacao: false,
    apenasRecepcionista: false,
  };

  switch (cargo) {
    case 'Administrador':
      return {
        acessoTotal: true,
        podeGerenciarHierarquia: true,
        podeCriarProfissionais: true,
        podeAlterarSenhas: true,
        acessoAmbulatorial: true,
        acessoCapacitacao: true,
        acessoDistribuicao: true,
        acessoGestao: true,
        apenasVisualizacao: false,
        podeCriarAlunos: true,
        podeVisualizarInstrutores: true,
        podeAlterarSenhaInstrutores: true,
        podeEditarProfissionais: true,
        podeExcluirProfissionais: true,
        podeAlterarStatusProfissionais: true,
        podeExportarDados: true,
        somenteVisualizarAlunos: false,
        podeEditarApenasCapacitacao: false,
      };

    case 'Coordenador':
      return {
        ...basePermissoes,
        acessoGestao: true,
        acessoAmbulatorial: true,
        acessoCapacitacao: true,
        podeCriarAlunos: true,
        podeVisualizarInstrutores: true,
        podeAlterarSenhaInstrutores: true,
        podeAlterarSenhas: true,
        podeEditarProfissionais: true,
        podeExcluirProfissionais: true,
        podeAlterarStatusProfissionais: true,
        podeExportarDados: true,
        podeEditarApenasCapacitacao: true,
      };

    case 'Enfermeiro(a) Instrutor(a)':
      return {
        ...basePermissoes,
        acessoCapacitacao: true,
        acessoGestao: true,
        somenteVisualizarAlunos: true,
      };

    case 'Enfermeiro(a) Aluno(a)':
      return {
        ...basePermissoes,
        acessoCapacitacao: true,
      };

    case 'Médico(a) / Enfermeiro(a) Ambulatorial':
      return {
        ...basePermissoes,
        acessoAmbulatorial: true,
      };

    case 'Responsável por Insumos':
      return {
        ...basePermissoes,
        acessoDistribuicao: true,
      };

    case 'Visitante':
      return {
        ...basePermissoes,
        apenasVisualizacao: true,
        acessoAmbulatorial: true,
        acessoCapacitacao: true,
        acessoDistribuicao: true,
      };

    case 'Recepcionista':
      return {
        ...basePermissoes,
        acessoAmbulatorial: true,
        apenasRecepcionista: true,
      };

    default:
      return basePermissoes;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<Permissoes>(calcularPermissoes('Visitante'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
      try {
        const user = JSON.parse(usuarioSalvo);
        setUsuario(user);
        setPermissoes(calcularPermissoes(user.cargo));
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!usuario) return;

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    let inactivityTimer: NodeJS.Timeout;

    const handleAutoLogout = async () => {
      console.log('Usuário inativo por 30 minutos. Fazendo logout automático...');

      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuario.id }),
        });
      } catch (error) {
        console.error('Erro ao fazer logout no servidor:', error);
      }

      setUsuario(null);
      setPermissoes(calcularPermissoes('Visitante'));
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    };

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      inactivityTimer = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [usuario]);

  const login = async (cpf: string, senha: string): Promise<Usuario> => {
    const response = await apiClient.post<Usuario>('/auth/login', { cpf, senha });

    if (!response.ok) {
      throw new Error(response.error?.message || 'Erro ao fazer login');
    }

    const user = response.data!;
    setUsuario(user);
    setPermissoes(calcularPermissoes(user.cargo));
    localStorage.setItem('usuario', JSON.stringify(user));
    return user;
  };

  const logout = async () => {
    if (usuario) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id }),
      });
    }
    setUsuario(null);
    setPermissoes(calcularPermissoes('Visitante'));
    localStorage.removeItem('usuario');
  };

  const atualizarSenha = async (novaSenha: string) => {
    if (!usuario) throw new Error('Usuário não autenticado');

    const response = await fetch(`${API_URL}/usuarios/${usuario.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senha_hash: novaSenha,
        usuario_id: usuario.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar senha');
    }

    const usuarioAtualizado = await response.json();
    setUsuario(usuarioAtualizado);
    localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        permissoes,
        loading,
        login,
        logout,
        atualizarSenha,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
