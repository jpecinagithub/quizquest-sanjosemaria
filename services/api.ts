export const API_BASE_URL = 'http://localhost:3001/api';

type ApiErrorType = 'http' | 'network' | 'unknown';

interface ApiErrorParams {
  status?: number;
  type: ApiErrorType;
}

export class ApiError extends Error {
  status?: number;
  type: ApiErrorType;

  constructor(message: string, params: ApiErrorParams) {
    super(message);
    this.name = 'ApiError';
    this.status = params.status;
    this.type = params.type;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  token?: string;
  body?: unknown;
}

const parseErrorResponse = async (response: Response): Promise<{ message: string; status: number }> => {
  try {
    const data = await response.json();
    return {
      message: data?.message || 'La solicitud a la API fallo',
      status: response.status,
    };
  } catch {
    return {
      message: 'La solicitud a la API fallo',
      status: response.status,
    };
  }
};

const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const parsed = await parseErrorResponse(response);
      throw new ApiError(parsed.message, { status: parsed.status, type: 'http' });
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof TypeError) {
      throw new ApiError('No se pudo conectar con el servidor', { type: 'network' });
    }
    throw new ApiError('Error inesperado en llamada API', { type: 'unknown' });
  }
};

export const fetchSubjects = async (token: string) => {
  return apiFetch('/subjects', { token });
};

export const saveQuizResult = async (
  token: string,
  userId: number,
  subjectId: string,
  score: number,
  xpEarned: number
) => {
  return apiFetch('/quiz/finish', {
    method: 'POST',
    token,
    body: { userId, subjectId, score, xpEarned },
  });
};

export const fetchUserProfile = async (token: string, userId: number) => {
  return apiFetch(`/user/${userId}`, { token });
};
