import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Check, Plus, CheckCircle, ArrowLeft } from 'lucide-react';
import { ambulatorialAPI } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Consulta {
  id?: number;
  data_consulta: string;
  houve_insercao: string;
  tipo_insercao: string;
  tipo_insercao_outro: string;
  nova_intercorrencia: string;
  qual_intercorrencia: string;
  observacoes: string;
  houve_retirada: string;
  metodo_retirado: string;
  motivo_retirada: string;
}

export default function Consultas() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const { id } = useParams<{ id: string }>();
  const isViewMode = !!id;

  const getDataHoraAtual = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [paciente, setPaciente] = useState<any>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([
    {
      data_consulta: getDataHoraAtual(),
      houve_insercao: '',
      tipo_insercao: '',
      tipo_insercao_outro: '',
      nova_intercorrencia: '',
      qual_intercorrencia: '',
      observacoes: '',
      houve_retirada: '',
      metodo_retirado: '',
      motivo_retirada: '',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedConsultaIndex, setSavedConsultaIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isViewMode && id) {
      loadPacienteEConsultas();
    } else {
      const tempData = localStorage.getItem('ambulatorial_temp_paciente');
      const tempGinecologico = localStorage.getItem('ambulatorial_temp_ginecologico');

      if (!tempData || !tempGinecologico) {
        warning('Por favor, preencha os dados anteriores primeiro.');
        navigate('/ambulatorial/cadastrar-paciente');
      }
    }
  }, [id, isViewMode, navigate]);

  const loadPacienteEConsultas = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const pacienteData = await ambulatorialAPI.getPaciente(id);
      setPaciente(pacienteData);

      const consultasData = await ambulatorialAPI.getConsultas(id);

      if (consultasData && consultasData.length > 0) {
        setConsultas(consultasData.map((c: any) => ({
          id: c.id,
          data_consulta: c.data_consulta ? c.data_consulta.split('T')[0] : getDataHoraAtual(),
          houve_insercao: c.houve_insercao || '',
          tipo_insercao: c.tipo_insercao || '',
          tipo_insercao_outro: c.tipo_insercao_outro || '',
          nova_intercorrencia: c.nova_intercorrencia || '',
          qual_intercorrencia: c.qual_intercorrencia || '',
          observacoes: c.observacoes || '',
          houve_retirada: c.houve_retirada || '',
          metodo_retirado: c.metodo_retirado || '',
          motivo_retirada: c.motivo_retirada || '',
        })));
      } else {
        setConsultas([
          {
            data_consulta: getDataHoraAtual(),
            houve_insercao: '',
            tipo_insercao: '',
            tipo_insercao_outro: '',
            nova_intercorrencia: '',
            qual_intercorrencia: '',
            observacoes: '',
            houve_retirada: '',
            metodo_retirado: '',
            motivo_retirada: '',
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toastError('Erro ao carregar dados da paciente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, field: keyof Consulta, value: string) => {
    const newConsultas = [...consultas];
    newConsultas[index][field] = value;
    setConsultas(newConsultas);
  };

  const addConsulta = () => {
    setConsultas([
      ...consultas,
      {
        data_consulta: getDataHoraAtual(),
        houve_insercao: '',
        tipo_insercao: '',
        tipo_insercao_outro: '',
        nova_intercorrencia: '',
        qual_intercorrencia: '',
        observacoes: '',
        houve_retirada: '',
        metodo_retirado: '',
        motivo_retirada: '',
      },
    ]);
  };

  const verificarInsercaoAtiva = (currentIndex: number): boolean => {
    for (let i = 0; i < consultas.length; i++) {
      if (i !== currentIndex) {
        const consulta = consultas[i];
        if (consulta.houve_insercao === 'Sim' && consulta.houve_retirada !== 'Sim') {
          return true;
        }
      }
    }
    return false;
  };

  const obterMetodoInsercaoAtiva = (): string => {
    for (const consulta of consultas) {
      if (consulta.houve_insercao === 'Sim' && consulta.houve_retirada !== 'Sim') {
        return consulta.tipo_insercao;
      }
    }
    return '';
  };

  const validateConsulta = (consulta: Consulta): string[] => {
    const errors: string[] = [];

    if (!consulta.data_consulta) {
      errors.push('Data da Consulta');
    }
    if (!consulta.houve_insercao) {
      errors.push('Houve inserção?');
    }
    if (consulta.houve_insercao === 'Sim') {
      if (!consulta.tipo_insercao) {
        errors.push('Qual foi a inserção?');
      }
    }
    if (!consulta.nova_intercorrencia) {
      errors.push('Intercorrência?');
    }
    if (consulta.nova_intercorrencia === 'Sim' && !consulta.qual_intercorrencia) {
      errors.push('Qual a Intercorrência?');
    }
    if (consulta.houve_retirada === 'Sim') {
      if (!consulta.metodo_retirado) {
        errors.push('Método retirado');
      }
      if (!consulta.motivo_retirada) {
        errors.push('Motivo da retirada');
      }
    }

    return errors;
  };

  const handleSaveConsulta = async (index: number) => {
    const consulta = consultas[index];
    const errors = validateConsulta(consulta);

    if (errors.length > 0) {
      warning(`Por favor, preencha os seguintes campos obrigatórios: ${errors.join(', ')}`);
      return;
    }

    if (isViewMode && id) {
      try {
        setLoading(true);
        await ambulatorialAPI.createConsulta(id, consulta);
        setSavedConsultaIndex(index);
        setShowSuccess(true);
        await loadPacienteEConsultas();
      } catch (error: any) {
        console.error('Erro ao salvar consulta:', error);
        toastError(error.message || 'Erro ao salvar consulta.');
      } finally {
        setLoading(false);
      }
    } else {
      setSavedConsultaIndex(index);
      setShowSuccess(true);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSavedConsultaIndex(null);
  };

  const handleFinalizar = async () => {
    if (submittingRef.current) return;

    if (isViewMode) {
      navigate('/ambulatorial/retorno-paciente');
      return;
    }

    const tempPaciente = localStorage.getItem('ambulatorial_temp_paciente');
    const tempGinecologico = localStorage.getItem('ambulatorial_temp_ginecologico');

    if (!tempPaciente || !tempGinecologico) {
      warning('Dados incompletos!');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const pacienteData = JSON.parse(tempPaciente);
      const ginecologicoData = JSON.parse(tempGinecologico);

      const responsePaciente = await fetch('/api/ambulatorial/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacienteData),
      });

      const resultPaciente = await responsePaciente.json();

      if (!responsePaciente.ok) {
        throw new Error(resultPaciente.error || 'Erro ao cadastrar paciente');
      }

      const pacienteId = resultPaciente.paciente_id;

      const responseGinecologico = await fetch('/api/ambulatorial/dados-ginecologicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ginecologicoData, paciente_id: pacienteId }),
      });

      if (!responseGinecologico.ok) {
        throw new Error('Erro ao cadastrar dados ginecológicos');
      }

      for (const consulta of consultas) {
        if (consulta.data_consulta) {
          await fetch(`/api/ambulatorial/consultas/${pacienteId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consulta),
          });
        }
      }

      localStorage.removeItem('ambulatorial_temp_paciente');
      localStorage.removeItem('ambulatorial_temp_ginecologico');

      success('Paciente cadastrado com sucesso!');
      navigate('/ambulatorial/dashboard');
    } catch (error: any) {
      console.error('Erro ao finalizar cadastro:', error);
      toastError(error.message || 'Erro ao finalizar cadastro. Tente novamente.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Consulta salva com sucesso!</h2>
            <p className="text-gray-600 mb-6">A consulta foi registrada no sistema.</p>
            <button
              onClick={handleCloseSuccess}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors mx-auto"
            >
              <ArrowLeft size={20} />
              Voltar para Consultas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && isViewMode) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isViewMode ? 'Histórico de Consultas' : 'Ficha da Paciente - Ambulatorial'}
          </h1>
          {paciente && (
            <h2 className="text-xl text-gray-600">
              Paciente: {paciente.nome_completo}
            </h2>
          )}
          {!isViewMode && <h2 className="text-xl text-gray-600">Consultas</h2>}
        </div>
        {isViewMode && (
          <button
            onClick={() => navigate('/ambulatorial/retorno-paciente')}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 w-full space-y-6">
        {consultas.map((consulta, index) => (
          <div key={consulta.id || index} className="border border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Consulta {index + 1}
              {consulta.id && <span className="ml-2 text-sm text-gray-500">(ID: {consulta.id})</span>}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Consulta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={consulta.data_consulta}
                    onChange={(e) => handleInputChange(index, 'data_consulta', e.target.value)}
                    disabled={!!consulta.id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Houve inserção? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={consulta.houve_insercao}
                    onChange={(e) => handleInputChange(index, 'houve_insercao', e.target.value)}
                    disabled={verificarInsercaoAtiva(index) || !!consulta.id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                  {verificarInsercaoAtiva(index) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Já existe uma inserção ativa ({obterMetodoInsercaoAtiva()}). Registre a retirada antes de inserir novamente.
                    </p>
                  )}
                </div>

                {consulta.houve_insercao === 'Sim' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qual foi a inserção? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={consulta.tipo_insercao}
                      onChange={(e) => handleInputChange(index, 'tipo_insercao', e.target.value)}
                      disabled={!!consulta.id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Selecione</option>
                      <option value="DIU">DIU</option>
                      <option value="Implanon">Implanon</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intercorrência? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={consulta.nova_intercorrencia}
                    onChange={(e) => handleInputChange(index, 'nova_intercorrencia', e.target.value)}
                    disabled={!!consulta.id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>

              {consulta.nova_intercorrencia === 'Sim' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qual a intercorrência? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={consulta.qual_intercorrencia}
                    onChange={(e) => handleInputChange(index, 'qual_intercorrencia', e.target.value)}
                    placeholder="Descreva a intercorrência"
                    rows={3}
                    disabled={!!consulta.id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Retirada de Método</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retirada do método?
                    </label>
                    <select
                      value={consulta.houve_retirada}
                      onChange={(e) => handleInputChange(index, 'houve_retirada', e.target.value)}
                      disabled={!!consulta.id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>

                  {consulta.houve_retirada === 'Sim' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qual método foi retirado? <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={consulta.metodo_retirado}
                        onChange={(e) => handleInputChange(index, 'metodo_retirado', e.target.value)}
                        disabled={!!consulta.id}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Selecione</option>
                        <option value="DIU">DIU</option>
                        <option value="Implanon">Implanon</option>
                      </select>
                    </div>
                  )}
                </div>

                {consulta.houve_retirada === 'Sim' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo da retirada <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={consulta.motivo_retirada}
                      onChange={(e) => handleInputChange(index, 'motivo_retirada', e.target.value)}
                      placeholder="Descreva o motivo da retirada"
                      rows={3}
                      disabled={!!consulta.id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={consulta.observacoes}
                  onChange={(e) => handleInputChange(index, 'observacoes', e.target.value)}
                  placeholder="Digite observações adicionais (opcional)"
                  rows={3}
                  disabled={!!consulta.id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {!consulta.id && (
                <button
                  type="button"
                  onClick={() => handleSaveConsulta(index)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? 'Salvando...' : 'Salvar Consulta'}
                </button>
              )}
            </div>
          </div>
        ))}

        {isViewMode && (
          <button
            type="button"
            onClick={addConsulta}
            className="flex items-center gap-2 border-2 border-dashed border-[#2d7a4f] text-[#2d7a4f] hover:bg-green-50 px-6 py-3 rounded-lg font-semibold transition-colors w-full justify-center"
          >
            <Plus size={20} />
            Adicionar Nova Consulta
          </button>
        )}

        {!isViewMode && (
          <>
            <button
              type="button"
              onClick={addConsulta}
              className="flex items-center gap-2 border-2 border-dashed border-[#2d7a4f] text-[#2d7a4f] hover:bg-green-50 px-6 py-3 rounded-lg font-semibold transition-colors w-full justify-center"
            >
              <Plus size={20} />
              Adicionar Nova Consulta
            </button>

            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={loading}
                className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                <Check size={20} />
                {loading ? 'Salvando...' : 'Salvar Registro'}
              </button>
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={loading}
                className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                <Check size={20} />
                {loading ? 'Confirmando...' : 'Confirmar Dados'}
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
