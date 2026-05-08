import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Activity, AlertCircle, TrendingUp, UserPlus, FileText } from 'lucide-react';

interface Stats {
  totalPacientes: number;
  totalConsultas: number;
  totalDius: number;
  totalImplanons: number;
  totalInsercoes: number;
  totalIntercorrencias: number;
  totalUsgs: number;
  mediaIdade: number;
  percentualComorbidade: number;
}

export default function AmbulatorlalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalPacientes: 0,
    totalConsultas: 0,
    totalDius: 0,
    totalImplanons: 0,
    totalInsercoes: 0,
    totalIntercorrencias: 0,
    totalUsgs: 0,
    mediaIdade: 0,
    percentualComorbidade: 0,
  });
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    loadStats();
  }, [selectedYear]);

  const loadStats = async () => {
    setLoading(true);
    setErro(false);
    try {
      const url = selectedYear === 'Todos'
        ? '/api/ambulatorial/stats'
        : `/api/ambulatorial/stats?year=${selectedYear}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('Erro na API de estatísticas:', response.status);
        setErro(true);
        return;
      }
      const data = await response.json();
      if (data.error) {
        console.error('Erro retornado pela API:', data.error);
        setErro(true);
        return;
      }
      setStats({
        totalPacientes: data.totalPacientes ?? 0,
        totalConsultas: data.totalConsultas ?? 0,
        totalDius: data.totalDius ?? 0,
        totalImplanons: data.totalImplanons ?? 0,
        totalInsercoes: data.totalInsercoes ?? 0,
        totalIntercorrencias: data.totalIntercorrencias ?? 0,
        totalUsgs: data.totalUsgs ?? 0,
        mediaIdade: data.mediaIdade ?? 0,
        percentualComorbidade: data.percentualComorbidade ?? 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }: {
    icon: any;
    title: string;
    value: number | string;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 overflow-hidden" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-gray-600 text-sm font-medium" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{title}</p>
          <p className="text-3xl font-bold mt-2" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{subtitle}</p>}
        </div>
        <div className="flex-shrink-0 p-2.5 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} color={color} />
        </div>
      </div>
    </div>
  );

  const currentYear = new Date().getFullYear();
  const years = ['Todos', ...Array.from({ length: 5 }, (_, i) => String(currentYear - i))];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2d7a4f] border-t-transparent mb-3"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Ambulatorial</h1>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filtrar por ano:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">Não foi possível carregar as estatísticas. Verifique a conexão com o servidor.</p>
          <button onClick={loadStats} className="ml-auto text-sm text-red-700 underline hover:no-underline">Tentar novamente</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Users}
          title="Pacientes Cadastradas"
          value={stats.totalPacientes}
          color="#2d7a4f"
        />
        <StatCard
          icon={Calendar}
          title="Total de Consultas"
          value={stats.totalConsultas}
          color="#3b82f6"
        />
        <StatCard
          icon={Activity}
          title="Total de Inserções"
          value={stats.totalInsercoes}
          color="#8b5cf6"
          subtitle="DIU + Implanon"
        />
        <StatCard
          icon={Activity}
          title="DIUs Inseridos"
          value={stats.totalDius}
          color="#f59e0b"
        />
        <StatCard
          icon={Activity}
          title="Implanons Inseridos"
          value={stats.totalImplanons}
          color="#10b981"
        />
        <StatCard
          icon={AlertCircle}
          title="Intercorrências"
          value={stats.totalIntercorrencias}
          color="#ef4444"
        />
        <StatCard
          icon={Activity}
          title="USGs Realizadas"
          value={stats.totalUsgs}
          color="#06b6d4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          icon={TrendingUp}
          title="Média de Idade"
          value={`${stats.mediaIdade} anos`}
          color="#8b5cf6"
        />
        <StatCard
          icon={AlertCircle}
          title="Com Comorbidades"
          value={`${stats.percentualComorbidade}%`}
          color="#ec4899"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Visão Geral</h2>
        <p className="text-gray-600 mb-4">
          O módulo ambulatorial permite gerenciar o atendimento de pacientes, registrar dados de identificação e socioeconômicos,
          acompanhar dados ginecológicos e obstétricos, e registrar consultas com histórico de inserções de DIU e intercorrências.
        </p>
        <p className="text-gray-600">
          Use os filtros acima para visualizar as estatísticas por ano específico e acompanhe as métricas de atendimento,
          inserções, intercorrências e perfil socioeconômico das pacientes.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/ambulatorial/cadastrar-paciente')}
            className="bg-[#2d7a4f] hover:bg-[#236b43] text-white p-6 rounded-lg shadow-md transition-colors flex items-center gap-4"
          >
            <UserPlus size={32} />
            <div className="text-left">
              <div className="text-lg font-semibold">Cadastrar Paciente</div>
              <div className="text-sm opacity-90">Registrar nova paciente no sistema</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/ambulatorial/retorno-paciente')}
            className="bg-[#2d7a4f] hover:bg-[#236b43] text-white p-6 rounded-lg shadow-md transition-colors flex items-center gap-4"
          >
            <FileText size={32} />
            <div className="text-left">
              <div className="text-lg font-semibold">Retorno Paciente</div>
              <div className="text-sm opacity-90">Buscar e visualizar pacientes cadastradas</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
