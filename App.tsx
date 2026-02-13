
import React, { useEffect, useState } from 'react';
import { AuthUser, QuizState, Screen, Subject } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import SettingsScreen from './components/SettingsScreen';
import ClassificationScreen from './components/ClassificationScreen';
import AdminSubjectsScreen from './components/AdminSubjectsScreen';
import QuizScreen from './components/QuizScreen';
import ResultScreen from './components/ResultScreen';
import { generateQuizQuestions } from './services/geminiService';
import { MOCK_CLASSIFICATION_BASE, MOCK_QUESTIONS, SUBJECTS } from './constants';
import * as api from './services/api';
import { useAuth } from './context/AuthContext';
import { AuthApiError, forgotPasswordRequest, resetPasswordRequest } from './services/authApi';
import { ApiError } from './services/api';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const App: React.FC = () => {
  const { user, token, isAuthenticated, isLoading: isAuthLoading, login, register, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);
  const [lastResultRank, setLastResultRank] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated && currentScreen !== Screen.LOGIN) {
      setCurrentScreen(Screen.LOGIN);
      setQuizState(null);
      setUserProfile(null);
    }
  }, [isAuthenticated, currentScreen]);

  useEffect(() => {
    if (isAuthenticated && currentScreen === Screen.LOGIN) {
      setCurrentScreen(Screen.DASHBOARD);
    }
  }, [isAuthenticated, currentScreen]);

  useEffect(() => {
    if (currentScreen === Screen.ADMIN && isAuthenticated && !(userProfile?.is_admin || user?.is_admin)) {
      setCurrentScreen(Screen.DASHBOARD);
    }
  }, [currentScreen, isAuthenticated, userProfile?.is_admin, user?.is_admin]);

  useEffect(() => {
    if (isAuthenticated && currentScreen === Screen.DASHBOARD && user && token) {
      loadInitialData();
    }
  }, [currentScreen, isAuthenticated, user, token]);

  const loadInitialData = async () => {
    if (!user || !token) return;

    try {
      const dbSubjects = await api.fetchSubjects(token);
      const profile = await api.fetchUserProfile(token, user.id);

      if (Array.isArray(dbSubjects)) {
        const subjectsById = new Map<number, Subject>();
        SUBJECTS.forEach((subject) => subjectsById.set(subject.id, subject));

        const activeSubjects: Subject[] = dbSubjects
          .filter((subject: any) => subject?.activo === undefined || Number(subject.activo) === 1)
          .map((subject: any) => {
            const subjectId = Number(subject.id);
            return ({
            ...(subjectsById.get(subjectId) || {
              id: subjectId,
              name: subject.name,
              description: subject.description || '',
              quizCount: 0,
              progress: 0,
            }),
            ...subject,
            id: subjectId,
            imageUrl: subject.image_url || subject.imageUrl || subjectsById.get(subjectId)?.imageUrl,
          });
        });

        setSubjects(activeSubjects);
      } else {
        setSubjects(SUBJECTS);
      }
      if (profile) {
        setUserProfile({
          ...user,
          ...profile,
        });
      } else {
        setUserProfile(user);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        setCurrentScreen(Screen.LOGIN);
        setAuthError('Tu sesion expiro. Inicia sesion nuevamente.');
        return;
      }
      setSubjects(SUBJECTS);
    }
  };

  const mapAuthError = (error: unknown): string => {
    if (error instanceof AuthApiError) {
      if (error.type === 'network') {
        return 'No hay conexion con el servidor. Verifica que el backend este levantado.';
      }
      if (error.status === 401) {
        return 'Credenciales incorrectas. Revisa email y password.';
      }
      if (error.status === 409) {
        return 'Ese correo ya existe. Usa otro o inicia sesion.';
      }
      if (error.status && error.status >= 500) {
        return 'Error interno del servidor. Intenta nuevamente en unos segundos.';
      }
      return error.message;
    }
    return 'No se pudo completar la autenticacion';
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    setIsAuthSubmitting(true);

    try {
      await login(email, password);
      setCurrentScreen(Screen.DASHBOARD);
      setAuthMode('login');
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    setIsAuthSubmitting(true);

    try {
      await register(name, email, password);
      setCurrentScreen(Screen.DASHBOARD);
      setAuthMode('login');
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthError(null);
    setAuthNotice(null);
    setIsAuthSubmitting(true);

    try {
      const response = await forgotPasswordRequest(email);
      setAuthNotice(response.message);
      setAuthMode('reset');
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleResetPassword = async (email: string, tokenValue: string, newPassword: string) => {
    setAuthError(null);
    setAuthNotice(null);
    setIsAuthSubmitting(true);

    try {
      const response = await resetPasswordRequest(email, tokenValue, newPassword);
      setAuthNotice(response.message);
      setAuthMode('login');
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const clearAuthMessages = () => {
    if (authError) setAuthError(null);
    if (authNotice) setAuthNotice(null);
  };

  const handleLogout = async () => {
    await logout();
    setAuthError(null);
    setAuthNotice(null);
    setSubjects([]);
  };

  const handleStartQuiz = async (subject: Subject) => {
    if (!user || !token) return;

    setDashboardNotice(null);
    setIsQuizLoading(true);
    try {
      const dailyStatus = await api.fetchQuizDailyStatus(token, subject.id);
      if (!dailyStatus.allowed) {
        setDashboardNotice('Has superado el numero de test diarios para esta asignatura.');
        return;
      }

      let questions = await generateQuizQuestions(subject.name, 5);
      
      if (!questions || questions.length === 0) {
        const fallbackQuestions = MOCK_QUESTIONS[subject.id] || Object.values(MOCK_QUESTIONS)[0] || [];
        questions = fallbackQuestions;
      }

      setQuizState({
        subject,
        questions,
        currentQuestionIndex: 0,
        score: 0,
        answers: [],
        startTime: Date.now(),
      });
      setCurrentScreen(Screen.QUIZ);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setDashboardNotice(error.message || 'Has superado el numero de test diarios para esta asignatura.');
      } else {
        console.error("No se pudo iniciar el quiz", error);
      }
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleFinishQuiz = async (score: number, answers: number[]) => {
    if (quizState && user && token) {
      const xpEarned = answers.reduce((total, answerIndex, questionIndex) => {
        if (answerIndex === -1) return total;
        const isCorrect = answerIndex === quizState.questions[questionIndex].correctAnswerIndex;
        return total + (isCorrect ? 20 : -5);
      }, 0);
      const projectedTotalXp = Number(userProfile?.total_xp ?? user.total_xp ?? 0) + xpEarned;

      const rankingRows = [...MOCK_CLASSIFICATION_BASE];
      const existingIndex = rankingRows.findIndex(
        (row) => row.name.toLowerCase() === user.name.toLowerCase()
      );
      if (existingIndex >= 0) {
        rankingRows[existingIndex] = {
          ...rankingRows[existingIndex],
          xp: projectedTotalXp,
        };
      } else {
        rankingRows.push({
          name: user.name,
          xp: projectedTotalXp,
          profile_pic: user.profile_pic || `https://picsum.photos/seed/${encodeURIComponent(user.name)}/96`,
        });
      }
      rankingRows.sort((a, b) => b.xp - a.xp);
      const computedRank = rankingRows.findIndex((row) => row.name.toLowerCase() === user.name.toLowerCase()) + 1;
      setLastResultRank(computedRank > 0 ? computedRank : null);
      
      try {
        await api.saveQuizResult(
          token,
          user.id,
          quizState.subject.id,
          score,
          xpEarned,
          quizState.questions.map((question) => ({
            text: question.text,
            options: question.options,
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation,
          }))
        );
        await loadInitialData();
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          setCurrentScreen(Screen.DASHBOARD);
          setQuizState(null);
          setDashboardNotice(error.message || 'Has superado el numero de test diarios para esta asignatura.');
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          setCurrentScreen(Screen.LOGIN);
          setAuthError('Tu sesion expiro. Inicia sesion nuevamente.');
          return;
        }
      }

      setQuizState({
        ...quizState,
        score,
        answers,
        endTime: Date.now(),
      });
      setCurrentScreen(Screen.RESULTS);
    }
  };

  const handleBackToDashboard = () => {
    setQuizState(null);
    setCurrentScreen(Screen.DASHBOARD);
  };

  const handleOpenSettings = () => {
    setCurrentScreen(Screen.SETTINGS);
  };

  const handleBackFromSettings = () => {
    setCurrentScreen(Screen.DASHBOARD);
  };

  const handleOpenClassification = () => {
    setCurrentScreen(Screen.CLASSIFICATION);
  };

  const handleBackFromClassification = () => {
    setCurrentScreen(Screen.DASHBOARD);
  };

  const handleOpenAdmin = () => {
    if (!(userProfile?.is_admin || user?.is_admin)) return;
    setCurrentScreen(Screen.ADMIN);
  };

  const handleBackFromAdmin = () => {
    setCurrentScreen(Screen.DASHBOARD);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('No se pudo leer la imagen seleccionada.'));
      };
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.readAsDataURL(file);
    });

  const handleUploadProfilePic = async (file: File): Promise<string> => {
    if (!token) {
      throw new Error('Sesion invalida. Vuelve a iniciar sesion.');
    }

    const imageData = await fileToDataUrl(file);
    const response = await api.uploadProfilePicture(token, imageData);
    setUserProfile((prev) => ({
      ...(prev || user || ({} as AuthUser)),
      profile_pic: response.profile_pic,
    }));
    return response.profile_pic;
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!token) {
      throw new Error('Sesion invalida. Vuelve a iniciar sesion.');
    }

    try {
      await api.changePassword(token, currentPassword, newPassword);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new Error('La contrasena actual no es correcta.');
        }
        if (error.status === 400) {
          throw new Error(error.message || 'Datos invalidos para cambiar la contrasena.');
        }
        if (error.status && error.status >= 500) {
          throw new Error('Error interno al cambiar la contrasena.');
        }
      }
      throw error instanceof Error ? error : new Error('No se pudo cambiar la contrasena.');
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col max-w-[430px] mx-auto relative overflow-hidden shadow-2xl">
      <div className="fixed inset-0 z-0 bg-grid opacity-30 pointer-events-none"></div>
      
      {(isQuizLoading || isAuthLoading) && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background-dark/80 backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-primary font-bold animate-pulse">
            {isAuthLoading ? 'Restaurando sesion...' : 'Consultando al oraculo...'}
          </p>
        </div>
      )}

      <div className="flex-1 relative z-10 overflow-y-auto no-scrollbar">
        {!isAuthenticated && (
          <LoginScreen
            onLogin={handleLogin}
            onRegister={handleRegister}
            onForgotPassword={handleForgotPassword}
            onResetPassword={handleResetPassword}
            mode={authMode}
            onModeChange={setAuthMode}
            isSubmitting={isAuthSubmitting}
            error={authError}
            notice={authNotice}
            onCredentialsChange={clearAuthMessages}
          />
        )}
        {isAuthenticated && currentScreen === Screen.DASHBOARD && (
          <DashboardScreen 
            onStartQuiz={handleStartQuiz} 
            onLogout={() => { void handleLogout(); }}
            onOpenSettings={handleOpenSettings}
            onOpenClassification={handleOpenClassification}
            onOpenAdmin={handleOpenAdmin}
            customSubjects={subjects.length > 0 ? subjects : undefined}
            userData={userProfile || user}
            notice={dashboardNotice}
          />
        )}
        {isAuthenticated && currentScreen === Screen.SETTINGS && (
          <SettingsScreen
            userData={userProfile || user}
            onBack={handleBackFromSettings}
            onUploadProfilePic={handleUploadProfilePic}
            onChangePassword={handleChangePassword}
          />
        )}
        {isAuthenticated && currentScreen === Screen.CLASSIFICATION && (
          <ClassificationScreen
            onBack={handleBackFromClassification}
            userData={userProfile || user}
          />
        )}
        {isAuthenticated && currentScreen === Screen.ADMIN && token && (userProfile?.is_admin || user?.is_admin) && (
          <AdminSubjectsScreen
            token={token}
            onBack={handleBackFromAdmin}
            onSubjectsUpdated={loadInitialData}
          />
        )}
        {isAuthenticated && currentScreen === Screen.QUIZ && quizState && (
          <QuizScreen 
            state={quizState} 
            onFinish={handleFinishQuiz} 
            onClose={handleBackToDashboard}
          />
        )}
        {isAuthenticated && currentScreen === Screen.RESULTS && quizState && (
          <ResultScreen 
            state={quizState} 
            userRank={lastResultRank}
            onDashboard={handleBackToDashboard} 
          />
        )}
      </div>

      <div className="h-1 bg-gradient-to-r from-primary via-accent-purple to-accent-cyan opacity-50 sticky bottom-0 z-[60]"></div>
    </div>
  );
};

export default App;
