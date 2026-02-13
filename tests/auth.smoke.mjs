const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    return { status: response.status, data };
};

const run = async () => {
    const email = `smoke-${Date.now()}@quizquest.test`;
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
    if (login.status !== 200 || !login.data?.token) {
        throw new Error(`login failed: ${login.status} ${JSON.stringify(login.data)}`);
    }

    const me = await request('/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${login.data.token}` },
    });
    if (me.status !== 200 || me.data?.user?.email !== email) {
        throw new Error(`me failed: ${me.status} ${JSON.stringify(me.data)}`);
    }

    const forgot = await request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (forgot.status !== 200) {
        throw new Error(`forgot-password failed: ${forgot.status} ${JSON.stringify(forgot.data)}`);
    }

    console.log('Auth smoke tests OK');
};

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
