import React from 'react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface LoginScreenProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
  notice?: string | null;
  onCredentialsChange?: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen: React.FC<LoginScreenProps> = ({
  mode,
  onModeChange,
  onLogin,
  onRegister,
  onForgotPassword,
  onResetPassword,
  isSubmitting = false,
  error = null,
  notice = null,
  onCredentialsChange,
}) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [resetToken, setResetToken] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const isLoginMode = mode === 'login';
  const isRegisterMode = mode === 'register';
  const isForgotMode = mode === 'forgot';
  const isResetMode = mode === 'reset';

  const clearLocalErrors = () => {
    if (validationError) setValidationError(null);
    onCredentialsChange?.();
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setValidationError(null);
    onCredentialsChange?.();
    onModeChange(nextMode);
  };

  const isFormReady = React.useMemo(() => {
    if (isForgotMode) return email.trim().length > 0;
    if (isResetMode) return email.trim().length > 0 && resetToken.trim().length > 0 && password.length > 0 && confirmPassword.length > 0;
    if (isRegisterMode) return name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && confirmPassword.length > 0;
    return email.trim().length > 0 && password.length > 0;
  }, [isForgotMode, isResetMode, isRegisterMode, name, email, password, confirmPassword, resetToken]);

  const validateCommon = () => {
    const normalizedEmail = email.trim();
    if (!emailRegex.test(normalizedEmail)) {
      setValidationError('Ingresa un email valido.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (!validateCommon()) return;

    if (isForgotMode) {
      await onForgotPassword(email.trim());
      return;
    }

    if (isResetMode) {
      if (password.length < 6) {
        setValidationError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Las contraseñas no coinciden.');
        return;
      }
      await onResetPassword(email.trim(), resetToken.trim(), password);
      return;
    }

    if (password.length < 6) {
      setValidationError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (isRegisterMode) {
      if (name.trim().length < 2) {
        setValidationError('El nombre debe tener al menos 2 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Las contraseñas no coinciden.');
        return;
      }
      await onRegister(name.trim(), email.trim(), password);
      return;
    }

    await onLogin(email.trim(), password);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-primary via-accent-purple to-accent-cyan p-0.5 mb-6">
          <div className="w-full h-full bg-background-dark rounded-[10px] flex items-center justify-center">
            <span className="material-icons-round text-4xl text-white">psychology</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white via-primary to-accent-cyan bg-clip-text text-transparent">
          QuizQuest
        </h1>
        <p className="text-slate-400 font-light">
          {isRegisterMode && 'Crea tu cuenta y empieza a aprender.'}
          {isLoginMode && 'Sube de nivel tu conocimiento hoy.'}
          {isForgotMode && 'Recupera el acceso a tu cuenta.'}
        </p>
      </div>

      <div className="w-full mb-5 flex items-center gap-2 rounded-xl bg-slate-800/40 p-1 border border-slate-700/60">
        <button
          type="button"
          onClick={() => handleModeChange('login')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${isLoginMode ? 'bg-primary text-white' : 'text-slate-300 hover:text-white'}`}
        >
          Iniciar sesion
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('register')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${isRegisterMode ? 'bg-primary text-white' : 'text-slate-300 hover:text-white'}`}
        >
          Registrarse
        </button>
      </div>

      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {isRegisterMode && (
            <div className="relative group">
              <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 ml-1">Nombre</label>
              <div className="relative">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">badge</span>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Alex"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearLocalErrors();
                  }}
                  required
                />
              </div>
            </div>
          )}

          <div className="relative group">
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 ml-1">Correo electronico</label>
            <div className="relative">
              <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">alternate_email</span>
              <input
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="nerd@school.com"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearLocalErrors();
                }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {!isForgotMode && (
            <div className="relative group">
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-semibold text-primary uppercase tracking-wider">Contrasena</label>
                {isLoginMode && (
                  <button type="button" onClick={() => handleModeChange('forgot')} className="text-[10px] font-bold text-accent-cyan uppercase hover:underline">
                    Olvide mi contrasena
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock_open</span>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearLocalErrors();
                  }}
                  required
                  autoComplete={isRegisterMode || isResetMode ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-icons-round text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>
          )}

          {isResetMode && (
            <div className="relative group">
              <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 ml-1">Codigo de recuperacion</label>
              <div className="relative">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">pin</span>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Pega el codigo recibido por email"
                  type="text"
                  value={resetToken}
                  onChange={(event) => {
                    setResetToken(event.target.value);
                    clearLocalErrors();
                  }}
                  required
                />
              </div>
            </div>
          )}

          {(isRegisterMode || isResetMode) && (
            <div className="relative group">
              <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 ml-1">Confirmar contrasena</label>
              <div className="relative">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">verified_user</span>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearLocalErrors();
                  }}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
        </div>

        {(validationError || error || notice) && (
          <p
            className={`text-sm rounded-xl px-4 py-2 border ${
              validationError || error
                ? 'text-red-400 bg-red-500/10 border-red-500/30'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
            }`}
            role="alert"
            aria-live="polite"
          >
            {validationError || error || notice}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isFormReady}
          className="w-full bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>
            {isSubmitting && 'PROCESANDO...'}
            {!isSubmitting && isLoginMode && 'EMPEZAR'}
            {!isSubmitting && isRegisterMode && 'CREAR CUENTA'}
            {!isSubmitting && isForgotMode && 'ENVIAR CODIGO'}
            {!isSubmitting && isResetMode && 'CAMBIAR CONTRASENA'}
          </span>
          <span className={`material-icons-round text-xl ${isSubmitting ? 'animate-spin' : ''}`}>
            {isSubmitting ? 'progress_activity' : isForgotMode ? 'mail' : isResetMode ? 'key' : 'bolt'}
          </span>
        </button>

      </form>

      <footer className="mt-auto pt-8 pb-4">
        <p className="text-sm text-slate-400">
          {isForgotMode || isResetMode ? (
            <>
              Volver a{' '}
              <button type="button" onClick={() => handleModeChange('login')} className="text-primary font-bold hover:text-blue-400 transition-colors">
                iniciar sesion
              </button>
            </>
          ) : (
            <>
              {isLoginMode ? '¿Eres nuevo?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => handleModeChange(isLoginMode ? 'register' : 'login')}
                className="text-primary font-bold hover:text-blue-400 transition-colors"
              >
                {isLoginMode ? 'Crear cuenta' : 'Iniciar sesion'}
              </button>
            </>
          )}
        </p>
      </footer>
    </main>
  );
};

export default LoginScreen;
