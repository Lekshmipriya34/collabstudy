import ShoutOuts from "../components/ShoutOuts";
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
import RoomSidebar from "../components/RoomSidebar";
import VideoRoom from "../components/VideoRoom";
import FlashcardManager from "../components/FlashcardManager";
import CollaborativeEditor from "../components/CollaborativeEditor"; 

import RoomResources from "../components/RoomResources";
import UniversalLibrary from "../components/UniversalLibrary";

function Dashboard() {
  const { user } = useAuth(); 
  const [displayName, setDisplayName] = useState("SCHOLAR");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isFlowActive, setIsFlowActive] = useState("focus");
  
  // NEW: State to hold the current room's name
  const [currentRoomName, setCurrentRoomName] = useState("");

  const navigate = useNavigate(); 

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const data = userSnapshot.data();
            const name = data.fullName || data.username || "Scholar";
            setDisplayName(name.toUpperCase());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // NEW: Fetch Room Name whenever a room is selected
  useEffect(() => {
    const fetchRoomName = async () => {
      if (!selectedRoomId) {
        setCurrentRoomName("");
        return;
      }
      try {
        const roomDoc = await getDoc(doc(db, "rooms", selectedRoomId));
        if (roomDoc.exists()) {
          setCurrentRoomName(roomDoc.data().name || "STUDY ROOM");
        }
      } catch (error) {
        console.error("Error fetching room details:", error);
      }
    };

    fetchRoomName();
  }, [selectedRoomId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div
      className={`min-h-screen p-6 font-mono text-white transition-all duration-1000
        ${
          isFlowActive === "break"
            ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700"
            : "bg-gradient-to-b from-[#e879f9] to-[#4c1d95]"
        }
      `}
    >
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        
        {/* DYNAMIC HEADER TEXT */}
        <div>
          {selectedRoomId ? (
            <>
              <h1 className="text-4xl font-bold tracking-widest drop-shadow-md flex items-center gap-3">
                <span className="bg-white/20 px-3 py-1 rounded-xl text-2xl border border-white/30">🎧</span>
                {currentRoomName.toUpperCase()}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
                </span>
                <span className="text-purple-200/70 text-xs border-l border-white/20 pl-3">
                  ROOM CODE: <span className="font-mono text-white font-bold tracking-wider select-all">{selectedRoomId}</span>
                </span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold tracking-widest drop-shadow-md">
                HI, {displayName} 👋
              </h1>
              <p className="text-purple-200 text-sm mt-1 tracking-wide uppercase">
                Welcome back to your workspace.
              </p>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {selectedRoomId && (
            <button 
              onClick={() => setSelectedRoomId(null)}
              className="text-sm font-bold bg-white/10 border border-white/20 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-white/20 transition-all tracking-wide"
            >
              ← LEAVE ROOM
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="bg-[#1a1a1a] border-2 border-[#f0abfc] text-white px-6 py-2 rounded-xl shadow-lg hover:bg-[#d8a4e2] hover:text-black hover:border-[#d8a4e2] transition-all duration-300 font-bold tracking-wider text-sm"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* DASHBOARD CONTENT */}
      {selectedRoomId ? (
        /* ===== INSIDE ROOM VIEW ===== */
        <div className="relative">

          {/* Floating ShoutOuts */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000]">
            <ShoutOuts roomId={selectedRoomId} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Main Column */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Row 1: Video + Flashcards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <VideoRoom roomId={selectedRoomId} />
                 
                 <FlashcardManager 
                    basePath={`rooms/${selectedRoomId}`} 
                    title="Room Decks" 
                 />
              </div>

              {/* Row 2: Shared Notes */}
              <CollaborativeEditor 
                roomId={selectedRoomId} 
              />

              {/* Row 3: Tasks + Room Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TaskManager roomId={selectedRoomId} />
                <RoomResources roomId={selectedRoomId} />
              </div>
            </div>

            
            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <PomodoroTimer
                roomId={selectedRoomId}
                onRunningChange={setIsFlowActive} 
              />

              <div className="bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-[2.5rem] shadow-xl p-6 text-white border border-white/10">
                <RoomSidebar 
                  roomId={selectedRoomId} 
                  isRunning={true} 
                  onLeave={() => setSelectedRoomId(null)}
                />
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ===== MAIN DASHBOARD VIEW ===== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <StudyTracker />

            {/* Private Flashcards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FlashcardManager 
                   basePath={`users/${user?.uid}`} 
                   title="My Private Decks" 
                />
                
                <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
                    <h3 className="text-xl font-bold mb-2">Need a Break?</h3>
                    <p className="text-sm opacity-80 mb-4">Review your private flashcards or join a room to study with friends.</p>
                </div>
            </div>

            {/* Universal Library */}
            <UniversalLibrary />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
             <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 tracking-widest text-[#f0abfc]">
                ROOM CONTROLS
              </h2>
              <div className="space-y-6">
                <CreateRoom />
                <div className="border-t border-white/10 pt-6">
                  <JoinRoom />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
              <h2 className="text-xl font-bold mb-6 tracking-widest text-[#f0abfc]">
                YOUR STUDY ROOMS
              </h2>
              <RoomList onSelectRoom={setSelectedRoomId} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Dashboard;