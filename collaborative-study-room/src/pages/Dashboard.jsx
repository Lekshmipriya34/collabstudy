import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";        
import { auth, db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore"; 
import { useAuth } from "../context/AuthContext";

// Component Imports
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
  const [userStats] = useState({ streak: 0, pomodorosToday: 0, hoursThisWeek: 0, flashcardAccuracy: 87 });

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) setDisplayName(snap.data().fullName?.toUpperCase() || "SCHOLAR");
      });
    }
  }, [user]);

  const enterRoom = async (roomId) => {
    const roomDoc = await getDoc(doc(db, "rooms", roomId));
    if (roomDoc.exists()) {
      const data = roomDoc.data();
      setCurrentRoomName(data.name || "STUDY ROOM");
      setCurrentRoomCode(data.code || data.roomCode || roomId);
      setCurrentRoomHostId(data.createdBy);
    }
    setSelectedRoomId(roomId);
  };

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const focusBg = "bg-gradient-to-b from-[#e879f9] to-[#4c1d95]";
  const breakBg = "bg-gradient-to-b from-[#34d399] to-[#065f46]";

  return (
    <div className={`min-h-screen p-6 font-mono text-white transition-all duration-1000 ${isFlowActive === "break" ? breakBg : focusBg}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-6">
          {selectedRoomId && (
            <button onClick={() => setSelectedRoomId(null)} className="p-4 bg-white/10 hover:bg-white/20 rounded-[1.5rem] border border-white/10 shadow-xl transition active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter drop-shadow-md">
              {selectedRoomId ? currentRoomName : `HI, ${displayName} 👋`}
            </h1>
            <p className="text-white/60 text-[10px] mt-2 tracking-[0.4em] font-bold uppercase">
              {selectedRoomId ? `LIVE ROOM ID: ${currentRoomCode}` : "Workspace Overview"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsFlowActive(isFlowActive === "break" ? "focus" : "break")} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border shadow-xl transition-all duration-500 ${isFlowActive === "break" ? "bg-emerald-500 border-emerald-300" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
            <span className="text-xl">{isFlowActive === "break" ? "🧘" : "☕"}</span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Take Break</span>
          </button>
          <button onClick={handleLogout} className="bg-black/90 text-white px-8 py-4 rounded-[1.5rem] font-black tracking-[0.2em] text-[10px] shadow-2xl hover:bg-white hover:text-black transition-all">LOGOUT</button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto">
        {selectedRoomId ? (
          <div className="grid grid-cols-12 gap-6 items-start animate-in fade-in slide-in-from-bottom duration-700">
            
            {/* LEFT: VIDEO ROOM */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-[#1a1b4b]/80 backdrop-blur-md rounded-[2.5rem] p-1 border border-white/10 shadow-2xl overflow-hidden min-h-[350px]">
                <VideoRoom roomId={selectedRoomId} />
              </div>
            </div>

            {/* CENTER: STUDY DECKS */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/20 shadow-inner min-h-[350px] flex flex-col">
                {activeDeck ? (
                  <FlashcardDeck deckName={activeDeck.name} collectionPath={`rooms/${selectedRoomId}/decks/${activeDeck.id}/cards`} onBack={() => setActiveDeck(null)} />
                ) : (
                  <>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase italic mb-4">My Study Decks</h2>
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                      <FlashcardManager basePath={`rooms/${selectedRoomId}`} onSelectDeck={(deck) => setActiveDeck(deck)} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: FOCUS TIMER & MUSIC SECTION (STACKED LIKE SCREENSHOT) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
              {/* TIMER BOX */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-purple-100 text-slate-800">
                <PomodoroTimer roomId={selectedRoomId} onRunningChange={setIsFlowActive} />
              </div>
              
              {/* MUSIC BOX */}
              <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10 shadow-2xl">
                 <h2 className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase mb-4 px-2 italic">Room Vibe</h2>
                 <AmbientSoundscape roomId={selectedRoomId} />
              </div>
            </div>
            
            {/* MIDDLE ROW */}
            <div className="col-span-12 lg:col-span-9">
              <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl min-h-[500px] overflow-hidden">
                <CollaborativeEditor roomId={selectedRoomId} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3">
              <div className="bg-indigo-900/40 backdrop-blur-md rounded-[2.5rem] p-1 border border-white/20 shadow-2xl h-full min-h-[500px] overflow-hidden">
                <EncryptedChat roomId={selectedRoomId} roomCode={currentRoomCode} />
              </div>
            </div>
            
            {/* BOTTOM ROW */}
            <div className="col-span-12 lg:col-span-5"><TaskManager roomId={selectedRoomId} /></div>
            <div className="col-span-12 lg:col-span-7"><RoomResources roomId={selectedRoomId} isHost={currentRoomHostId === user?.uid} /></div>
          </div>
        ) : (
          /* DASHBOARD OVERVIEW */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-3 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{ label: "Pomodoros", val: userStats.pomodorosToday, color: "border-purple-400" }, { label: "Streak", val: `${userStats.streak}d`, color: "border-amber-400" }, { label: "Accuracy", val: `${userStats.flashcardAccuracy}%`, color: "border-emerald-400" }, { label: "Total Hours", val: `${userStats.hoursThisWeek}h`, color: "border-rose-400" }].map((item, i) => (
                  <div key={i} className={`bg-white rounded-3xl p-6 shadow-xl border-t-4 ${item.color} text-slate-800 transition hover:-translate-y-1`}><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{item.label}</div><div className="text-3xl font-black">{item.val}</div></div>
                ))}
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/40"><h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Activity Map</h2><StudyTracker /></div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[600px]">
                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col">{activeDeck ? <FlashcardDeck deckName={activeDeck.name} collectionPath={`users/${user?.uid}/decks/${activeDeck.id}/cards`} onBack={() => setActiveDeck(null)} /> : <FlashcardManager basePath={`users/${user?.uid}`} onSelectDeck={(deck) => setActiveDeck(deck)} />}</div>
                <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col border border-white/20"><h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Global Library</h2><UniversalLibrary /></div>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6 sticky top-6">
              <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 shadow-2xl border border-white/20">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-[#f0abfc] uppercase mb-4 px-2">Management</h2>
                <div className="flex flex-col gap-4"><CreateRoom /><div className="border-t border-white/5 pt-4"><JoinRoom /></div></div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 shadow-2xl border border-white/20">
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