const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const capacitacaoAPI = {
  async getStats() {
    const response = await fetch(`${API_URL}/capacitacao/stats`);
    return response.json();
  },

  async getAgendamentos() {
    const response = await fetch(`${API_URL}/capacitacao/agendamentos`);
    return response.json();
  },

  async createAgendamento(data: any) {
    const response = await fetch(`${API_URL}/capacitacao/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getAgendamento(id: string) {
    const response = await fetch(`${API_URL}/capacitacao/agendamentos/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar agendamento');
    }
    return response.json();
  },

  async updateAgendamento(id: string, data: any) {
    const response = await fetch(`${API_URL}/capacitacao/agendamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar agendamento');
    }
    return response.json();
  },

  async deleteAgendamento(id: string) {
    const response = await fetch(`${API_URL}/capacitacao/agendamentos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao excluir agendamento');
    }
    return response.json();
  },

  async getEnfermeirasInstrutoras() {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-instrutoras`);
    return response.json();
  },

  async getEnfermeiraInstrutora(id: string) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-instrutoras/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar instrutora');
    }
    return response.json();
  },

  async validateEnfermeiraInstrutora(data: any) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-instrutoras/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      return { valid: false, errors: error.errors || ['Erro na validação'] };
    }
    return { valid: true, errors: [] };
  },

  async createEnfermeiraInstrutora(data: any) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-instrutoras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cadastrar instrutora');
    }
    return response.json();
  },

  async updateEnfermeiraInstrutora(id: string, data: any) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-instrutoras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar instrutora');
    }
    return response.json();
  },

  async getEnfermeirasAlunas() {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas`);
    return response.json();
  },

  async createEnfermeiraAluna(data: any) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cadastrar aluna');
    }
    return response.json();
  },

  async getPacientes() {
    const response = await fetch(`${API_URL}/capacitacao/pacientes`);
    return response.json();
  },

  async createPaciente() {
    const response = await fetch(`${API_URL}/capacitacao/pacientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Erro ao criar paciente');
    }
    return response.json();
  },

  async getPaciente(id: string) {
    const response = await fetch(`${API_URL}/capacitacao/pacientes/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar paciente');
    }
    return response.json();
  },

  async updatePaciente(id: string, data: any) {
    const response = await fetch(`${API_URL}/capacitacao/pacientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar paciente');
    }
    return response.json();
  },

  async getEnfermeiraAluna(id: string) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar aluna');
    }
    return response.json();
  },

  async updateEnfermeiraAluna(id: string, data: any) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar aluna');
    }
    return response.json();
  },

  async getFichas(alunaId: string) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${alunaId}/fichas`);
    return response.json();
  },

  async uploadFicha(alunaId: string, fichaData: {
    nome_arquivo: string;
    pdf_content: string;
    nome_paciente: string;
    cpf_paciente: string;
    data_nascimento_paciente: string;
    municipio_paciente: string;
  }) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${alunaId}/fichas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fichaData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao anexar ficha');
    }
    return response.json();
  },

  async getFicha(alunaId: string, fichaId: string) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${alunaId}/fichas/${fichaId}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar ficha');
    }
    return response.json();
  },

  async deleteFicha(alunaId: string, fichaId: string) {
    const response = await fetch(`${API_URL}/capacitacao/enfermeiras-alunas/${alunaId}/fichas/${fichaId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao remover ficha');
    }
    return response.json();
  },

  async getNotificacoes() {
    const response = await fetch(`${API_URL}/capacitacao/notificacoes`);
    return response.json();
  },

  async getNotificacoesCount() {
    const response = await fetch(`${API_URL}/capacitacao/notificacoes/nao-lidas/count`);
    return response.json();
  },

  async marcarNotificacaoLida(notificacaoId: number) {
    const response = await fetch(`${API_URL}/capacitacao/notificacoes/${notificacaoId}/marcar-lida`, {
      method: 'PATCH',
    });
    return response.json();
  },

  async marcarTodasLidas() {
    const response = await fetch(`${API_URL}/capacitacao/notificacoes/marcar-todas-lidas`, {
      method: 'PATCH',
    });
    return response.json();
  },
};

export const ambulatorialAPI = {
  async getPacientesFiltrados(filtro: string = 'todos') {
    const response = await fetch(`${API_URL}/ambulatorial/pacientes/filtrados?filtro=${filtro}`);
    return response.json();
  },

  async getPaciente(id: string) {
    const response = await fetch(`${API_URL}/ambulatorial/pacientes/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar paciente');
    }
    return response.json();
  },

  async createPaciente(data: any) {
    const response = await fetch(`${API_URL}/ambulatorial/pacientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cadastrar paciente');
    }
    return response.json();
  },

  async updatePaciente(id: string, data: any) {
    const response = await fetch(`${API_URL}/ambulatorial/pacientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar paciente');
    }
    return response.json();
  },

  async getEnfermeirasInstrutoras() {
    const response = await fetch(`${API_URL}/ambulatorial/enfermeiras-instrutoras`);
    return response.json();
  },

  async getEnfermeiraInstrutora(id: string) {
    const response = await fetch(`${API_URL}/ambulatorial/enfermeiras-instrutoras/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar profissional');
    }
    return response.json();
  },

  async validateEnfermeiraInstrutora(data: any) {
    const response = await fetch(`${API_URL}/ambulatorial/enfermeiras-instrutoras/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      return { valid: false, errors: error.errors || ['Erro na validação'] };
    }
    return { valid: true, errors: [] };
  },

  async createEnfermeiraInstrutora(data: any) {
    const response = await fetch(`${API_URL}/ambulatorial/enfermeiras-instrutoras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cadastrar profissional');
    }
    return response.json();
  },

  async updateEnfermeiraInstrutora(id: string, data: any) {
    const response = await fetch(`${API_URL}/ambulatorial/enfermeiras-instrutoras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar profissional');
    }
    return response.json();
  },

  async validateCPF(cpf: string, excludeId?: string) {
    const params = new URLSearchParams({ cpf });
    if (excludeId) params.append('excludeId', excludeId);

    const response = await fetch(`${API_URL}/ambulatorial/pacientes/validar-cpf?${params.toString()}`);
    if (!response.ok) {
      return { valid: false };
    }
    return response.json();
  },

  async getConsultas(pacienteId: string) {
    const response = await fetch(`${API_URL}/ambulatorial/consultas/${pacienteId}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar consultas');
    }
    return response.json();
  },

  async createConsulta(pacienteId: string, consulta: any) {
    const response = await fetch(`${API_URL}/ambulatorial/consultas/${pacienteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consulta),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao salvar consulta');
    }
    return response.json();
  },
};

