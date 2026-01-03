import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";        
import { auth, db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore"; 
import { useAuth } from "../context/AuthContext";

import JoinRoom from "../components/JoinRoom";
import CreateRoom from "../components/CreateRoom";
import RoomList from "../components/RoomList";
import TaskManager from "../components/TaskManager";
import PomodoroTimer from "../components/Pomodoro"; 
import StudyTracker from "../components/StudyTracker"; 
import RoomSidebar from "../components/RoomSidebar"; // ✅ 1. IMPORT SIDEBAR

function Dashboard() {
  const { user } = useAuth(); 
  const [displayName, setDisplayName] = useState("Scholar");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const navigate = useNavigate(); 

  // --- FETCH USER DATA ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const data = userSnapshot.data();
            setDisplayName(data.fullName || data.username || "Scholar");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

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
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Hi, {displayName} 👋
          </h1>
          <p className="text-gray-500 text-sm">Welcome back to your workspace.</p>
        </div>
        
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

      {/* DASHBOARD CONTENT */}
      {selectedRoomId ? (
        // --- INSIDE A ROOM VIEW ---
        // ✅ 2. Changed Grid to 4 Columns (3 for Tasks, 1 for Sidebar)
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <TaskManager roomId={selectedRoomId} />
          </div>

          {/* Right Sidebar Area */}
          <div className="lg:col-span-1 space-y-6">
            {/* ✅ 3. Added RoomSidebar here */}
            <RoomSidebar roomId={selectedRoomId} />
            <PomodoroTimer roomId={selectedRoomId} />
          </div>

        </div>
      ) : (
        // --- MAIN DASHBOARD VIEW ---
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <StudyTracker />
            <div className="grid grid-cols-1 gap-6 mt-6">
              <CreateRoom />
              <JoinRoom />
            </div>
          </div>
          <div>
            <RoomList onSelectRoom={setSelectedRoomId} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;