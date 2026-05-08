import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, Calendar, Activity, Printer, Download, X } from 'lucide-react';
import { capacitacaoAPI, gestaoAPI } from '../../lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '../../contexts/ToastContext';

interface Paciente {
  id: string;
  nome_completo: string;
  cpf: string;
  cartao_sus: string;
  data_nascimento: string;
  estado_civil: string;
  municipio: string;
  raca_cor: string;
  celular: string;
  escolaridade: string;
  etnia: string;
  possui_comorbidade: string;
  qual_comorbidade: string;
  qual_comorbidade_especifique: string;
  renda_mensal: string;
  renec_cartao_cria: string;
  quantidade_componentes_familia: string;
  tipo_familia: string;
  tipo_familia_outro: string;
  cep: string;
  municipio_endereco: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
}

interface DadosGinecologicos {
  paridade: number;
  uso_contraceptivo: string;
  qual_metodo_contraceptivo: string;
  citologia: string;
  usb: string;
  beta_hcg: string;
  metodo_escolhido: string;
  elegivel_metodo: string;
  elegivel_metodo_escolha: string;
  data_consulta: string;
  enfermeira_aluna_id?: number;
  enfermeira_aluna_nome?: string;
}

interface Consulta {
  id: string;
  data_consulta: string;
  houve_insercao: string;
  houve_intercorrencia: string;
  qual_intercorrencia: string;
  observacoes: string;
  created_at: string;
}

interface InsercaoDiu {
  id: string;
  data_insercao: string;
  tipo_diu: string;
  observacoes: string;
  enfermeira_instrutora: { nome: string } | null;
  enfermeira_aluna: { nome: string } | null;
}