export const distribuicaoAPI = {
  async getMunicipios() {
    const response = await fetch(`${API_URL}/distribuicao/municipios`);
    return response.json();
  },

  async getSolicitacoes(filtros?: {
    dataInicio?: string;
    dataFim?: string;
    municipio?: string;
    tipoInsumo?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros?.municipio) params.append('municipio', filtros.municipio);
    if (filtros?.tipoInsumo) params.append('tipoInsumo', filtros.tipoInsumo);
    if (filtros?.status) params.append('status', filtros.status);

    const response = await fetch(`${API_URL}/distribuicao/solicitacoes?${params.toString()}`);
    return response.json();
  },

  async createSolicitacao(data: any) {
    const response = await fetch(`${API_URL}/distribuicao/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar solicitação');
    }
    return response.json();
  },

  async getSolicitacao(id: string) {
    const response = await fetch(`${API_URL}/distribuicao/solicitacoes/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar solicitação');
    }
    return response.json();
  },

  async updateSolicitacao(id: string, data: any) {
    const response = await fetch(`${API_URL}/distribuicao/solicitacoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar solicitação');
    }
    return response.json();
  },

  async getStats() {
    const response = await fetch(`${API_URL}/distribuicao/stats`);
    return response.json();
  },

  async getResponsaveis() {
    const response = await fetch(`${API_URL}/distribuicao/responsaveis`);
    return response.json();
  },

  async getResponsavel(id: string) {
    const response = await fetch(`${API_URL}/distribuicao/responsaveis/${id}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar responsável');
    }
    return response.json();
  },

  async createResponsavel(data: any) {
    const response = await fetch(`${API_URL}/distribuicao/responsaveis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cadastrar responsável');
    }
    return response.json();
  },

  async updateResponsavel(id: string, data: any) {
    const response = await fetch(`${API_URL}/distribuicao/responsaveis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar responsável');
    }
    return response.json();
  },

  async validateCPF(cpf: string, excludeId?: string) {
    const params = new URLSearchParams({ cpf });
    if (excludeId) params.append('excludeId', excludeId);

    const response = await fetch(`${API_URL}/distribuicao/responsaveis/validar-cpf?${params.toString()}`);
    if (!response.ok) {
      return { valid: false };
    }
    return response.json();
  },
};

