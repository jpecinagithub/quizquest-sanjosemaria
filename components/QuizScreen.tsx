
import React, { useState, useEffect } from 'react';
import { QuizState } from '../types';

interface QuizScreenProps {
  state: QuizState;
  onFinish: (score: number, answers: number[]) => void;
  onClose: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ state, onFinish, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);

  const currentQuestion = state.questions[currentIndex];
  const progress = ((currentIndex) / state.questions.length) * 100;
  const timeProgress = (timeLeft / 30) * 113.1; // SVG dashoffset logic

  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedOption ?? -1;
    setAnswers(newAnswers);

    if (currentIndex < state.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setTimeLeft(30);
    } else {
      // Calculate score
      const score = newAnswers.reduce((acc, ans, idx) => {
        return acc + (ans === state.questions[idx].correctAnswerIndex ? 1 : 0);
      }, 0);
      const finalScore = Math.round((score / state.questions.length) * 100);
      onFinish(finalScore, newAnswers);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-6 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 text-primary transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">{state.subject.name}</span>
            <span className="text-sm font-medium">Pregunta {currentIndex + 1} de {state.questions.length}</span>
          </div>
          <div className="relative flex items-center justify-center">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle className="text-slate-800" cx="20" cy="20" fill="transparent" r="18" stroke="currentColor" strokeWidth="3"></circle>
              <circle className="text-primary transition-all duration-1000" cx="20" cy="20" fill="transparent" r="18" stroke="currentColor" strokeDasharray="113.1" strokeDashoffset={113.1 - timeProgress} strokeWidth="3"></circle>
            </svg>
            <span className="absolute text-[10px] font-bold">{timeLeft}s</span>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </header>

      <main className="flex-1 px-6 flex flex-col justify-center space-y-8">
        <div className="relative bg-slate-800/50 border border-slate-700/50 p-8 rounded-xl shadow-2xl">
          <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">
            Opcion multiple
          </div>
          <p className="text-xl md:text-2xl font-medium leading-relaxed">
            {currentQuestion.text}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, idx) => (
            <button 
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`group flex items-center p-4 w-full rounded-xl transition-all border-2 ${
                selectedOption === idx 
                  ? 'bg-primary/20 border-primary' 
                  : 'bg-slate-800/40 border-slate-700 hover:border-primary'
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-colors ${
                selectedOption === idx ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-primary group-hover:text-white'
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className={`ml-4 text-lg font-medium ${selectedOption === idx ? 'text-white' : 'text-slate-200'}`}>
                {option}
              </span>
              <div className="ml-auto">
                <span className={`material-icons text-primary ${selectedOption === idx ? 'opacity-100' : 'opacity-0'}`}>
                  check_circle
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="px-6 py-8 flex items-center justify-between">
        <button 
          onClick={handleNext}
          className="flex items-center space-x-2 text-slate-400 font-semibold px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-icons text-sm">skip_next</span>
          <span>Saltar pregunta</span>
        </button>
        <button 
          onClick={handleNext}
          disabled={selectedOption === null}
          className={`px-8 py-3 rounded-xl font-bold transition-all transform active:translate-y-1 ${
            selectedOption !== null 
              ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {currentIndex === state.questions.length - 1 ? 'Finalizar quiz' : 'Enviar respuesta'}
        </button>
      </footer>
    </div>
  );
};

export default QuizScreen;