export default function ProntuarioPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [dadosGinecologicos, setDadosGinecologicos] = useState<DadosGinecologicos | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [insercoes, setInsercoes] = useState<InsercaoDiu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadProntuario();
    }
  }, [id]);

  const loadProntuario = async () => {
    try {
      const data = await capacitacaoAPI.getPaciente(id!);
      setPaciente(data);
      setDadosGinecologicos(data.dados_ginecologicos);
      setConsultas(data.consultas || []);
      setInsercoes(data.insercoes || []);
    } catch (error) {
      console.error('Erro ao carregar prontuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const styles = `
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #2d7a4f;
              font-size: 24px;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #2d7a4f;
            }
            h2 {
              color: #2d7a4f;
              font-size: 18px;
              margin-top: 20px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            h3 {
              color: #555;
              font-size: 14px;
              margin-top: 15px;
              margin-bottom: 10px;
              font-weight: 600;
            }
            .section {
              background: #fff;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .field {
              margin-bottom: 10px;
            }
            .label {
              font-size: 12px;
              font-weight: 600;
              color: #666;
              margin-bottom: 4px;
            }
            .value {
              font-size: 14px;
              color: #000;
            }
            .history-item {
              border-left: 4px solid #2d7a4f;
              padding-left: 15px;
              margin-bottom: 15px;
              padding-bottom: 10px;
            }
            .history-item-blue {
              border-left-color: #3b82f6;
            }
            .history-date {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .history-details {
              font-size: 12px;
              color: #666;
              line-height: 1.6;
            }
            @media print {
              body {
                padding: 10px;
              }
              .section {
                page-break-inside: avoid;
              }
            }
          </style>
        `;

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Prontuário - ${paciente?.nome_completo}</title>
              ${styles}
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        gestaoAPI.registrarLogAuditoria({
          acao: 'impressao_prontuario',
          descricao: `Impressão de prontuário do paciente ${paciente?.nome_completo || id}`,
          modulo: 'Capacitação',
          tabela_afetada: 'pacientes_capacitacao',
          registro_id: id,
        }).catch(() => {});
      }
    }
    setShowPrintModal(false);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      const nomeArquivo = `Prontuario_${paciente?.nome_completo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      gestaoAPI.registrarLogAuditoria({
        acao: 'exportacao_pdf',
        descricao: `Exportação PDF de prontuário: ${paciente?.nome_completo || id}`,
        modulo: 'Capacitação',
        tabela_afetada: 'pacientes_capacitacao',
        registro_id: id,
      }).catch(() => {});
      pdf.save(nomeArquivo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toastError('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
      setShowPrintModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="p-8">
        <div className="text-center">Paciente não encontrado</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/capacitacao/pacientes')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Prontuário do Paciente</h1>
        </div>
        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Printer size={20} />
          Imprimir Prontuário
        </button>
      </div>

      <div ref={printRef} className="space-y-6">
        <div style={{ display: 'none' }} className="print-only">
          <h1 style={{ color: '#2d7a4f', fontSize: '24px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #2d7a4f' }}>
            Prontuário do Paciente
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 section">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-[#2d7a4f]" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Dados Pessoais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nome Completo</label>
              <p className="text-gray-900">{paciente.nome_completo || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">CPF</label>
              <p className="text-gray-900">{paciente.cpf || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Cartão SUS</label>
              <p className="text-gray-900">{paciente.cartao_sus || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
              <p className="text-gray-900">
                {paciente.data_nascimento
                  ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Estado Civil</label>
              <p className="text-gray-900">{paciente.estado_civil || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Município</label>
              <p className="text-gray-900">{paciente.municipio || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Raça/Cor</label>
              <p className="text-gray-900">{paciente.raca_cor || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Celular</label>
              <p className="text-gray-900">{paciente.celular || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Escolaridade</label>
              <p className="text-gray-900">{paciente.escolaridade || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Etnia</label>
              <p className="text-gray-900">{paciente.etnia || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Possui Comorbidade?</label>
              <p className="text-gray-900">{paciente.possui_comorbidade || '-'}</p>
            </div>
            {paciente.possui_comorbidade === 'Sim' && (
              <div>
                <label className="text-sm font-medium text-gray-600">Qual Comorbidade?</label>
                <p className="text-gray-900">
                  {paciente.qual_comorbidade === 'Outros' && paciente.qual_comorbidade_especifique
                    ? paciente.qual_comorbidade_especifique
                    : paciente.qual_comorbidade || '-'}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Renda Mensal Familiar</label>
              <p className="text-gray-900">{paciente.renda_mensal || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Recebe o Cartão CRIA?</label>
              <p className="text-gray-900">{paciente.renec_cartao_cria || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Quantidade de componentes da família</label>
              <p className="text-gray-900">{paciente.quantidade_componentes_familia || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo de Família</label>
              <p className="text-gray-900">
                {paciente.tipo_familia === 'Outro' && paciente.tipo_familia_outro
                  ? paciente.tipo_familia_outro
                  : paciente.tipo_familia || '-'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">CEP</label>
                <p className="text-gray-900">{paciente.cep || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Município</label>
                <p className="text-gray-900">{paciente.municipio_endereco || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Bairro</label>
                <p className="text-gray-900">{paciente.bairro || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Logradouro</label>
                <p className="text-gray-900">{paciente.logradouro || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Número</label>
                <p className="text-gray-900">{paciente.numero || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {dadosGinecologicos && (
          <div className="bg-white rounded-lg shadow-md p-6 section">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-[#2d7a4f]" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">Dados Ginecológicos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Paridade</label>
                <p className="text-gray-900">{dadosGinecologicos.paridade || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Uso de Contraceptivo</label>
                <p className="text-gray-900">{dadosGinecologicos.uso_contraceptivo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Método Contraceptivo</label>
                <p className="text-gray-900">{dadosGinecologicos.qual_metodo_contraceptivo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Citologia</label>
                <p className="text-gray-900">{dadosGinecologicos.citologia || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">USB</label>
                <p className="text-gray-900">{dadosGinecologicos.usb || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Beta HCG</label>
                <p className="text-gray-900">{dadosGinecologicos.beta_hcg || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Método Escolhido</label>
                <p className="text-gray-900">{dadosGinecologicos.metodo_escolhido || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Data da Consulta</label>
                <p className="text-gray-900">{dadosGinecologicos.data_consulta ? new Date(dadosGinecologicos.data_consulta).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              {dadosGinecologicos.enfermeira_aluna_nome && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-green-50 p-3 rounded border border-green-200">
                  <label className="text-sm font-medium text-green-800">Enfermeira Aluna Responsável</label>
                  <p className="text-green-900 font-semibold">{dadosGinecologicos.enfermeira_aluna_nome}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {insercoes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 section">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-[#2d7a4f]" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">Inserções de DIU</h2>
            </div>
            <div className="space-y-4">
              {insercoes.map((insercao) => (
                <div key={insercao.id} className="border-l-4 border-[#2d7a4f] pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      {new Date(insercao.data_insercao).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-sm text-gray-600">- {insercao.tipo_diu || 'Tipo não informado'}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {insercao.enfermeira_instrutora && (
                      <p>Instrutora: {insercao.enfermeira_instrutora.nome}</p>
                    )}
                    {insercao.enfermeira_aluna && (
                      <p>Aluna: {insercao.enfermeira_aluna.nome}</p>
                    )}
                    {insercao.observacoes && <p>Observações: {insercao.observacoes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {consultas.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 section">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-[#2d7a4f]" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">Histórico de Consultas</h2>
            </div>
            <div className="space-y-4">
              {consultas.map((consulta) => (
                <div key={consulta.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      {new Date(consulta.data_consulta).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Inserção: {consulta.houve_insercao || '-'}</p>
                    <p>Intercorrência: {consulta.houve_intercorrencia || '-'}</p>
                    {consulta.qual_intercorrencia && (
                      <p>Detalhes da Intercorrência: {consulta.qual_intercorrencia}</p>
                    )}
                    {consulta.observacoes && (
                      <p>Observações: {consulta.observacoes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Imprimir Prontuário</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Escolha como deseja obter o prontuário do paciente:
            </p>
            <div className="space-y-3">
              <button
                onClick={handlePrint}
                disabled={generating}
                className="w-full flex items-center justify-center gap-3 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={20} />
                Imprimir Diretamente
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                {generating ? 'Gerando PDF...' : 'Baixar em PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
