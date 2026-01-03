import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";        
import { auth } from "../firebase";             

import JoinRoom from "../components/JoinRoom";
import CreateRoom from "../components/CreateRoom";
import RoomList from "../components/RoomList";
import TaskManager from "../components/TaskManager";
import PomodoroTimer from "../components/Pomodoro"; // Imported
import StudyTracker from "../components/StudyTracker"; // Imported

function Dashboard() {
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const navigate = useNavigate(); 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="flex items-center gap-4">
          {selectedRoomId && (
            <button 
              onClick={() => setSelectedRoomId(null)}
              className="text-sm text-blue-600 underline hover:text-blue-800"
            >
              ← Back to Room List
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-md transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* CONDITIONAL RENDERING */}
      {selectedRoomId ? (
        // --- INSIDE A ROOM ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tasks */}
          <div className="lg:col-span-2">
            <TaskManager roomId={selectedRoomId} />
          </div>

          {/* Right Column: Tools (Pomodoro) */}
          <div className="space-y-6">
             {/* Pomodoro Timer now appears inside the room */}
            <PomodoroTimer roomId={selectedRoomId} />
            
            {/* Optional: You can also put a Room-specific tracker here if you want */}
            {/* <StudyTracker roomId={selectedRoomId} /> */}
          </div>
        </div>
      ) : (
        // --- MAIN DASHBOARD ---
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Actions */}
          <div>
            {/* Study Tracker works globally here (Personal Mode) */}
            <StudyTracker />
            
            <div className="grid grid-cols-1 gap-6 mt-6">
              <CreateRoom />
              <JoinRoom />
            </div>
          </div>

          {/* Right Column: Room List */}
          <div>
            <RoomList onSelectRoom={setSelectedRoomId} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;