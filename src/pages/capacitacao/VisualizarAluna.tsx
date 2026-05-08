import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Trash2, FileText, CheckCircle, Clock, X, User } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { maskCPF } from '../../utils/masks';
import { useToast } from '../../contexts/ToastContext';

interface Aluna {
  id: number;
  nome: string;
  cpf: string;
  coren: string;
  telefone: string;
  email: string;
  municipio: string;
  instrutora_nome: string;
  total_fichas: number;
  progresso: number;
  status: string;
  certificado_filename?: string;
  certificado_content?: string;
}

interface Ficha {
  id: number;
  nome_arquivo: string;
  nome_paciente: string;
  cpf_paciente: string;
  data_nascimento_paciente: string;
  municipio_paciente: string;
  data_anexacao: string;
}

export default function VisualizarAluna() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError, warning, confirm } = useToast();
  const [aluna, setAluna] = useState<Aluna | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pacienteData, setPacienteData] = useState({
    nome_paciente: '',
    cpf_paciente: '',
    data_nascimento_paciente: '',
    municipio_paciente: '',
    metodo_inserido: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [alunaData, fichasData] = await Promise.all([
        capacitacaoAPI.getEnfermeiraAluna(id!),
        capacitacaoAPI.getFichas(id!)
      ]);
      setAluna(alunaData);
      setFichas(fichasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      warning('Por favor, selecione apenas arquivos PDF.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowModal(true);
    event.target.value = '';
  };

  const handlePacienteDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cpf_paciente') {
      finalValue = maskCPF(value);
    }

    setPacienteData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmitFicha = async () => {
    if (!selectedFile) return;

    if (!pacienteData.nome_paciente || !pacienteData.cpf_paciente ||
        !pacienteData.data_nascimento_paciente || !pacienteData.municipio_paciente ||
        !pacienteData.metodo_inserido) {
      warning('Todos os campos são obrigatórios.');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await capacitacaoAPI.uploadFicha(id!, {
              nome_arquivo: selectedFile.name,
              pdf_content: base64,
              ...pacienteData
            });
            resolve(true);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await loadData();
      setShowModal(false);
      setSelectedFile(null);
      setPacienteData({
        nome_paciente: '',
        cpf_paciente: '',
        data_nascimento_paciente: '',
        municipio_paciente: '',
        metodo_inserido: ''
      });
      success('Ficha anexada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao anexar ficha:', error);
      toastError(error.message || 'Erro ao anexar ficha. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    if (!uploading) {
      setShowModal(false);
      setSelectedFile(null);
      setPacienteData({
        nome_paciente: '',
        cpf_paciente: '',
        data_nascimento_paciente: '',
        municipio_paciente: '',
        metodo_inserido: ''
      });
    }
  };

  const handleDownload = async (fichaId: number, nomeArquivo: string) => {
    try {
      const ficha = await capacitacaoAPI.getFicha(id!, fichaId.toString());
      const byteCharacters = atob(ficha.pdf_content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar ficha:', error);
      toastError('Erro ao baixar ficha.');
    }
  };

  const handleDelete = async (fichaId: number) => {
    const confirmado = await confirm('Deseja realmente remover esta ficha?');
    if (!confirmado) return;

    try {
      await capacitacaoAPI.deleteFicha(id!, fichaId.toString());
      await loadData();
      success('Ficha removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover ficha:', error);
      toastError('Erro ao remover ficha.');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  const handleDownloadCertificado = () => {
    if (!aluna?.certificado_content) return;

    try {
      const byteCharacters = atob(aluna.certificado_content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = aluna.certificado_filename || 'certificado.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toastError('Erro ao baixar certificado.');
    }
  };

  if (!aluna) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Aluno(a) não encontrado(a)</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/capacitacao/alunas')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{aluna.nome}</h1>
            <p className="text-gray-600 mt-1">CPF: {aluna.cpf}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              aluna.status === 'Concluído'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {aluna.status === 'Concluído' ? (
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Concluído
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  Incompleto
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">COREN</label>
            <p className="text-gray-900">{aluna.coren || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Município</label>
            <p className="text-gray-900">{aluna.municipio || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <p className="text-gray-900">{aluna.telefone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{aluna.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrutor(a)</label>
            <p className="text-gray-900">{aluna.instrutora_nome || '-'}</p>
          </div>
          {aluna.certificado_filename && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificado</label>
              <button
                onClick={handleDownloadCertificado}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Download size={16} />
                {aluna.certificado_filename}
              </button>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Progresso ({aluna.total_fichas}/10 fichas)
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  aluna.progresso >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${aluna.progresso}%` }}
              ></div>
            </div>
            <span className="text-lg font-bold text-gray-700 min-w-[4rem] text-right">
              {aluna.progresso}%
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Fichas de Atendimento (PDF)</h2>
          <label className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer">
            <Upload size={18} />
            Anexar Ficha PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {fichas.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma ficha anexada</p>
            <p className="text-gray-500 text-sm mt-2">
              A aluna precisa de 10 fichas para concluir a capacitação
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fichas.map((ficha) => (
              <div
                key={ficha.id}
                className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText size={20} className="text-red-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{ficha.nome_arquivo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <User size={14} className="text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {ficha.nome_paciente} - CPF: {ficha.cpf_paciente}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Município: {ficha.municipio_paciente} | Nasc: {new Date(ficha.data_nascimento_paciente).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Anexado em {new Date(ficha.data_anexacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(ficha.id, ficha.nome_arquivo)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Baixar"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(ficha.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Dados do Paciente</h3>
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Arquivo selecionado:</strong> {selectedFile?.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do(a) Paciente *
                  </label>
                  <input
                    type="text"
                    name="nome_paciente"
                    value={pacienteData.nome_paciente}
                    onChange={handlePacienteDataChange}
                    disabled={uploading}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF do(a) Paciente *
                  </label>
                  <input
                    type="text"
                    name="cpf_paciente"
                    value={pacienteData.cpf_paciente}
                    onChange={handlePacienteDataChange}
                    disabled={uploading}
                    required
                    maxLength={14}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    name="data_nascimento_paciente"
                    value={pacienteData.data_nascimento_paciente}
                    onChange={handlePacienteDataChange}
                    disabled={uploading}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Município *
                  </label>
                  <input
                    type="text"
                    name="municipio_paciente"
                    value={pacienteData.municipio_paciente}
                    onChange={handlePacienteDataChange}
                    disabled={uploading}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método Inserido *
                  </label>
                  <select
                    name="metodo_inserido"
                    value={pacienteData.metodo_inserido}
                    onChange={handlePacienteDataChange}
                    disabled={uploading}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="DIU">DIU</option>
                    <option value="Implanon">Implanon</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitFicha}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400"
              >
                {uploading ? 'Anexando...' : 'Anexar Ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
