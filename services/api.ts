//export const API_BASE_URL = 'http://localhost:3001/api';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';


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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
  subjectId: number,
  score: number,
  xpEarned: number,
  questions?: Array<{
    text: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }>
) => {
  return apiFetch('/quiz/finish', {
    method: 'POST',
    token,
    body: { userId, subjectId, score, xpEarned, questions },
  });
};

export const fetchQuizDailyStatus = async (
  token: string,
  subjectId: number
): Promise<{ allowed: boolean; attemptsToday: number; dailyLimit: number; remaining: number }> => {
  return apiFetch(`/quiz/can-start/${subjectId}`, { token });
};

export const fetchUserProfile = async (token: string, userId: number) => {
  return apiFetch(`/user/${userId}`, { token });
};

export const uploadProfilePicture = async (token: string, imageData: string): Promise<{ success: boolean; profile_pic: string }> => {
  return apiFetch('/user/profile-pic', {
    method: 'POST',
    token,
    body: { imageData },
  });
};

export const changePassword = async (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  return apiFetch('/user/change-password', {
    method: 'POST',
    token,
    body: { currentPassword, newPassword },
  });
};

export const fetchAdminSubjects = async (token: string) => {
  return apiFetch<Array<{ id: number; name: string; description?: string; image_url?: string; activo?: number | boolean }>>('/admin/subjects', { token });
};

export const createAdminSubject = async (
  token: string,
  payload: { name: string; description?: string; activo?: boolean }
) => {
  return apiFetch<{ success: boolean; message: string; id: number }>('/admin/subjects', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const updateAdminSubject = async (
  token: string,
  subjectId: number,
  payload: { name: string; description?: string; activo?: boolean }
) => {
  return apiFetch<{ success: boolean; message: string }>(`/admin/subjects/${subjectId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
};

export const deleteAdminSubject = async (token: string, subjectId: number) => {
  return apiFetch<{ success: boolean; message: string }>(`/admin/subjects/${subjectId}`, {
    method: 'DELETE',
    token,
  });
};

export const uploadAdminSubjectImage = async (
  token: string,
  subjectId: number,
  imageData: string
): Promise<{ success: boolean; image_url: string }> => {
  return apiFetch(`/admin/subjects/${subjectId}/image`, {
    method: 'POST',
    token,
    body: { imageData },
  });
};
