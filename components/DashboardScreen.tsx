
import React from 'react';
import { Subject } from '../types';
import { SUBJECTS } from '../constants';

interface DashboardScreenProps {
  onStartQuiz: (subject: Subject) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenClassification: () => void;
  customSubjects?: Subject[];
  userData?: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onStartQuiz, onLogout, onOpenSettings, onOpenClassification, customSubjects, userData }) => {
  const displaySubjects = customSubjects || SUBJECTS;
  const displayXp = userData?.total_xp || "1,250";
  const displayName = userData?.name || "Alex";
  const subjectImageById: Record<string, string> = {
    josemaria_logrono_1915_1925: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Josemaria_Escriva.jpg',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background-dark/80 ios-blur border-b border-primary/10 px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                alt={displayName} 
                className="w-12 h-12 rounded-full border-2 border-primary" 
                src={userData?.profile_pic || "https://picsum.photos/seed/alex/200"}
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background-dark"></div>
            </div>
            <div>
              <h1 className="text-lg text-slate-100 font-bold">{displayName}</h1>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-primary font-semibold hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
              >
                Settings
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 border border-primary/30 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="material-icons-outlined text-yellow-500 text-sm">stars</span>
              <span className="text-primary font-bold">{displayXp.toLocaleString()} XP</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
              aria-label="Cerrar sesion"
              title="Cerrar sesion"
            >
              <span className="material-icons-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 pt-6 pb-32">
        <div className="mb-8">
          <div className="relative group">
            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary">search</span>
            <input 
              className="w-full bg-slate-800/50 border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 text-sm outline-none transition-all" 
              placeholder="Busca una asignatura..." 
              type="text"
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Asignaturas</h2>
          <div className="grid grid-cols-2 gap-4">
            {displaySubjects.map((subject) => {
              const cardImage = subject.imageUrl || subjectImageById[subject.id];
              return (
              <div 
                key={subject.id}
                onClick={() => onStartQuiz(subject)}
                className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center text-center transition-all active:scale-95 cursor-pointer hover:border-primary/50`}
              >
                {cardImage ? (
                  <img
                    src={cardImage}
                    alt={subject.name}
                    className="w-20 h-20 rounded-xl object-cover mb-4 border border-slate-600/60"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-14 h-14 bg-opacity-20 rounded-full flex items-center justify-center mb-4 text-primary bg-primary`}>
                    <span className="material-icons-outlined text-3xl">{subject.icon}</span>
                  </div>
                )}
                <h3 className="font-bold text-lg mb-1">{subject.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{subject.description}</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${subject.progress || 0}%` }}
                  ></div>
                </div>
                <span className="text-[10px] mt-2 font-medium uppercase text-slate-500">Practicar ahora</span>
              </div>
              );
            })}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background-dark/90 ios-blur border-t border-slate-800 px-6 py-4 pb-8 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button className="flex flex-col items-center gap-1 text-primary">
            <span className="material-icons-outlined">home</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Inicio</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 transition-colors hover:text-primary">
            <span className="material-icons-outlined">leaderboard</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Estadisticas</span>
          </button>
          <div className="relative -mt-12">
            <button className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform">
              <span className="material-icons-outlined text-white text-3xl">play_arrow</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenClassification}
            className="flex flex-col items-center gap-1 text-slate-400 transition-colors hover:text-primary"
          >
            <span className="material-icons-outlined">emoji_events</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Clasificacion</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex flex-col items-center gap-1 text-slate-400 transition-colors hover:text-primary"
          >
            <span className="material-icons-outlined">settings</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardScreen;
