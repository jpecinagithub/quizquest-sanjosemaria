import { AuthUser } from '../types';
import { API_BASE_URL } from './api';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

const AUTH_REQUEST_TIMEOUT_MS = 7000;

type AuthApiErrorType = 'http' | 'network' | 'unknown';

interface AuthApiErrorParams {
  status?: number;
  type: AuthApiErrorType;
}

export class AuthApiError extends Error {
  status?: number;
  type: AuthApiErrorType;

  constructor(message: string, params: AuthApiErrorParams) {
    super(message);
    this.name = 'AuthApiError';
    this.status = params.status;
    this.type = params.type;
  }
}

const parseApiError = async (response: Response): Promise<{ message: string; status: number }> => {
  try {
    const data = await response.json();
    return {
      message: data?.message || 'La solicitud de autenticacion fallo',
      status: response.status,
    };
  } catch {
    return {
      message: 'La solicitud de autenticacion fallo',
      status: response.status,
    };
  }
};

const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs: number = AUTH_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const loginRequest = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    return response.json();
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};

export const fetchCurrentUser = async (token: string): Promise<AuthUser> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};

export const registerRequest = async (payload: RegisterPayload): Promise<LoginResponse> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    return response.json();
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};

export const forgotPasswordRequest = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    return response.json();
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};

export const resetPasswordRequest = async (
  email: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    return response.json();
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};

export const logoutRequest = async (token: string): Promise<void> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const parsed = await parseApiError(response);
      throw new AuthApiError(parsed.message, { status: parsed.status, type: 'http' });
    }
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (error instanceof TypeError) {
      throw new AuthApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new AuthApiError('Error inesperado en autenticacion', { type: 'unknown' });
  }
};
