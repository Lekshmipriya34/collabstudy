import { useState, useEffect } from "react";

function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          // Check if timer finished
          if (prevTime <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRunning]); // ✅ Fixed: Removed 'timeLeft' from dependencies

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Pomodoro Timer 🍅</h2>
      
      <div className={`text-6xl font-mono mb-6 ${timeLeft === 0 ? "text-red-500" : "text-gray-700"}`}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>

      <div className="flex gap-4">
        {!isRunning ? (
          <button 
            onClick={() => setIsRunning(true)}
            className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
          >
            {timeLeft === 0 ? "Restart" : "Start"}
          </button>
        ) : (
          <button 
            onClick={() => setIsRunning(false)}
            className="bg-yellow-500 text-white px-6 py-2 rounded font-semibold hover:bg-yellow-600 transition"
          >
            Pause
          </button>
        )}

        <button 
          onClick={handleReset}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-semibold hover:bg-gray-300 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default PomodoroTimer;