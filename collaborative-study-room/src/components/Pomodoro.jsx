import { useState, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function PomodoroTimer({ roomId, onRunningChange }) {
  const { user } = useAuth();

  // --- CONFIGURATION (Logic Unchanged) ---
  const FOCUS_TIME = 25 * 60; 
  const BREAK_TIME = 5 * 60;  

  // --- STATE (Logic Unchanged) ---
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedHours, setSelectedHours] = useState(1); 
  const [mode, setMode] = useState("focus"); 
  const [cyclesTotal, setCyclesTotal] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // --- LOGIC FUNCTIONS (Logic Unchanged) ---
  const handleStartPlan = () => {
    const totalCycles = selectedHours * 2;
    setCyclesTotal(totalCycles);
    setCyclesCompleted(0);
    setMode("focus");
    setTimeLeft(FOCUS_TIME);
    setIsSessionActive(true);
    setIsRunning(true);
  };

  const saveSession = async () => {
    try {
      await addDoc(collection(db, "users", user.uid, "studySessions"), {
        duration: 25, 
        type: "pomodoro",
        roomId: roomId || "personal",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const switchPhase = () => {
    if (mode === "focus") {
      saveSession(); 
      const newCompleted = cyclesCompleted + 1;
      setCyclesCompleted(newCompleted);
      if (newCompleted >= cyclesTotal) {
        setIsSessionActive(false);
        setIsRunning(false);
        alert(`🎉 Goal Reached! You completed ${selectedHours} hours of study.`);
        setMode("focus"); 
        setTimeLeft(FOCUS_TIME);
        return;
      }
      setMode("break");
      setTimeLeft(BREAK_TIME);
    } else {
      setMode("focus");
      setTimeLeft(FOCUS_TIME);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            switchPhase(); 
            return 0; 
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, cyclesCompleted, cyclesTotal]); 

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsSessionActive(false);
    setCyclesCompleted(0);
    setMode("focus");
    setTimeLeft(FOCUS_TIME);
  };

  // --- UI DYNAMIC THEME HELPERS ---
  const isBreak = mode === "break";

  return (
    <div className={`p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-2 transition-all duration-700 flex flex-col items-center ${
      isBreak 
        ? "bg-emerald-50/50 border-emerald-100 backdrop-blur-md" 
        : "bg-white border-purple-50"
    }`}>
      
      {!isSessionActive ? (
        <div className="text-center w-full space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Focus Timer</h2>
            <p className="text-slate-400 text-sm mt-1">Set your study goal</p>
          </div>
          
          <div className="space-y-4">
            <select 
              value={selectedHours}
              onChange={(e) => setSelectedHours(Number(e.target.value))}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 text-slate-700 font-bold focus:border-purple-400 outline-none appearance-none cursor-pointer"
            >
              {[...Array(18)].map((_, i) => (
                <option key={i+1} value={i+1}>{i+1} {i+1 > 1 ? "Hours" : "Hour"} ({ (i+1)*2 } Cycles)</option>
              ))}
            </select>

            <button 
              onClick={handleStartPlan}
              className="w-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-indigo-100 transition-all"
            >
              Start Study Plan
            </button>
          </div>
          
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
             5-min breaks included
          </p>
        </div>
      ) : (
        <div className="text-center w-full">
          <div className="flex justify-between items-center mb-8">
            {/* DYNAMIC BADGE COLOR */}
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm transition-all duration-500 ${
              isBreak 
                ? "bg-emerald-500 text-white ring-4 ring-emerald-100" 
                : "bg-rose-500 text-white ring-4 ring-rose-100"
            }`}>
              {isBreak ? "☕ Break Time" : "🔥 Focus Mode"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-full">
              Cycle {Math.ceil((cyclesCompleted + 1) / 2)} of {cyclesTotal / 2}
            </span>
          </div>

          {/* DYNAMIC TIMER TEXT COLOR */}
          <div className={`text-8xl font-black mb-8 tracking-tighter tabular-nums transition-colors duration-500 ${
              isBreak ? "text-emerald-600" : "text-slate-800"
          }`}>
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-[2] py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${
                isRunning 
                  ? "bg-amber-400 text-white hover:bg-amber-500 shadow-amber-100" 
                  : (isBreak ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700")
              }`}
            >
              {isRunning ? "Pause" : "Resume"}
            </button>

            <button 
              onClick={handleReset}
              className="flex-1 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-all"
            >
              Reset
            </button>
          </div>
          
          <div className="mt-10">
            <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden">
              {/* DYNAMIC PROGRESS BAR COLOR */}
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    isBreak ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-600"
                }`} 
                style={{ width: `${(cyclesCompleted / cyclesTotal) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session Progress</span>
               <span className={`text-[10px] font-bold ${isBreak ? "text-emerald-600" : "text-indigo-600"}`}>
                 {Math.round((cyclesCompleted / cyclesTotal) * 100)}%
               </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PomodoroTimer;