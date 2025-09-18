// Configuración base de la API
const API_BASE_URL = 'http://localhost:3001/api';

// Cliente HTTP básico
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Instancia del cliente API
export const api = new ApiClient(API_BASE_URL);

// Servicios de autenticación
export const authService = {
  login: async (email: string, password: string) => {
    return api.post<{
      success: boolean;
      message: string;
      token: string;
      user: { id: string; email: string; role?: string };
    }>('/auth/login', { email, password });
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/logout');
  },

  getProfile: async () => {
    return api.get<{
      success: boolean;
      user: { id: string; email: string; role?: string };
    }>('/auth/profile');
  },
};

// Servicios generales
export const generalService = {
  healthCheck: async () => {
    return api.get<{ status: string; message: string }>('/health');
  },
};

// Exportar por defecto
export default api;