import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, Edit, FileDown, FileSpreadsheet, Search } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { exportarAlunasCSV, exportarAlunasPDF } from '../../utils/exportUtils';

interface Aluna {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  municipio: string;
  enfermeira_instrutora_id: number;
  instrutora_nome: string;
  created_at: string;
  total_fichas: number;
  progresso: number;
  status: string;
}

export default function ListaEnfermeirasAlunas() {
  const navigate = useNavigate();
  const [alunas, setAlunas] = useState<Aluna[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    loadAlunas();
  }, []);

  const loadAlunas = async () => {
    try {
      const data = await capacitacaoAPI.getEnfermeirasAlunas();
      setAlunas(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunas:', error);
    } finally {
      setLoading(false);
    }
  };

  const alunasFiltradas = alunas.filter((aluna) => {
    if (!filtro) return true;
    const termo = filtro.toLowerCase();
    return (
      aluna.nome.toLowerCase().includes(termo) ||
      aluna.cpf.includes(termo)
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Enfermeiros(as) Alunos(as)</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportarAlunasPDF(alunas)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileDown size={18} />
            PDF
          </button>
          <button
            onClick={() => exportarAlunasCSV(alunas)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button
            onClick={() => navigate('/capacitacao/cadastrar-aluna')}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus size={20} />
            Novo(a) Aluno(a)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : alunas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Nenhum(a) aluno(a) cadastrado(a)</p>
          <button
            onClick={() => navigate('/capacitacao/cadastrar-aluna')}
            className="mt-4 text-[#2d7a4f] hover:underline font-semibold"
          >
            Cadastrar primeiro(a) aluno(a)
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>
          </div>

          {alunasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhum resultado encontrado para "{filtro}"</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CPF</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Município</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Progresso</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {alunasFiltradas.map((aluna) => (
                <tr key={aluna.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {aluna.nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {aluna.cpf}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {aluna.municipio || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      aluna.status === 'Concluído'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {aluna.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            aluna.progresso >= 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${aluna.progresso}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                        {aluna.progresso}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/capacitacao/aluna/${aluna.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => navigate(`/capacitacao/aluna/${aluna.id}/editar`)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}
