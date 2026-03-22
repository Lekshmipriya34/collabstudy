import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";        
import { auth, db } from "../firebase"; 
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore"; 
import { useAuth } from "../context/AuthContext";

// --- REQUIRED COMPONENT IMPORTS ---
import JoinRoom from "../components/JoinRoom";
import CreateRoom from "../components/CreateRoom";
import RoomList from "../components/RoomList";
import TaskManager from "../components/TaskManager";
import PomodoroTimer from "../components/Pomodoro"; 
import StudyTracker from "../components/StudyTracker"; 
import VideoRoom from "../components/VideoRoom";
import FlashcardManager from "../components/FlashcardManager";
import FlashcardDeck from "../components/FlashcardDeck"; 
import CollaborativeEditor from "../components/CollaborativeEditor"; 
import RoomResources from "../components/RoomResources";
import UniversalLibrary from "../components/UniversalLibrary";
import EncryptedChat from "../components/EncryptedChat";
import AmbientSoundscape from "../components/AmbientSoundscape";

function Dashboard() {
  const { user } = useAuth(); 
  const navigate = useNavigate(); 
  
  const [displayName, setDisplayName] = useState("SCHOLAR");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isFlowActive, setIsFlowActive] = useState("focus");
  const [activeDeck, setActiveDeck] = useState(null); 
  
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [currentRoomCode, setCurrentRoomCode] = useState("");
  const [currentRoomHostId, setCurrentRoomHostId] = useState(null); 
  
  const [userStats, setUserStats] = useState({ 
    streak: 0, pomodorosToday: 0, hoursThisWeek: 0, flashcardAccuracy: 87 
  });

  // 1. Fetch User Profile
  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) setDisplayName(snap.data().fullName?.toUpperCase() || "SCHOLAR");
      });
    }
  }, [user]);

  // 2. Navigation: Enter Room
  const enterRoom = async (roomId) => {
    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (roomDoc.exists()) {
        const data = roomDoc.data();
        setCurrentRoomName(data.name || "STUDY ROOM");
        setCurrentRoomCode(data.code || data.roomCode || roomId);
        setCurrentRoomHostId(data.createdBy);
      }
      setSelectedRoomId(roomId); 
    } catch (error) {
      console.error("Room Access Error:", error);
      setSelectedRoomId(roomId); 
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); navigate("/login"); }
    catch (error) { console.error(error); }
  };

  const glassCard = "bg-white/80 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-[2.5rem]";

  return (
    <div className={`min-h-screen p-6 font-mono text-white transition-all duration-1000 ${isFlowActive === "break" ? "bg-gradient-to-b from-emerald-400 to-emerald-700" : "bg-gradient-to-b from-[#e879f9] to-[#4c1d95]"}`}>
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          {selectedRoomId && (
            <button 
              onClick={() => setSelectedRoomId(null)} 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-2xl uppercase">
              {selectedRoomId ? currentRoomName : `HI, ${displayName} 👋`}
            </h1>
            <p className="text-purple-100/60 text-[10px] mt-2 tracking-[0.4em] font-bold uppercase">
              {selectedRoomId ? `LIVE ROOM ID: ${currentRoomCode}` : "Workspace Overview"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsFlowActive(isFlowActive === "break" ? "focus" : "break")}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 shadow-xl ${isFlowActive === "break" ? "bg-emerald-500 border-emerald-300 text-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}
          >
            <span className="text-xl">{isFlowActive === "break" ? "🧘" : "☕"}</span>
            <div className="text-[10px] font-black uppercase tracking-tight hidden sm:block">
               {isFlowActive === "break" ? "Resting" : "Take Break"}
            </div>
          </button>
          <button onClick={handleLogout} className="bg-black/90 border border-white/10 text-white px-6 py-3 rounded-2xl shadow-2xl hover:bg-white hover:text-black transition-all font-black tracking-widest text-[10px]">LOGOUT</button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto">
        {selectedRoomId ? (
          /* ==========================================================
             INSIDE THE STUDY ROOM: COLLABORATIVE FEATURES
             ========================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="lg:col-span-3 space-y-6">
              
              {/* TOP ROW: VIDEO & FLASHCARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <VideoRoom roomId={selectedRoomId} />
                 <div className={`${glassCard} p-8 flex flex-col h-[400px] shadow-indigo-500/10`}>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase mb-4 italic">Room Decks</h2>
                    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                       <FlashcardManager basePath={`rooms/${selectedRoomId}`} title="" onSelectDeck={(deck) => setActiveDeck(deck)} />
                    </div>
                 </div>
              </div>

              {/* SHARED EDITOR */}
              <div className={`${glassCard} p-1 shadow-indigo-500/10`}>
                <CollaborativeEditor roomId={selectedRoomId} />
              </div>

              {/* BOTTOM ROW: TASKS & FILES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TaskManager roomId={selectedRoomId} />
                <RoomResources roomId={selectedRoomId} isHost={currentRoomHostId === user?.uid} />
              </div>
            </div>
            
            {/* SIDEBAR: POMODORO, SOUNDS, & CHAT */}
            <div className="lg:col-span-1 space-y-6">
              <PomodoroTimer roomId={selectedRoomId} onRunningChange={setIsFlowActive} />
              <AmbientSoundscape roomId={selectedRoomId} />
              <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-1 shadow-2xl">
                <EncryptedChat roomId={selectedRoomId} roomCode={currentRoomCode} />
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================================
             MAIN DASHBOARD: OVERVIEW, DECKS & LIBRARY
             ========================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-3 space-y-8">
              
              {/* ANALYTICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Pomodoros", val: userStats.pomodorosToday, color: "border-purple-400" },
                  { label: "Streak", val: `${userStats.streak}d`, color: "border-amber-400" },
                  { label: "Accuracy", val: `${userStats.flashcardAccuracy}%`, color: "border-emerald-400" },
                  { label: "Total Hours", val: `${userStats.hoursThisWeek}h`, color: "border-rose-400" }
                ].map((item, i) => (
                  <div key={i} className={`bg-white/90 rounded-3xl p-6 shadow-xl border-t-4 ${item.color} text-slate-800 hover:-translate-y-1 transition-transform`}>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</div>
                    <div className="text-3xl font-black">{item.val}</div>
                  </div>
                ))}
              </div>

              {/* HEATMAP */}
              <div className={`${glassCard} p-8`}>
                  <h2 className="text-xl font-black text-slate-800 mb-6 tracking-tight uppercase">Activity Map</h2>
                  <StudyTracker />
              </div>
              
              {/* DECKS & GLOBAL LIBRARY */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="bg-white/80 backdrop-blur-3xl border border-white/30 shadow-2xl rounded-[2.5rem] p-8 flex flex-col h-[600px]">
                  {activeDeck ? (
                    <FlashcardDeck deckName={activeDeck.name} collectionPath={`users/${user?.uid}/decks/${activeDeck.id}/cards`} onBack={() => setActiveDeck(null)} />
                  ) : (
                    <>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase mb-6">Private Decks</h2>
                      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                        <FlashcardManager basePath={`users/${user?.uid}`} title="" onSelectDeck={(deck) => setActiveDeck(deck)} />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2.5rem] p-8 flex flex-col h-[600px]">
                  <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6">Global Library</h2>
                  <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    <UniversalLibrary />
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBAR: ROOM LIST & ACTIONS */}
            <div className="lg:col-span-1 space-y-6 sticky top-6">
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-[2.5rem] shadow-2xl">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-[#f0abfc] uppercase mb-4 px-2">Management</h2>
                <div className="flex flex-col gap-4">
                  <CreateRoom />
                  <div className="border-t border-white/5 pt-4"><JoinRoom /></div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-[2.5rem] shadow-2xl">
                <h2 className="text-lg font-black mb-6 tracking-widest text-[#f0abfc] uppercase text-center italic">Active Rooms</h2>
                <RoomList onSelectRoom={enterRoom} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;