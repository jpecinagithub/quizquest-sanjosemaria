
import React from 'react';
import { QuizState } from '../types';

interface ResultScreenProps {
  state: QuizState;
  userRank?: number | null;
  onDashboard: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ state, userRank = null, onDashboard }) => {
  const correctCount = state.answers.reduce((acc, ans, idx) => {
    return acc + (ans === state.questions[idx].correctAnswerIndex ? 1 : 0);
  }, 0);
  const incorrectCount = state.answers.reduce((acc, ans, idx) => {
    if (ans === -1) return acc;
    return acc + (ans === state.questions[idx].correctAnswerIndex ? 0 : 1);
  }, 0);
  
  const timeTaken = state.endTime ? Math.floor((state.endTime - state.startTime) / 1000) : 0;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-2 h-2 bg-primary rounded-full animate-ping"></div>
        <div className="absolute top-[20%] right-[20%] w-2 h-2 bg-accent-purple rounded-full animate-pulse"></div>
        <div className="absolute bottom-[30%] left-[40%] w-2 h-2 bg-accent-cyan rounded-full animate-bounce"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-48 relative z-10 no-scrollbar">
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-semibold mb-3 tracking-wide uppercase">
            Resultado de {state.subject.name}
          </div>
          <h1 className="text-3xl font-bold">{state.score >= 70 ? '¡Trabajo increible!' : '¡Sigue practicando!'}</h1>
          <p className="text-slate-400 mt-1">
            {state.score >= 70 ? "Has dominado la asignatura." : "Cada esfuerzo cuenta para mejorar."}
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-800" cx="112" cy="112" fill="transparent" r="100" stroke="currentColor" strokeWidth="12"></circle>
              <circle 
                className="text-primary transition-all duration-1000" 
                cx="112" cy="112" fill="transparent" r="100" 
                stroke="currentColor" 
                strokeDasharray="628.3" 
                strokeDashoffset={628.3 - (628.3 * state.score / 100)} 
                strokeLinecap="round" 
                strokeWidth="12"
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-6xl font-extrabold tracking-tighter">{state.score}<span className="text-3xl opacity-60">%</span></span>
              <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mt-1">Puntuacion final</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-sm flex flex-col items-center">
            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
              <span className="material-icons text-green-500">check_circle</span>
            </div>
            <span className="text-2xl font-bold">{correctCount}</span>
            <span className="text-xs text-slate-400 font-medium">Correctas</span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-sm flex flex-col items-center">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <span className="material-icons text-red-500">cancel</span>
            </div>
            <span className="text-2xl font-bold">{incorrectCount}</span>
            <span className="text-xs text-slate-400 font-medium">Incorrectas</span>
          </div>
        </div>

        <div className="flex items-center justify-around py-4 mb-10 border-y border-slate-800">
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Tiempo</span>
            <div className="flex items-center gap-1.5">
              <span className="material-icons text-[18px] text-primary">timer</span>
              <span className="font-semibold">{timeStr}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Ranking</span>
            <span className="font-semibold">{userRank ? `#${userRank}` : '-'}</span>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Puntuacion</span>
            <span className="text-[10px] text-slate-400">Puntuacion del ultimo test</span>
            <span className="font-semibold">{state.score}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Evaluacion del test</h3>
          <div className="space-y-3">
            {state.questions.map((question, index) => (
              <div key={question.id || index} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                {(() => {
                  const selectedAnswerIndex = state.answers[index];
                  const isIncorrect =
                    selectedAnswerIndex !== -1 && selectedAnswerIndex !== question.correctAnswerIndex;
                  const selectedAnswerText =
                    selectedAnswerIndex >= 0 && selectedAnswerIndex < question.options.length
                      ? question.options[selectedAnswerIndex]
                      : 'Sin respuesta';

                  return (
                    <>
                      <p className="text-sm font-semibold mb-2">
                        {index + 1}. {question.text}
                      </p>
                      {isIncorrect && (
                        <p className="text-xs text-red-400 mb-1">
                          Respuesta incorrecta: {selectedAnswerText}
                        </p>
                      )}
                      <p className="text-xs text-emerald-300 mb-1">
                        Respuesta correcta: {question.options[question.correctAnswerIndex]}
                      </p>
                      <p className="text-xs text-slate-400">
                        Explicacion: {question.explanation?.trim() || 'Sin explicacion disponible.'}
                      </p>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-6 pt-10 pb-10 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent z-30">
        <div className="flex flex-col gap-3">
          <button 
            onClick={onDashboard}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <span>Volver al inicio</span>
            <span className="material-icons text-[20px]">home</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <span className="material-icons text-[18px]">visibility</span>
              <span>Revisar</span>
            </button>
            <button 
              onClick={onDashboard}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="material-icons text-[18px]">refresh</span>
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
