const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

export const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    return { status: response.status, data };
};

export const registerAndLogin = async () => {
    const email = `smoke-${Date.now()}-${Math.floor(Math.random() * 10000)}@quizquest.test`;
    const password = '123456';
    const name = 'Smoke Test';

    const register = await request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    if (register.status !== 201) {
        throw new Error(`register failed: ${register.status} ${JSON.stringify(register.data)}`);
    }

    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (login.status !== 200 || !login.data?.token || !login.data?.user?.id) {
        throw new Error(`login failed: ${login.status} ${JSON.stringify(login.data)}`);
    }

    return {
        token: login.data.token,
        userId: login.data.user.id,
        email,
    };
};

export const loginAdmin = async () => {
    const email = process.env.SMOKE_ADMIN_EMAIL || 'jpecina@gmail.com';
    const password = process.env.SMOKE_ADMIN_PASSWORD || '123456';

    const login = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (login.status !== 200 || !login.data?.token || !login.data?.user?.is_admin) {
        throw new Error(`admin login failed: ${login.status} ${JSON.stringify(login.data)}`);
    }

    return {
        token: login.data.token,
        userId: login.data.user.id,
        email,
    };
};

export const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
});
