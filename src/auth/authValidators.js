export const validateLoginPayload = (body) => {
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    if (!email || !password) {
        return { ok: false, status: 400, message: 'Email y password son requeridos' };
    }
    return { ok: true, value: { email, password } };
};

export const validateRegisterPayload = (body) => {
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');

    if (!name || !email || !password) {
        return { ok: false, status: 400, message: 'Nombre, email y password son requeridos' };
    }
    if (password.length < 6) {
        return { ok: false, status: 400, message: 'La contraseña debe tener al menos 6 caracteres' };
    }
    return { ok: true, value: { name, email, password } };
};

export const validateForgotPasswordPayload = (body) => {
    const email = String(body?.email || '').trim();
    if (!email) {
        return { ok: false, status: 400, message: 'Email requerido' };
    }
    return { ok: true, value: { email } };
};

export const validateResetPasswordPayload = (body) => {
    const email = String(body?.email || '').trim();
    const token = String(body?.token || '').trim();
    const newPassword = String(body?.newPassword || '');

    if (!email || !token || !newPassword) {
        return { ok: false, status: 400, message: 'email, token y newPassword son requeridos' };
    }
    if (newPassword.length < 6) {
        return { ok: false, status: 400, message: 'La contraseña debe tener al menos 6 caracteres' };
    }

    return { ok: true, value: { email, token, newPassword } };
};
