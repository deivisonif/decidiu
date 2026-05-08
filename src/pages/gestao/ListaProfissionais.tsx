import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, CreditCard as Edit, X, AlertCircle, Trash2, FileDown, FileSpreadsheet } from 'lucide-react';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../lib/api';
import { maskCPF } from '../../utils/masks';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Profissional {
  id: number;
  nome_completo: string;
  cpf: string;
  cargo: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  profissao?: string;
  telefone?: string;
  email?: string;
  municipio?: string;
  created_at: string;
}

interface PaginationData {
  profissionais: Profissional[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  categorias: string[];
}

export default function ListaProfissionais() {
  const navigate = useNavigate();
  const { usuario, permissoes } = useAuth();
  const { success, error: toastError } = useToast();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [acaoConfirm, setAcaoConfirm] = useState<{
    profissional: Profissional;
    novoStatus: 'ativo' | 'inativo';
  } | null>(null);
  const [profissionalParaExcluir, setProfissionalParaExcluir] = useState<Profissional | null>(null);

  useEffect(() => {
    carregarProfissionais();
  }, [currentPage, busca, categoriaSelecionada]);

  const carregarProfissionais = async () => {
    try {
      setLoading(true);
      setErro('');
      const data: PaginationData = await api.get('/profissionais', {
        params: {
          page: currentPage,
          per_page: 10,
          busca: busca,
          categoria: categoriaSelecionada
        }
      });

      setProfissionais(data.profissionais);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      if (data.categorias && data.categorias.length > 0) {
        setCategorias(data.categorias);
      }
    } catch (error: any) {
      console.error('Erro ao carregar profissionais:', error);

      if (error.message && error.message.includes('Acesso negado')) {
        toastError(error.message);
        navigate('/');
      } else if (error.message && error.message.includes('fetch')) {
        setErro('Não foi possível conectar ao servidor. Verifique se a API está rodando e tente novamente.');
      } else {
        setErro(error.message || 'Erro ao carregar profissionais. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoriaSelecionada(e.target.value);
    setCurrentPage(1);
  };

  const handleVerDetalhes = (profissional: Profissional) => {
    setProfissionalSelecionado(profissional);
    setShowDetalhesModal(true);
  };

  const podeEditar = (profissional: Profissional) => {
    if (!permissoes.podeEditarProfissionais) return false;

    // Coordenador só pode editar usuários da área de capacitação
    if (permissoes.podeEditarApenasCapacitacao) {
      const cargosPermitidos = ['Enfermeiro(a) Instrutor(a)', 'Enfermeiro(a) Aluno(a)'];
      return cargosPermitidos.includes(profissional.cargo);
    }

    return true;
  };

  const handleEditar = (profissional: Profissional) => {
    navigate(`/gestao/editar-profissional/${profissional.id}`);
  };

  const handleSolicitarMudancaStatus = (profissional: Profissional) => {
    const novoStatus = profissional.status === 'ativo' ? 'inativo' : 'ativo';
    setAcaoConfirm({ profissional, novoStatus });
    setShowConfirmModal(true);
  };

  const handleConfirmarMudancaStatus = async () => {
    if (!acaoConfirm || !usuario) return;

    try {
      await api.put(`/profissionais/${acaoConfirm.profissional.id}/status`, {
        status: acaoConfirm.novoStatus,
        usuario_id: usuario.id
      });

      await carregarProfissionais();
      setShowConfirmModal(false);
      setAcaoConfirm(null);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toastError('Erro ao alterar status do profissional. Tente novamente.');
    }
  };

  const handleSolicitarExclusao = (profissional: Profissional) => {
    setProfissionalParaExcluir(profissional);
    setShowDeleteModal(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!profissionalParaExcluir || !usuario) return;

    try {
      await api.delete(`/profissionais/${profissionalParaExcluir.id}`, {
        usuario_id: usuario.id
      });

      await carregarProfissionais();
      setShowDeleteModal(false);
      setProfissionalParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      toastError('Erro ao excluir profissional. Tente novamente.');
    }
  };

  const exportarParaPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text(`Lista de Profissionais - ${categoriaSelecionada}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`Total: ${total} profissionais`, 14, 22);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

    const tableData = profissionais.map(prof => [
      prof.nome_completo,
      maskCPF(prof.cpf),
      prof.cargo,
      prof.profissao || '-',
      prof.status === 'ativo' ? 'Ativo' : prof.status === 'inativo' ? 'Inativo' : 'Bloqueado'
    ]);

    autoTable(doc, {
      head: [['Nome Completo', 'CPF', 'Cargo', 'Profissão', 'Status']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 77, 46] }
    });

    doc.save(`profissionais_${categoriaSelecionada.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

  const exportarParaExcel = () => {
    const COR_HEADER = 'FF1A4D2E';
    const COR_VERDE  = 'FFE8F5EE';
    const COR_BRANCO = 'FFFFFFFF';

    const headers = ['Nome Completo', 'CPF', 'Cargo', 'Profissão', 'Status', 'E-mail', 'Telefone', 'Município'];
    const linhas  = profissionais.map(prof => [
      prof.nome_completo,
      maskCPF(prof.cpf),
      prof.cargo,
      prof.profissao || '-',
      prof.status === 'ativo' ? 'Ativo' : prof.status === 'inativo' ? 'Inativo' : 'Bloqueado',
      prof.email || '-',
      prof.telefone || '-',
      prof.municipio || '-',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...linhas]);

    // Estilo cabeçalho (linha 0)
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        fill: { patternType: 'solid', fgColor: { argb: COR_HEADER } },
        font: { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        },
      };
    }

    // Zebra nas linhas de dados
    for (let r = 1; r <= linhas.length; r++) {
      const cor = (r - 1) % 2 === 0 ? COR_VERDE : COR_BRANCO;
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = {
          fill: { patternType: 'solid', fgColor: { argb: cor } },
          font: { name: 'Calibri', sz: 10 },
          alignment: { vertical: 'center' },
          border: {
            top: { style: 'hair' }, bottom: { style: 'hair' },
            left: { style: 'hair' }, right: { style: 'hair' },
          },
        };
      }
    }

    // Auto-size colunas
    ws['!cols'] = headers.map((h, i) => {
      const maxData = linhas.reduce((mx, row) => Math.max(mx, String(row[i] ?? '').length), 0);
      return { wch: Math.min(Math.max(h.length, maxData) + 4, 60) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profissionais');
    XLSX.writeFile(wb, `profissionais_${categoriaSelecionada.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`, {
      bookType: 'xlsx', type: 'binary', cellStyles: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ativo: 'bg-green-100 text-green-800 border-green-300',
      inativo: 'bg-gray-100 text-gray-800 border-gray-300',
      bloqueado: 'bg-red-100 text-red-800 border-red-300'
    };

    const labels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      bloqueado: 'Bloqueado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading && profissionais.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando profissionais...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Lista de Profissionais</h1>
            <p className="text-gray-600 text-sm mt-1">
              {total} {total === 1 ? 'profissional encontrado' : 'profissionais encontrados'}
            </p>
          </div>
          {permissoes.podeExportarDados && (
            <div className="flex gap-2">
              <button
                onClick={exportarParaPDF}
                disabled={profissionais.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FileDown size={18} />
                Exportar PDF
              </button>
              <button
                onClick={exportarParaExcel}
                disabled={profissionais.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={18} />
                Exportar Excel
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria / Tipo de Profissional
              </label>
              <select
                value={categoriaSelecionada}
                onChange={handleCategoriaChange}
                disabled={permissoes.somenteVisualizarAlunos}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {!permissoes.somenteVisualizarAlunos && <option value="Todos">Todos</option>}
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou cargo..."
                  value={busca}
                  onChange={handleBuscaChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {erro ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <p className="text-gray-800 font-medium mb-2">Erro ao carregar profissionais</p>
              <p className="text-gray-600 mb-4">{erro}</p>
              <button
                onClick={carregarProfissionais}
                className="px-4 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : profissionais.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum profissional encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome Completo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">CPF</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoria</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profissionais.map((profissional) => (
                      <tr
                        key={profissional.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          profissional.status === 'inativo' ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-800">{profissional.nome_completo}</div>
                          {profissional.profissao && (
                            <div className="text-sm text-gray-500">{profissional.profissao}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{maskCPF(profissional.cpf)}</td>
                        <td className="py-3 px-4 text-gray-700">{profissional.cargo}</td>
                        <td className="py-3 px-4">{getStatusBadge(profissional.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleVerDetalhes(profissional)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            {podeEditar(profissional) && (
                              <button
                                onClick={() => handleEditar(profissional)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {permissoes.podeAlterarStatusProfissionais && (
                              <button
                                onClick={() => handleSolicitarMudancaStatus(profissional)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                  profissional.status === 'ativo'
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title={profissional.status === 'ativo' ? 'Desativar' : 'Ativar'}
                              >
                                {profissional.status === 'ativo' ? 'Desativar' : 'Ativar'}
                              </button>
                            )}
                            {permissoes.podeExcluirProfissionais && (
                              <button
                                onClick={() => handleSolicitarExclusao(profissional)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      {showDetalhesModal && profissionalSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Detalhes do Profissional</h2>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                  <p className="text-gray-800 mt-1">{profissionalSelecionado.nome_completo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">CPF</label>
                  <p className="text-gray-800 mt-1">{maskCPF(profissionalSelecionado.cpf)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cargo</label>
                  <p className="text-gray-800 mt-1">{profissionalSelecionado.cargo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(profissionalSelecionado.status)}</div>
                </div>
                {profissionalSelecionado.profissao && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Profissão</label>
                    <p className="text-gray-800 mt-1">{profissionalSelecionado.profissao}</p>
                  </div>
                )}
                {profissionalSelecionado.telefone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Telefone</label>
                    <p className="text-gray-800 mt-1">{profissionalSelecionado.telefone}</p>
                  </div>
                )}
                {profissionalSelecionado.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">E-mail</label>
                    <p className="text-gray-800 mt-1">{profissionalSelecionado.email}</p>
                  </div>
                )}
                {profissionalSelecionado.municipio && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Município</label>
                    <p className="text-gray-800 mt-1">{profissionalSelecionado.municipio}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Cadastro</label>
                  <p className="text-gray-800 mt-1">{formatDate(profissionalSelecionado.created_at)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-2">
                {profissionalSelecionado && podeEditar(profissionalSelecionado) && (
                  <button
                    onClick={() => {
                      setShowDetalhesModal(false);
                      handleEditar(profissionalSelecionado);
                    }}
                    className="flex-1 px-4 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors"
                  >
                    Editar Profissional
                  </button>
                )}
                <button
                  onClick={() => setShowDetalhesModal(false)}
                  className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${
                    !(profissionalSelecionado && podeEditar(profissionalSelecionado)) ? 'flex-1' : ''
                  }`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && acaoConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle size={24} className="text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Confirmar Alteração</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Deseja realmente {acaoConfirm.novoStatus === 'ativo' ? 'ativar' : 'desativar'} o profissional{' '}
                <strong>{acaoConfirm.profissional.nome_completo}</strong>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmarMudancaStatus}
                  className="flex-1 px-4 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setAcaoConfirm(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && profissionalParaExcluir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle size={24} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Confirmar Exclusão</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Deseja realmente excluir o profissional{' '}
                <strong>{profissionalParaExcluir.nome_completo}</strong>?
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados deste profissional serão removidos permanentemente.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmarExclusao}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProfissionalParaExcluir(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
