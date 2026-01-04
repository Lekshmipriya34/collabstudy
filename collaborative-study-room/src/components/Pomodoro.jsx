import { useState, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function PomodoroTimer({ roomId }) {
  const { user } = useAuth();

  // CONFIG
  const FOCUS_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  // STATE
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedHours, setSelectedHours] = useState(1);
  const [mode, setMode] = useState("focus");
  const [cyclesTotal, setCyclesTotal] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const isBreak = mode === "break";

  // START
  const handleStartPlan = () => {
    const totalCycles = selectedHours * 2;
    setCyclesTotal(totalCycles);
    setCyclesCompleted(0);
    setMode("focus");
    setTimeLeft(FOCUS_TIME);
    setIsSessionActive(true);
    setIsRunning(true);
  };

  // SAVE SESSION
  const saveSession = async () => {
    try {
      await addDoc(collection(db, "users", user.uid, "studySessions"), {
        duration: 25,
        type: "pomodoro",
        roomId: roomId || "personal",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // SWITCH FOCUS / BREAK
  const switchPhase = () => {
    if (mode === "focus") {
      saveSession();
      const completed = cyclesCompleted + 1;
      setCyclesCompleted(completed);

      if (completed >= cyclesTotal) {
        setIsSessionActive(false);
        setIsRunning(false);
        alert("🎉 Study goal completed!");
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

  // TIMER
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          switchPhase();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, cyclesCompleted]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsSessionActive(false);
    setCyclesCompleted(0);
    setMode("focus");
    setTimeLeft(FOCUS_TIME);
  };

  return (
    <div
      className={`p-8 rounded-[2rem] transition-all duration-700 shadow-xl border-2
      ${
        isBreak
          ? "bg-emerald-500 border-emerald-300 text-white"
          : "bg-white border-purple-100 text-slate-800"
      }`}
    >
      {!isSessionActive ? (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-black">Focus Timer</h2>
          <p className="opacity-70">Set your study goal</p>

          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(Number(e.target.value))}
            className="w-full p-4 rounded-2xl border font-bold text-slate-700"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} Hour ({(i + 1) * 2} Cycles)
              </option>
            ))}
          </select>

          <button
            onClick={handleStartPlan}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold"
          >
            Start Study Plan
          </button>

          <p className="text-xs opacity-60 uppercase">
            5-min breaks included
          </p>
        </div>
      ) : (
        <div className="text-center">
          {/* MODE BADGE */}
          <div className="flex justify-between mb-6">
            <span
              className={`px-4 py-1 rounded-full text-xs font-black tracking-widest
              ${
                isBreak
                  ? "bg-white text-emerald-600"
                  : "bg-rose-500 text-white"
              }`}
            >
              {isBreak ? "☕ BREAK MODE" : "🔥 FOCUS MODE"}
            </span>

            <span className="text-xs opacity-70">
              Cycle {Math.ceil((cyclesCompleted + 1) / 2)} of{" "}
              {cyclesTotal / 2}
            </span>
          </div>

          {/* TIMER */}
          <div className="text-8xl font-black mb-8">
            {formatTime(timeLeft)}
          </div>

          {/* BUTTONS */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-4 rounded-2xl font-bold uppercase
              ${
                isRunning
                  ? "bg-yellow-400 text-black"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Resume"}
            </button>

            <button
              onClick={handleReset}
              className="flex-1 py-4 rounded-2xl bg-white/70 text-black font-bold"
            >
              Reset
            </button>
          </div>

          {/* PROGRESS */}
          <div className="mt-8">
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-700"
                style={{
                  width: `${(cyclesCompleted / cyclesTotal) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs mt-2 opacity-70">Session Progress</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PomodoroTimer;
