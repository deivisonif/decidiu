const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const REQUEST_TIMEOUT = 15000;

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    status?: number;
    details?: any;
  };
}

function getHeaders(): HeadersInit {
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

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function getErrorMessage(status: number, defaultMessage: string): string {
  const errorMessages: Record<number, string> = {
    400: 'Requisição inválida. Verifique os dados e tente novamente.',
    401: 'Você não está autenticado. Faça login novamente.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'Recurso não encontrado.',
    409: 'Conflito: o recurso já existe ou há um conflito de dados.',
    422: 'Dados inválidos. Verifique as informações e tente novamente.',
    500: 'Erro no servidor. Tente novamente mais tarde.',
    502: 'Servidor indisponível. Tente novamente em alguns instantes.',
    503: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
  };

  return errorMessages[status] || defaultMessage;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    let errorData: any;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (jsonError) {
        errorData = null;
      }
    }

    if (!response.ok) {
      const errorMessage = errorData?.error || errorData?.message || getErrorMessage(response.status, 'Erro ao processar requisição');

      return {
        ok: false,
        error: {
          message: errorMessage,
          status: response.status,
          details: errorData,
        },
      };
    }

    return {
      ok: true,
      data: errorData || ({} as T),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: 'Erro ao processar resposta do servidor',
        details: error,
      },
    };
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[ApiClient] Requisição iniciada:', {
    url,
    method: options.method || 'GET',
    hasBody: !!options.body,
  });

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    console.log('[ApiClient] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    return handleResponse<T>(response);
  } catch (error: any) {
    console.error('[ApiClient] Erro na requisição:', {
      errorName: error.name,
      errorMessage: error.message,
      error,
    });

    if (error.name === 'AbortError') {
      return {
        ok: false,
        error: {
          message: 'A requisição demorou muito tempo. Verifique sua conexão e tente novamente.',
        },
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        ok: false,
        error: {
          message: 'Não foi possível conectar ao servidor. Verifique se a API está rodando e tente novamente.',
        },
      };
    }

    return {
      ok: false,
      error: {
        message: error.message || 'Erro desconhecido ao processar requisição',
        details: error,
      },
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> => {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return request<T>(url, { method: 'GET' });
  },

  post: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  patch: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

export default apiClient;
