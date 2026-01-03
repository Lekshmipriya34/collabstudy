import { useState, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function PomodoroTimer({ roomId }) {
  const { user } = useAuth();

  // --- CONFIGURATION ---
  const FOCUS_TIME = 25 * 60; // 25 mins in seconds
  const BREAK_TIME = 5 * 60;  // 5 mins in seconds

  // --- STATE ---
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  
  // Plan Logic
  const [selectedHours, setSelectedHours] = useState(1); // Default 1 hr
  const [mode, setMode] = useState("focus"); // 'focus' or 'break'
  const [cyclesTotal, setCyclesTotal] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // 1. Start the Plan based on Dropdown Selection
  const handleStartPlan = () => {
    // 1 Hour = 2 Full Cycles (25+5 + 25+5)
    const totalCycles = selectedHours * 2;
    
    setCyclesTotal(totalCycles);
    setCyclesCompleted(0);
    setMode("focus");
    setTimeLeft(FOCUS_TIME);
    setIsSessionActive(true);
    setIsRunning(true);
  };

  // 2. Save Session to Firebase (Only Focus Sessions)
  const saveSession = async () => {
    try {
      await addDoc(collection(db, "users", user.uid, "studySessions"), {
        duration: 25, 
        type: "pomodoro",
        roomId: roomId || "personal",
        createdAt: serverTimestamp(),
      });
      console.log("Session saved!");
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  // 3. Switch Phases (Focus <-> Break)
  const switchPhase = () => {
    if (mode === "focus") {
      // --- FOCUS ENDED ---
      saveSession(); // Save the 25 mins
      
      const newCompleted = cyclesCompleted + 1;
      setCyclesCompleted(newCompleted);

      // Check if plan finished
      if (newCompleted >= cyclesTotal) {
        setIsSessionActive(false);
        setIsRunning(false);
        alert(`🎉 Goal Reached! You completed ${selectedHours} hours of study.`);
        setMode("focus"); 
        setTimeLeft(FOCUS_TIME);
        return;
      }

      // Start Break
      setMode("break");
      setTimeLeft(BREAK_TIME);
      // Optional: Play a sound here
      
    } else {
      // --- BREAK ENDED ---
      setMode("focus");
      setTimeLeft(FOCUS_TIME);
    }
  };

  // 4. Timer Interval Logic
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

  // Format MM:SS
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center border-t-4 border-indigo-600">
      
      {!isSessionActive ? (
        // --- VIEW A: SELECTION SCREEN ---
        <div className="text-center w-full">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Pomodoro Timer</h2>
          <p className="text-gray-500 text-sm mb-4">How long do you want to study?</p>
          
          <div className="flex flex-col gap-4">
            {/* The Dropdown */}
            <div className="relative">
              <select 
                value={selectedHours}
                onChange={(e) => setSelectedHours(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                {/* Generate options 1 to 18 */}
                {[...Array(18)].map((_, i) => {
                  const hour = i + 1;
                  return (
                    <option key={hour} value={hour}>
                      {hour} Hour{hour > 1 ? "s" : ""} ({hour * 2} Cycles)
                    </option>
                  );
                })}
              </select>
              {/* Dropdown Arrow Icon (Optional visual) */}
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                ▼
              </div>
            </div>

            <button 
              onClick={handleStartPlan}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md"
            >
              Start Study Plan
            </button>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            Includes 5-min breaks between sessions.
          </p>
        </div>
      ) : (
        // --- VIEW B: ACTIVE TIMER ---
        <div className="text-center w-full">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
              mode === "focus" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
            }`}>
              {mode === "focus" ? "🔥 Focus Mode" : "☕ Break Time"}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              Cycle {Math.ceil((cyclesCompleted + 1) / 2) || 1} / {cyclesTotal / 2} Hours
            </span>
          </div>

          <div className={`text-6xl font-mono mb-6 transition-colors duration-500 ${
             mode === "break" ? "text-green-500" : "text-gray-800"
          }`}>
            {formatTime(timeLeft)}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2 rounded font-semibold text-white transition ${
                isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isRunning ? "Pause" : "Resume"}
            </button>

            <button 
              onClick={handleReset}
              className="px-6 py-2 rounded font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              Stop & Reset
            </button>
          </div>
          
          <div className="mt-6 w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" 
              style={{ width: `${(cyclesCompleted / cyclesTotal) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">Progress</p>

        </div>
      )}
    </div>
  );
}

export default PomodoroTimer;