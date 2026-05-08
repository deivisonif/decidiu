import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Stethoscope,
  UserPlus,
  Activity,
  Calendar,
  TrendingUp,
  Building2,
  GraduationCap,
  Package
} from 'lucide-react';
import api from '../../lib/api';

interface DashboardData {
  total_profissionais: number;
  total_enfermeiros: number;
  total_medicos: number;
  profissionais_por_especializacao: Record<string, number>;
  profissionais_por_modulo: Record<string, number>;
  total_pacientes: number;
  total_pacientes_ambulatorial: number;
  total_pacientes_capacitacao: number;
  agendamentos_pendentes: number;
}

export default function GestaoDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const response = await api.get('/dashboard/gestao');
      setDashboardData(response);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard de Gestão</h1>

            {/* Botões de Ação Rápida */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/gestao/cadastrar-profissional')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors"
                >
                  <UserPlus size={20} />
                  <span className="font-medium">Cadastrar Profissional</span>
                </button>

                <button
                  onClick={() => navigate('/ambulatorial/instrutoras')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users size={20} />
                  <span className="font-medium">Profissionais Ambulatorial</span>
                </button>

                <button
                  onClick={() => navigate('/capacitacao/enfermeiras-instrutoras')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <UserCheck size={20} />
                  <span className="font-medium">Enfermeiros(as) Instrutores(as)</span>
                </button>

                <button
                  onClick={() => navigate('/capacitacao/enfermeiras-alunas')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <GraduationCap size={20} />
                  <span className="font-medium">Enfermeiros(as) Alunos(as)</span>
                </button>
              </div>
            </div>

            {/* Cards de Indicadores Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#1a4d2e]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total de Profissionais</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dashboardData?.total_profissionais || 0}
                    </p>
                  </div>
                  <div className="bg-[#1a4d2e] bg-opacity-10 p-3 rounded-lg">
                    <Users size={28} className="text-[#1a4d2e]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total de Enfermeiros(as)</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dashboardData?.total_enfermeiros || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Activity size={28} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total de Médicos(as)</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dashboardData?.total_medicos || 0}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Stethoscope size={28} className="text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total de Pacientes</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dashboardData?.total_pacientes || 0}
                    </p>
                  </div>
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <TrendingUp size={28} className="text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhamento de Pacientes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-emerald-100 p-2 rounded">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Pacientes por Módulo</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ambulatorial</span>
                    <span className="font-bold text-gray-800">
                      {dashboardData?.total_pacientes_ambulatorial || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Capacitação</span>
                    <span className="font-bold text-gray-800">
                      {dashboardData?.total_pacientes_capacitacao || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-100 p-2 rounded">
                    <Calendar size={20} className="text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Agendamentos</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pendentes</span>
                    <span className="font-bold text-gray-800">
                      {dashboardData?.agendamentos_pendentes || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <Activity size={20} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Resumo Geral</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profissionais Ativos</span>
                    <span className="font-bold text-gray-800">
                      {dashboardData?.total_profissionais || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total de Pacientes</span>
                    <span className="font-bold text-gray-800">
                      {dashboardData?.total_pacientes || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profissionais por Módulo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-[#1a4d2e] bg-opacity-10 p-2 rounded">
                    <Building2 size={20} className="text-[#1a4d2e]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Profissionais por Módulo</h3>
                </div>
                <div className="space-y-3">
                  {dashboardData?.profissionais_por_modulo &&
                    Object.entries(dashboardData.profissionais_por_modulo).map(([modulo, total]) => (
                      <div key={modulo} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          {modulo.includes('Capacitação') ? (
                            <GraduationCap size={16} className="text-purple-600" />
                          ) : modulo.includes('Ambulatorial') ? (
                            <Activity size={16} className="text-blue-600" />
                          ) : modulo.includes('Distribuição') ? (
                            <Package size={16} className="text-orange-600" />
                          ) : (
                            <Users size={16} className="text-gray-600" />
                          )}
                          <span className="text-gray-700">{modulo}</span>
                        </div>
                        <span className="font-bold text-gray-800">{total}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <Stethoscope size={20} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Profissionais por Especialização</h3>
                </div>
                <div className="space-y-3">
                  {dashboardData?.profissionais_por_especializacao &&
                    Object.entries(dashboardData.profissionais_por_especializacao)
                      .sort((a, b) => b[1] - a[1])
                      .map(([especializacao, total]) => (
                        <div
                          key={especializacao}
                          className="flex justify-between items-center py-2 border-b last:border-b-0"
                        >
                          <span className="text-gray-700">{especializacao}</span>
                          <span className="font-bold text-gray-800">{total}</span>
                        </div>
                      ))}
                  {(!dashboardData?.profissionais_por_especializacao ||
                    Object.keys(dashboardData.profissionais_por_especializacao).length === 0) && (
                    <p className="text-gray-500 text-sm">Nenhuma especialização cadastrada</p>
                  )}
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
