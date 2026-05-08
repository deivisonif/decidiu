import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { ambulatorialAPI } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Enfermeira {
  id: number;
  nome: string;
  cpf: string;
  numero_registro: string;
  especialidade: string;
}

export default function DadosGinecologicos() {
  const navigate = useNavigate();
  const { warning } = useToast();
  const [searchParams] = useSearchParams();
  const pacienteId = searchParams.get('id');
  const modoEdicao = searchParams.get('modo') === 'edicao';
  const [loading, setLoading] = useState(modoEdicao);

  const [formData, setFormData] = useState({
    paridade: '',
    usa_metodo_contraceptivo: '',
    metodo_atual: '',
    metodo_escolhido_atendimento: '',
    elegivel_metodo_escolhido: '',
    elegivel_outro_metodo: '',
    outro_metodo_elegivel: '',
    beta_hcg: '',
    realizou_usg: '',
    citologia: '',
    data_consulta: '',
    enfermeira_responsavel_id: '',
  });

  const [enfermeiras, setEnfermeiras] = useState<Enfermeira[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [enfermeiraSelecionada, setEnfermeiraSelecionada] = useState<Enfermeira | null>(null);

  useEffect(() => {
    const tempData = localStorage.getItem('ambulatorial_temp_paciente');
    if (!tempData) {
      warning('Por favor, preencha os dados de identificação primeiro.');
      navigate('/ambulatorial/cadastrar-paciente');
      return;
    }

    if (modoEdicao && pacienteId) {
      loadDadosGinecologicos();
    }

    buscarEnfermeiras('');
  }, [navigate, modoEdicao, pacienteId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buscarEnfermeiras = async (termo: string) => {
    try {
      const response = await fetch(`/api/ambulatorial/enfermeiras-instrutoras/buscar?termo=${encodeURIComponent(termo)}`);
      const data = await response.json();
      setEnfermeiras(data);
    } catch (error) {
      console.error('Erro ao buscar enfermeiras:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    buscarEnfermeiras(value);
  };

  const handleSelectEnfermeira = (enfermeira: Enfermeira) => {
    setEnfermeiraSelecionada(enfermeira);
    setSearchTerm(enfermeira.nome);
    setFormData({ ...formData, enfermeira_responsavel_id: enfermeira.id.toString() });
    setShowDropdown(false);
  };

  const loadDadosGinecologicos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ambulatorial/dados-ginecologicos/${pacienteId}`);
      const data = await response.json();

      if (data && data.id) {
        setFormData({
          paridade: data.paridade || '',
          usa_metodo_contraceptivo: data.usa_metodo_contraceptivo || '',
          metodo_atual: data.qual_metodo_contraceptivo || '',
          metodo_escolhido_atendimento: data.metodo_escolhido || '',
          elegivel_metodo_escolhido: data.elegivel_metodo_escolhido || '',
          elegivel_outro_metodo: data.elegivel_outro_metodo || '',
          outro_metodo_elegivel: data.metodo_escolhido_outro || '',
          beta_hcg: data.beta_hcg || '',
          realizou_usg: data.realizou_usg || '',
          citologia: data.citologia || '',
          data_consulta: data.data_consulta || '',
          enfermeira_responsavel_id: data.enfermeira_responsavel_id || '',
        });

        if (data.enfermeira_responsavel_id) {
          try {
            const enfermeiraResponse = await fetch(`/api/ambulatorial/enfermeiras-instrutoras/${data.enfermeira_responsavel_id}`);
            const enfermeiraData = await enfermeiraResponse.json();
            if (enfermeiraData) {
              setEnfermeiraSelecionada(enfermeiraData);
              setSearchTerm(enfermeiraData.nome);
            }
          } catch (error) {
            console.error('Erro ao carregar enfermeira responsável:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados ginecológicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };

    if (name === 'usa_metodo_contraceptivo' && value === 'Não') {
      updatedFormData.metodo_atual = '';
      updatedFormData.metodo_escolhido_atendimento = '';
      updatedFormData.elegivel_metodo_escolhido = '';
      updatedFormData.elegivel_outro_metodo = '';
      updatedFormData.outro_metodo_elegivel = '';
    }

    if (name === 'elegivel_metodo_escolhido' && value === 'Sim') {
      updatedFormData.elegivel_outro_metodo = '';
      updatedFormData.outro_metodo_elegivel = '';
    }

    if (name === 'elegivel_outro_metodo' && value === 'Não') {
      updatedFormData.outro_metodo_elegivel = '';
    }

    setFormData(updatedFormData);
  };

  const handleSaveAndNext = () => {
    if (!formData.enfermeira_responsavel_id) {
      warning('Por favor, selecione o(a) Enfermeiro(a) Responsável pela Inserção.');
      return;
    }

    if (!formData.beta_hcg) {
      warning('Por favor, informe o resultado do Beta HCG.');
      return;
    }

    if (!formData.realizou_usg) {
      warning('Por favor, informe se realizou USG.');
      return;
    }

    if (!formData.citologia) {
      warning('Por favor, informe se realizou Citologia.');
      return;
    }

    if (!formData.data_consulta) {
      warning('Por favor, informe a data da consulta.');
      return;
    }

    if (formData.usa_metodo_contraceptivo === 'Sim') {
      if (!formData.metodo_atual) {
        warning('Por favor, informe qual método contraceptivo você utiliza atualmente.');
        return;
      }
      if (!formData.metodo_escolhido_atendimento) {
        warning('Por favor, selecione qual método contraceptivo foi escolhido neste atendimento.');
        return;
      }
      if (!formData.elegivel_metodo_escolhido) {
        warning('Por favor, informe se a paciente está elegível ao método escolhido.');
        return;
      }
      if (formData.elegivel_metodo_escolhido === 'Não') {
        if (!formData.elegivel_outro_metodo) {
          warning('Por favor, informe se a paciente está elegível a outro método.');
          return;
        }
        if (formData.elegivel_outro_metodo === 'Sim' && !formData.outro_metodo_elegivel) {
          warning('Por favor, informe qual outro método é elegível.');
          return;
        }
      }
    }

    localStorage.setItem('ambulatorial_temp_ginecologico', JSON.stringify(formData));
    if (modoEdicao && pacienteId) {
      navigate(`/ambulatorial/cadastrar-paciente/consultas?id=${pacienteId}&modo=edicao`);
    } else {
      navigate('/ambulatorial/cadastrar-paciente/consultas');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">Carregando dados ginecológicos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        {modoEdicao ? 'Editar' : 'Ficha da'} Paciente - Ambulatorial
      </h1>
      <h2 className="text-xl text-gray-600 mb-8">Dados Ginecológicos/Obstétricos</h2>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form className="space-y-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsável pela Inserção <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Digite o nome ou CPF do(a) responsável pela inserção..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>

              {showDropdown && enfermeiras.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {enfermeiras.map((enfermeira) => (
                    <div
                      key={enfermeira.id}
                      onClick={() => handleSelectEnfermeira(enfermeira)}
                      className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{enfermeira.nome}</div>
                      <div className="text-sm text-gray-600">
                        CPF: {enfermeira.cpf} | Registro: {enfermeira.numero_registro || 'N/A'}
                      </div>
                      {enfermeira.especialidade && (
                        <div className="text-xs text-gray-500 mt-1">{enfermeira.especialidade}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {enfermeiraSelecionada && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-sm text-green-800">
                    <span className="font-medium">Selecionado(a):</span>
                    <span className="ml-2">{enfermeiraSelecionada.nome}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paridade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="paridade"
                value={formData.paridade}
                onChange={handleInputChange}
                placeholder="Número de Gestações"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usa método contraceptivo? <span className="text-red-500">*</span>
              </label>
              <select
                name="usa_metodo_contraceptivo"
                value={formData.usa_metodo_contraceptivo}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>

          {formData.usa_metodo_contraceptivo === 'Sim' && (
            <>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qual método contraceptivo você utiliza atualmente? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="metodo_atual"
                    value={formData.metodo_atual}
                    onChange={handleInputChange}
                    placeholder="Ex: Pílula, DIU, Injeção, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qual método contraceptivo foi escolhido neste atendimento? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="metodo_escolhido_atendimento"
                    value={formData.metodo_escolhido_atendimento}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="DIU">DIU</option>
                    <option value="Implanon">Implanon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    A paciente está elegível ao método escolhido? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="elegivel_metodo_escolhido"
                    value={formData.elegivel_metodo_escolhido}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>

              {formData.elegivel_metodo_escolhido === 'Não' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      A paciente está elegível a outro método? <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="elegivel_outro_metodo"
                      value={formData.elegivel_outro_metodo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>

                  {formData.elegivel_outro_metodo === 'Sim' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qual outro método é elegível? <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="outro_metodo_elegivel"
                        value={formData.outro_metodo_elegivel}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                      >
                        <option value="">Selecione</option>
                        <option value="DIU">DIU</option>
                        <option value="Implanon">Implanon</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beta HCG <span className="text-red-500">*</span>
              </label>
              <select
                name="beta_hcg"
                value={formData.beta_hcg}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="Positivo">Positivo</option>
                <option value="Negativo">Negativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Realizou USG? <span className="text-red-500">*</span>
              </label>
              <select
                name="realizou_usg"
                value={formData.realizou_usg}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Citologia <span className="text-red-500">*</span>
              </label>
              <select
                name="citologia"
                value={formData.citologia}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da consulta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data_consulta"
              value={formData.data_consulta}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => navigate(modoEdicao && pacienteId ? `/ambulatorial/cadastrar-paciente?id=${pacienteId}&modo=edicao` : '/ambulatorial/cadastrar-paciente')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Salvar Dados
            </button>
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors flex items-center gap-2"
            >
              Próxima Página
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