export const gestaoAPI = {
  async getDashboardData() {
    const response = await fetch(`${API_URL}/dashboard/gestao`);
    if (!response.ok) {
      throw new Error('Erro ao buscar dados do dashboard');
    }
    return response.json();
  },

  async getLogsAuditoria(filtros?: {
    usuario?: string;
    acao?: string;
    modulo?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    per_page?: number;
  }) {
    const params = new URLSearchParams();
    if (filtros?.usuario) params.append('usuario', filtros.usuario);
    if (filtros?.acao) params.append('acao', filtros.acao);
    if (filtros?.modulo) params.append('modulo', filtros.modulo);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.per_page) params.append('per_page', filtros.per_page.toString());

    const headers = getHeaders();
    const response = await fetch(`${API_URL}/logs-auditoria?${params.toString()}`, { headers });
    if (!response.ok) {
      throw new Error('Erro ao buscar logs de auditoria');
    }
    return response.json();
  },

  async registrarLogAuditoria(log: {
    acao: string;
    descricao: string;
    modulo?: string;
    tabela_afetada?: string;
    registro_id?: string;
  }) {
    const headers = getHeaders();
    const response = await fetch(`${API_URL}/logs-auditoria`, {
      method: 'POST',
      headers,
      body: JSON.stringify(log),
    });
    if (!response.ok) return;
    return response.json();
  },
};

function getHeaders() {
  const usuario = localStorage.getItem('usuario');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (usuario) {
    try {
      const user = JSON.parse(usuario);
      headers['X-User-Id'] = user.id.toString();
    } catch (error) {
      console.error('Erro ao obter ID do usuário:', error);
    }
  }

  return headers;
}

const api = {
  get: async (endpoint: string, options?: { params?: Record<string, any> }) => {
    let url = `${API_URL}${endpoint}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      url += `?${searchParams.toString()}`;
    }

    console.log('[API DEBUG] GET Request:', url);

    const response = await fetch(url, {
      headers: getHeaders(),
    });

    console.log('[API DEBUG] Response Status:', response.status, response.statusText);
    console.log('[API DEBUG] Response Content-Type:', response.headers.get('Content-Type'));

    // Debug: Ler o corpo da resposta como texto primeiro
    const responseText = await response.text();
    console.log('[API DEBUG] Response Body (first 200 chars):', responseText.substring(0, 200));

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro HTTP ${response.status}: Resposta não é JSON válido`);
      }
      throw new Error(error.error || 'Erro na requisição');
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('[API DEBUG] Erro ao fazer parse do JSON:', parseError);
      console.error('[API DEBUG] Resposta completa:', responseText);
      throw new Error('Resposta do servidor não é JSON válido');
    }
  },

  post: async (endpoint: string, data: any) => {
    const url = `${API_URL}${endpoint}`;
    console.log('[API DEBUG] POST Request:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('[API DEBUG] Response Status:', response.status, response.statusText);
    console.log('[API DEBUG] Response Content-Type:', response.headers.get('Content-Type'));

    const responseText = await response.text();
    console.log('[API DEBUG] Response Body (first 200 chars):', responseText.substring(0, 200));

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro HTTP ${response.status}: Resposta não é JSON válido`);
      }
      throw new Error(error.error || 'Erro na requisição');
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('[API DEBUG] Erro ao fazer parse do JSON:', parseError);
      console.error('[API DEBUG] Resposta completa:', responseText);
      throw new Error('Resposta do servidor não é JSON válido');
    }
  },

  put: async (endpoint: string, data: any) => {
    const url = `${API_URL}${endpoint}`;
    console.log('[API DEBUG] PUT Request:', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('[API DEBUG] Response Status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[API DEBUG] Response Body (first 200 chars):', responseText.substring(0, 200));

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro HTTP ${response.status}: Resposta não é JSON válido`);
      }
      throw new Error(error.error || 'Erro na requisição');
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Resposta do servidor não é JSON válido');
    }
  },

  patch: async (endpoint: string, data: any) => {
    const url = `${API_URL}${endpoint}`;
    console.log('[API DEBUG] PATCH Request:', url);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('[API DEBUG] Response Status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[API DEBUG] Response Body (first 200 chars):', responseText.substring(0, 200));

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro HTTP ${response.status}: Resposta não é JSON válido`);
      }
      throw new Error(error.error || 'Erro na requisição');
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Resposta do servidor não é JSON válido');
    }
  },

  delete: async (endpoint: string, data?: any) => {
    const url = `${API_URL}${endpoint}`;
    console.log('[API DEBUG] DELETE Request:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log('[API DEBUG] Response Status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[API DEBUG] Response Body (first 200 chars):', responseText.substring(0, 200));

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro HTTP ${response.status}: Resposta não é JSON válido`);
      }
      throw new Error(error.error || 'Erro na requisição');
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Resposta do servidor não é JSON válido');
    }
  },
};

export default api;
