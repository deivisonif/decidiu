import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

export default function RegistrarAtendimento() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const { id } = useParams();
  const [paciente, setPaciente] = useState<any>(null);
  const [enfermeirasAlunas, setEnfermeirasAlunas] = useState<any[]>([]);
  const [searchEnfermeira, setSearchEnfermeira] = useState('');
  const [showEnfermeiraDropdown, setShowEnfermeiraDropdown] = useState(false);
  const [formData, setFormData] = useState({
    paridade: '',
    uso_contraceptivo: 'Não',
    metodo_atual: '',
    metodo_escolhido: '',
    metodo_escolhido_atendimento: '',
    elegivel_metodo_escolhido: '',
    elegivel_outro_metodo: '',
    outro_metodo_elegivel: '',
    citologia: '',
    realizou_usg: '',
    beta_hcg: '',
    data_consulta: new Date().toISOString().split('T')[0],
    enfermeira_aluna_id: null as number | null,
    enfermeira_aluna_nome: ''
  });

  useEffect(() => {
    loadPaciente();
    loadDadosGinecologicos();
    loadEnfermeirasAlunas();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.enfermeira-autocomplete')) {
        setShowEnfermeiraDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPaciente = async () => {
    try {
      const data = await capacitacaoAPI.getPaciente(id!);
      setPaciente(data);
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
    }
  };

  const loadEnfermeirasAlunas = async () => {
    try {
      const data = await capacitacaoAPI.getEnfermeirasAlunas();
      setEnfermeirasAlunas(data);
    } catch (error) {
      console.error('Erro ao carregar enfermeiras alunas:', error);
    }
  };

  const loadDadosGinecologicos = async () => {
    try {
      const response = await fetch(`/api/capacitacao/pacientes/${id}/dados-ginecologicos`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setFormData({
            paridade: data.paridade || '',
            uso_contraceptivo: data.uso_contraceptivo || 'Não',
            metodo_atual: data.qual_metodo_contraceptivo || '',
            metodo_escolhido: data.metodo_escolhido || '',
            metodo_escolhido_atendimento: data.metodo_escolhido_atendimento || '',
            elegivel_metodo_escolhido: data.elegivel_metodo || '',
            elegivel_outro_metodo: data.elegivel_outro_metodo || '',
            outro_metodo_elegivel: data.elegivel_metodo_escolha || '',
            citologia: data.citologia || '',
            realizou_usg: data.usb || '',
            beta_hcg: data.beta_hcg || '',
            data_consulta: data.data_consulta || new Date().toISOString().split('T')[0],
            enfermeira_aluna_id: data.enfermeira_aluna_id || null,
            enfermeira_aluna_nome: ''
          });

          // Se tem enfermeira_aluna_id, buscar o nome
          if (data.enfermeira_aluna_id) {
            const enfermeirasData = await capacitacaoAPI.getEnfermeirasAlunas();
            const enfermeira = enfermeirasData.find((e: any) => e.id === data.enfermeira_aluna_id);
            if (enfermeira) {
              setFormData(prev => ({ ...prev, enfermeira_aluna_nome: enfermeira.nome }));
              setSearchEnfermeira(enfermeira.nome);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados ginecológicos:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };

    if (name === 'uso_contraceptivo' && value === 'Não') {
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

  const handleEnfermeiraSearch = (value: string) => {
    setSearchEnfermeira(value);
    setShowEnfermeiraDropdown(true);
    if (!value) {
      setFormData({ ...formData, enfermeira_aluna_id: null, enfermeira_aluna_nome: '' });
    }
  };

  const handleSelectEnfermeira = (enfermeira: any) => {
    setFormData({
      ...formData,
      enfermeira_aluna_id: enfermeira.id,
      enfermeira_aluna_nome: enfermeira.nome
    });
    setSearchEnfermeira(enfermeira.nome);
    setShowEnfermeiraDropdown(false);
  };

  const filteredEnfermeiras = enfermeirasAlunas.filter((enfermeira) => {
    const search = searchEnfermeira.toLowerCase();
    return (
      enfermeira.nome?.toLowerCase().includes(search) ||
      enfermeira.cpf?.includes(search)
    );
  });

  const handleSave = async () => {
    if (!formData.enfermeira_aluna_id) {
      warning('Por favor, selecione a Enfermeira Aluna responsável pelo atendimento.');
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

    if (!formData.metodo_escolhido) {
      warning('Por favor, selecione o método escolhido.');
      return;
    }

    if (formData.uso_contraceptivo === 'Sim') {
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

    try {
      const dataToSend = {
        ...formData,
        qual_metodo_contraceptivo: formData.metodo_atual,
        usb: formData.realizou_usg
      };

      const response = await fetch(`/api/capacitacao/pacientes/${id}/dados-ginecologicos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        success('Atendimento registrado com sucesso!');
        navigate(`/capacitacao/pacientes/${id}/prontuario`);
      } else {
        const error = await response.json();
        toastError(`Erro ao salvar: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar atendimento:', error);
      toastError('Erro ao salvar atendimento');
    }
  };

  if (!paciente) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(`/capacitacao/pacientes/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Registrar Atendimento - {paciente.nome_completo}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6">Dados Ginecológicos/Obstétricos</h2>

          {/* Campo de Enfermeira Aluna Responsável */}
          <div className="mb-6 relative enfermeira-autocomplete">
            <label className="block text-sm mb-1 font-medium">
              Enfermeira Aluna Responsável <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchEnfermeira}
              onChange={(e) => handleEnfermeiraSearch(e.target.value)}
              onFocus={() => setShowEnfermeiraDropdown(true)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {showEnfermeiraDropdown && filteredEnfermeiras.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                {filteredEnfermeiras.map((enfermeira) => (
                  <div
                    key={enfermeira.id}
                    onClick={() => handleSelectEnfermeira(enfermeira)}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="font-medium">{enfermeira.nome}</div>
                    <div className="text-sm text-gray-600">CPF: {enfermeira.cpf}</div>
                  </div>
                ))}
              </div>
            )}
            {formData.enfermeira_aluna_id && (
              <div className="mt-2 text-sm text-green-700 flex items-center gap-2">
                <span className="font-medium">✓ Selecionada:</span> {formData.enfermeira_aluna_nome}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">
                Paridade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="paridade"
                value={formData.paridade}
                onChange={handleInputChange}
                placeholder="Número de Gestações"
                className="w-full border border-gray-300 rounded px-3 py-2"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Usa método contraceptivo? <span className="text-red-500">*</span>
              </label>
              <select
                name="uso_contraceptivo"
                value={formData.uso_contraceptivo}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">
                Método Escolhido <span className="text-red-500">*</span>
              </label>
              <select
                name="metodo_escolhido"
                value={formData.metodo_escolhido}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Selecione</option>
                <option value="DIU">DIU</option>
                <option value="Implanon">Implanon</option>
              </select>
            </div>

            {formData.uso_contraceptivo === 'Sim' && (
              <>
                <div>
                  <label className="block text-sm mb-1">
                    Qual método contraceptivo você utiliza atualmente? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="metodo_atual"
                    value={formData.metodo_atual}
                    onChange={handleInputChange}
                    placeholder="Ex: Pílula, DIU, Injeção, etc."
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    Qual método contraceptivo foi escolhido neste atendimento? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="metodo_escolhido_atendimento"
                    value={formData.metodo_escolhido_atendimento}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Selecione</option>
                    <option value="DIU">DIU</option>
                    <option value="Implanon">Implanon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    A paciente está elegível ao método escolhido? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="elegivel_metodo_escolhido"
                    value={formData.elegivel_metodo_escolhido}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                {formData.elegivel_metodo_escolhido === 'Não' && (
                  <>
                    <div>
                      <label className="block text-sm mb-1">
                        A paciente está elegível a outro método? <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="elegivel_outro_metodo"
                        value={formData.elegivel_outro_metodo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="">Selecione</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>

                    {formData.elegivel_outro_metodo === 'Sim' && (
                      <div>
                        <label className="block text-sm mb-1">
                          Qual outro método é elegível? <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="outro_metodo_elegivel"
                          value={formData.outro_metodo_elegivel}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          <option value="DIU">DIU</option>
                          <option value="Implanon">Implanon</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-sm mb-1">
                Citologia <span className="text-red-500">*</span>
              </label>
              <select
                name="citologia"
                value={formData.citologia}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">
                Realizou USG? <span className="text-red-500">*</span>
              </label>
              <select
                name="realizou_usg"
                value={formData.realizou_usg}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">
                Beta HCG <span className="text-red-500">*</span>
              </label>
              <select
                name="beta_hcg"
                value={formData.beta_hcg}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Selecione</option>
                <option value="Positivo">Positivo</option>
                <option value="Negativo">Negativo</option>
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm mb-1">Data da Consulta <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="data_consulta"
                value={formData.data_consulta}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Save size={20} />
              Salvar Atendimento
            </button>

            <button
              onClick={() => navigate(`/capacitacao/pacientes/${id}/prontuario`)}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Ver Prontuário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
