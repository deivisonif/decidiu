import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, getDashboardRoute } from '../contexts/AuthContext';
import { ShieldOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof typeof permissionChecks;
  showUnauthorized?: boolean;
}

const permissionChecks = {
  acessoTotal: (perms: any) => perms.acessoTotal,
  acessoGestao: (perms: any) => perms.acessoGestao,
  acessoAmbulatorial: (perms: any) => perms.acessoAmbulatorial,
  acessoCapacitacao: (perms: any) => perms.acessoCapacitacao,
  acessoDistribuicao: (perms: any) => perms.acessoDistribuicao,
  podeCriarProfissionais: (perms: any) => perms.podeCriarProfissionais || perms.podeCriarAlunos,
  podeAlterarSenhas: (perms: any) => perms.podeAlterarSenhas,
  podeEditarProfissionais: (perms: any) => perms.podeEditarProfissionais,
  podeExcluirProfissionais: (perms: any) => perms.podeExcluirProfissionais,
  podeAlterarStatusProfissionais: (perms: any) => perms.podeAlterarStatusProfissionais,
  naoRecepcionista: (perms: any) => !perms.apenasRecepcionista,
  acessoAuditoria: (perms: any) => perms.acessoTotal || (perms.acessoGestao && !perms.somenteVisualizarAlunos && !perms.podeEditarApenasCapacitacao),
};

export default function ProtectedRoute({
  children,
  requiredPermission,
  showUnauthorized = true,
}: ProtectedRouteProps) {
  const { usuario, permissoes, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a4d2e]"></div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const checker = permissionChecks[requiredPermission];
    if (!checker || !checker(permissoes)) {
      if (showUnauthorized) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldOff className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
              <p className="text-gray-600 mb-4">
                Você não tem permissão para acessar esta página.
              </p>
              <p className="text-sm text-gray-500">
                Seu cargo atual: <strong>{usuario.cargo}</strong>
              </p>
            </div>
          </div>
        );
      }
      return <Navigate to={getDashboardRoute(usuario.cargo)} replace />;
    }
  }

  return <>{children}</>;
}
