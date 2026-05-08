import { useState, useEffect } from 'react';
import { Calendar, Users, UserCheck, Activity } from 'lucide-react';
import api from '../../lib/api';
import MapaAlagoasLeaflet from '../../components/MapaAlagoasLeaflet';

interface Stats {
  totalAgendamentos: number;
  totalInstrutoras: number;
  totalAlunas: number;
  totalDius: number;
  totalImplanons: number;
  totalPacientesComInsercao: number;
  totalProfissionaisCapacitados?: number;
}

interface MunicipioData {
  nome: string;
  profissionais_capacitados: number;
  insercoes: number;
  diu_inseridos: number;
  implanon_inseridos: number;
}

export default function CapacitacaoDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalAgendamentos: 0,
    totalInstrutoras: 0,
    totalAlunas: 0,
    totalDius: 0,
    totalImplanons: 0,
    totalPacientesComInsercao: 0,
    totalProfissionaisCapacitados: 0,
  });
  const [dadosMapa, setDadosMapa] = useState<MunicipioData[]>([]);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dadosDashboard, setDadosDashboard] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (municipioSelecionado && dadosDashboard) {
      loadStatsMunicipio(municipioSelecionado);
    } else if (dadosDashboard) {
      setStats({
        totalAgendamentos: dadosDashboard.agendamentos,
        totalInstrutoras: dadosDashboard.instrutores,
        totalAlunas: dadosDashboard.alunos,
        totalDius: dadosDashboard.diu_inseridos,
        totalImplanons: dadosDashboard.implanon_inseridos,
        totalPacientesComInsercao: dadosDashboard.pacientes_com_insercao,
        totalProfissionaisCapacitados: dadosDashboard.municipios.reduce((acc: number, m: MunicipioData) => acc + m.profissionais_capacitados, 0),
      });
    }
  }, [municipioSelecionado, dadosDashboard]);

  const loadData = async () => {
    try {
      const data = await api.get('/capacitacao/dashboard');
      setDadosDashboard(data);
      setDadosMapa(data.municipios);
      setStats({
        totalAgendamentos: data.agendamentos,
        totalInstrutoras: data.instrutores,
        totalAlunas: data.alunos,
        totalDius: data.diu_inseridos,
        totalImplanons: data.implanon_inseridos,
        totalPacientesComInsercao: data.pacientes_com_insercao,
        totalProfissionaisCapacitados: data.municipios.reduce((acc: number, m: MunicipioData) => acc + m.profissionais_capacitados, 0),
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsMunicipio = async (municipio: string) => {
    try {
      const data = await api.get(`/capacitacao/stats/municipio/${municipio}`);
      setStats({
        totalAgendamentos: data.totalAgendamentos,
        totalInstrutoras: 0,
        totalAlunas: data.totalAlunas,
        totalDius: data.totalDius,
        totalImplanons: data.totalImplanons,
        totalPacientesComInsercao: data.totalPacientesComInsercao,
        totalProfissionaisCapacitados: data.totalProfissionaisCapacitados,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas do município:', error);
    }
  };

  const handleMunicipioClick = (municipio: string | null) => {
    setMunicipioSelecionado(municipio);
  };

  const StatCard = ({ icon: Icon, title, value, color }: { icon: any, title: string, value: number, color: string }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 overflow-hidden" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-gray-600 text-sm font-medium" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{title}</p>
          <p className="text-3xl font-bold mt-2" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{value}</p>
        </div>
        <div className="flex-shrink-0 p-2.5 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} color={color} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Capacitação</h1>
        {municipioSelecionado && (() => {
          const municipioData = dadosMapa.find(d => d.nome.toLowerCase().replace(/\s+/g, '-') === municipioSelecionado);
          return municipioData && (
            <p className="text-gray-600 mt-2">
              Exibindo dados de: <span className="font-semibold text-[#1a4d2e]">{municipioData.nome}</span>
            </p>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Calendar}
          title={municipioSelecionado ? "Agendamentos no Município" : "Agendamentos com Municípios"}
          value={stats.totalAgendamentos}
          color="#2d7a4f"
        />
        {!municipioSelecionado && (
          <StatCard
            icon={UserCheck}
            title="Enfermeiros(as) Instrutores(as)"
            value={stats.totalInstrutoras}
            color="#3b82f6"
          />
        )}
        <StatCard
          icon={Users}
          title={municipioSelecionado ? "Enfermeiros(as) Alunos(as) do Município" : "Enfermeiros(as) Alunos(as)"}
          value={stats.totalAlunas}
          color="#f59e0b"
        />
        {municipioSelecionado && (
          <StatCard
            icon={UserCheck}
            title="Profissionais Capacitados"
            value={stats.totalProfissionaisCapacitados || 0}
            color="#3b82f6"
          />
        )}
        <StatCard
          icon={Activity}
          title="DIUs Inseridos"
          value={stats.totalDius}
          color="#ef4444"
        />
        <StatCard
          icon={Activity}
          title="Implanons Inseridos"
          value={stats.totalImplanons}
          color="#10b981"
        />
        <StatCard
          icon={Users}
          title="Total de Pacientes com Inserção"
          value={stats.totalPacientesComInsercao}
          color="#8b5cf6"
        />
      </div>

      <div className="mb-8">
        <MapaAlagoasLeaflet
          dados={dadosMapa}
          municipioSelecionado={municipioSelecionado}
          onMunicipioClick={handleMunicipioClick}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {(() => {
            const municipioData = municipioSelecionado ? dadosMapa.find(d => d.nome.toLowerCase().replace(/\s+/g, '-') === municipioSelecionado) : null;
            return municipioData ? `Visão Geral - ${municipioData.nome}` : 'Visão Geral';
          })()}
        </h2>
        <p className="text-gray-600">
          {(() => {
            const municipioData = municipioSelecionado ? dadosMapa.find(d => d.nome.toLowerCase().replace(/\s+/g, '-') === municipioSelecionado) : null;
            return municipioData
              ? `O município de ${municipioData.nome} possui ${municipioData.profissionais_capacitados} profissionais capacitados e ${municipioData.insercoes} inserções realizadas.`
              : 'O módulo de capacitação permite gerenciar agendamentos com municípios, registrar enfermeiros(as) instrutores(as) e alunos(as), cadastrar pacientes e acompanhar o histórico de inserções de DIU realizadas durante as capacitações.';
          })()}
        </p>
      </div>
    </div>
  );
}
