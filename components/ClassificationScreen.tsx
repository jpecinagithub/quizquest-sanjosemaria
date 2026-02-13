import React from 'react';
import { AuthUser } from '../types';
import { MOCK_CLASSIFICATION_BASE } from '../constants';

interface ClassificationScreenProps {
  onBack: () => void;
  userData?: AuthUser | null;
}

const ClassificationScreen: React.FC<ClassificationScreenProps> = ({ onBack, userData }) => {
  const currentUserName = userData?.name?.trim();
  const currentUserXp = Number(userData?.total_xp || 0);

  const ranking = React.useMemo(() => {
    const rows = [...MOCK_CLASSIFICATION_BASE];
    if (currentUserName) {
      const exists = rows.some((row) => row.name.toLowerCase() === currentUserName.toLowerCase());
      if (!exists) {
        rows.push({
          name: currentUserName,
          xp: currentUserXp,
          profile_pic: userData?.profile_pic || `https://picsum.photos/seed/${encodeURIComponent(currentUserName)}/96`,
        });
      }
    }
    return rows
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);
  }, [currentUserName, currentUserXp]);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
          aria-label="Volver"
          title="Volver"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold">Clasificacion</h1>
          <p className="text-xs text-slate-400">Top 10 de usuarios</p>
        </div>
      </header>

      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        {ranking.map((row, index) => {
          const position = index + 1;
          const isCurrentUser = Boolean(currentUserName) && row.name.toLowerCase() === currentUserName.toLowerCase();
          return (
            <div
              key={`${row.name}-${position}`}
              className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/40 last:border-b-0 ${
                isCurrentUser ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-700/70 flex items-center justify-center text-sm font-bold text-slate-200 shrink-0">
                  {position}
                </div>
                <img
                  src={isCurrentUser && userData?.profile_pic ? userData.profile_pic : row.profile_pic}
                  alt={row.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600/60 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{row.name}</p>
                  {isCurrentUser && <p className="text-[10px] text-primary uppercase tracking-wider">Tu posicion</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">{row.xp.toLocaleString()} XP</p>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
};

export default ClassificationScreen;
