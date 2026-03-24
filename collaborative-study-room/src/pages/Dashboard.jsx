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
  const [copied, setCopied] = useState(false); 
  
  // MODAL & UI STATES
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [modalIcon, setModalIcon] = useState("📚");
  const [modalColor, setModalColor] = useState("green");
  const [modalPrivacy, setModalPrivacy] = useState("public");
  
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalDescription, setModalDescription] = useState("What are you studying?");
  const [modalMaxMembers, setModalMaxMembers] = useState("10");

  const iconsList = ['📚', '🔬', '🧮', '💻', '🎨', '🌍', '🛸', '🎵', '📝', '🏛️', '🧬', '🚀'];
  const colorsList = [
    { id: 'purple', bg: 'bg-purple-600' },
    { id: 'blue', bg: 'bg-blue-600' },
    { id: 'green', bg: 'bg-emerald-600' },
    { id: 'red', bg: 'bg-rose-600' },
    { id: 'orange', bg: 'bg-amber-600' }
  ];

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

  const handleCopyCode = () => {
    if (currentRoomCode) {
      navigator.clipboard.writeText(currentRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openSettingsModal = () => {
    setModalRoomName(currentRoomName);
    setIsSettingsModalOpen(true);
  };

  const saveRoomSettings = () => {
    if(modalRoomName.trim() !== "") {
      setCurrentRoomName(modalRoomName);
    }
    setIsSettingsModalOpen(false);
  };

  const focusBg = "bg-gradient-to-b from-[#e879f9] to-[#4c1d95]";
  const breakBg = "bg-gradient-to-b from-[#34d399] to-[#065f46]";

  return (
    <div className={`min-h-screen p-6 font-mono text-white transition-all duration-1000 ${isFlowActive === "break" ? breakBg : focusBg} relative`}>
      
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
          <div className="grid grid-cols-12 gap-6 items-stretch animate-in fade-in slide-in-from-bottom duration-700">
            
            {/* LEFT: VIDEO ROOM */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-[#1a1b4b]/80 backdrop-blur-md rounded-[2.5rem] p-1 border border-white/10 shadow-2xl overflow-hidden h-full">
                <VideoRoom roomId={selectedRoomId} />
              </div>
            </div>

            {/* CENTER: STUDY DECKS */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-[#fcf8fa] backdrop-blur-md rounded-[2.5rem] p-8 border border-white/20 shadow-inner flex flex-col w-full h-full">
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase italic mb-4">My Study Decks</h2>
                {activeDeck ? (
                  <FlashcardDeck deckName={activeDeck.name} collectionPath={`rooms/${selectedRoomId}/decks/${activeDeck.id}/cards`} onBack={() => setActiveDeck(null)} />
                ) : (
                  <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <FlashcardManager basePath={`rooms/${selectedRoomId}`} onSelectDeck={(deck) => setActiveDeck(deck)} />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: FOCUS TIMER */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-purple-100 text-slate-800 h-full">
                <PomodoroTimer roomId={selectedRoomId} onRunningChange={setIsFlowActive} />
              </div>
            </div>
            
            {/* GROUPED LEFT COLUMN: SHARED NOTES, TASKS, AND RESOURCES */}
            <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
              <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl min-h-[500px] overflow-hidden w-full">
                <CollaborativeEditor roomId={selectedRoomId} />
              </div>
              
              <div className="w-full">
                <TaskManager roomId={selectedRoomId} />
              </div>
              
              {/* FIXED: Flex-grow explicitly added so the library stretches to match the bottom */}
              <div className="w-full flex-grow flex flex-col [&>*]:flex-grow [&>*]:h-full">
                <RoomResources roomId={selectedRoomId} isHost={currentRoomHostId === user?.uid} />
              </div>
            </div>

            {/* RIGHT COLUMN: MUSIC, CHAT & ROOM DETAILS PANEL */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10 shadow-2xl">
                 <AmbientSoundscape roomId={selectedRoomId} />
              </div>
              <div className="bg-indigo-900/40 backdrop-blur-md rounded-[2.5rem] p-1 border border-white/20 shadow-2xl min-h-[450px] overflow-hidden">
                <EncryptedChat roomId={selectedRoomId} roomCode={currentRoomCode} />
              </div>

              {/* ROOM DETAILS PANEL */}
              <div className="bg-gradient-to-b from-[#7c3aed] to-[#5b21b6] rounded-[2.5rem] p-6 shadow-2xl border border-purple-400/20 text-white flex flex-col gap-5">
                <div className="bg-[#065f46] rounded-2xl p-4 flex justify-between items-center shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">📚</div>
                    <div className="font-black tracking-widest text-[10px] uppercase">Study Space</div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-100">
                    <span>🌐</span> <span>·</span> <span>1/10</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight drop-shadow-md">{currentRoomName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">1 Online</span>
                  </div>
                </div>

                <div className="border border-white/10 rounded-2xl p-1 bg-white/5">
                  <div className="p-3 pb-1">
                    <div className="text-[9px] font-black tracking-widest opacity-60 uppercase">Invite Code</div>
                  </div>
                  <div 
                    onClick={handleCopyCode}
                    className="bg-[#4c1d95] rounded-xl py-6 cursor-pointer hover:bg-[#5b21b6] transition shadow-inner flex flex-col items-center justify-center"
                  >
                    <div className="text-2xl font-black tracking-[0.4em] text-emerald-400">{currentRoomCode}</div>
                    <div className={`text-[8px] uppercase tracking-widest mt-2 font-black transition-colors ${copied ? 'text-emerald-400' : 'opacity-60'}`}>
                      {copied ? "COPIED!" : "Click to Copy"}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={openSettingsModal}
                  className="w-full bg-[#6d28d9] hover:bg-[#7c3aed] border border-white/10 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>⚙️</span> Edit Room Settings
                </button>

                <div>
                  <div className="text-[9px] font-black tracking-widest opacity-60 uppercase mb-3 px-1">Study Buddies</div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition">
                    <div className="w-10 h-10 rounded-full bg-[#f472b6] flex items-center justify-center font-black text-white relative shadow-md">
                      {displayName.charAt(0)}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#5b21b6]"></div>
                    </div>
                    <div>
                      <div className="font-bold text-sm tracking-wide">You</div>
                      {currentRoomHostId === user?.uid && (
                        <div className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1 font-black">Host</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* OVERVIEW SECTION - UNTOUCHED */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-in fade-in duration-500">
             <div className="lg:col-span-3 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{ label: "Pomodoros", val: userStats.pomodorosToday, color: "border-purple-400" }, { label: "Streak", val: `${userStats.streak}d`, color: "border-amber-400" }, { label: "Accuracy", val: `${userStats.flashcardAccuracy}%`, color: "border-emerald-400" }, { label: "Total Hours", val: `${userStats.hoursThisWeek}h`, color: "border-rose-400" }].map((item, i) => (
                  <div key={i} className={`bg-white rounded-3xl p-6 shadow-xl border-t-4 ${item.color} text-slate-800 transition hover:-translate-y-1`}><div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{item.label}</div><div className="text-3xl font-black">{item.val}</div></div>
                ))}
              </div>
              <div className="bg-[#fcf8fa] backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white/40"><h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Activity Map</h2><StudyTracker /></div>
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

      {/* SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[200] animate-in fade-in duration-200 p-4 text-white">
          <div className="bg-[#1e1b4b] w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
            {/* Modal Header */}
            <div className="bg-[#065f46] p-6 flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <div className="text-2xl drop-shadow-md">{modalIcon}</div>
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tight leading-none mb-1">{modalRoomName || currentRoomName}</h3>
                  <p className="text-[9px] font-bold tracking-widest uppercase opacity-80 flex gap-2">
                    <span>STUDY SPACE</span> <span>·</span> <span>{modalPrivacy === 'public' ? '🌐 Public' : '🔒 Private'}</span> <span>·</span> <span>Max {modalMaxMembers || '10'}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="opacity-50 hover:opacity-100 transition absolute top-6 right-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Room Name *</label>
                <input 
                  type="text" 
                  value={modalRoomName}
                  onChange={(e) => setModalRoomName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500 transition" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Description</label>
                <textarea 
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500 transition resize-none h-24"
                ></textarea>
              </div>

              {/* ROOM ICON */}
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Room Icon</label>
                <div className="flex flex-wrap gap-2 text-xl bg-white/5 p-2 rounded-2xl border border-white/10 w-fit">
                   {iconsList.map(icon => (
                     <div 
                       key={icon}
                       onClick={() => setModalIcon(icon)}
                       className={`p-2 rounded-xl cursor-pointer transition ${
                         modalIcon === icon 
                           ? 'border-2 border-purple-400 bg-white/10 scale-105' 
                           : 'opacity-50 hover:opacity-100 border-2 border-transparent'
                       }`}
                     >
                       {icon}
                     </div>
                   ))}
                </div>
              </div>

              {/* ROOM COLOUR */}
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Room Colour</label>
                <div className="flex gap-3">
                  {colorsList.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => setModalColor(c.id)}
                      className={`w-8 h-8 rounded-full cursor-pointer ${c.bg} transition-all duration-200 ${
                        modalColor === c.id 
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1b4b] scale-110' 
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MAX MEMBERS */}
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Max Members</label>
                  <input 
                    type="number" 
                    value={modalMaxMembers}
                    onChange={(e) => setModalMaxMembers(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500 transition" 
                  />
                </div>

                {/* PRIVACY TOGGLE */}
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-2 block">Privacy</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setModalPrivacy('public')}
                      className={`flex-1 rounded-xl py-3 text-sm flex justify-center items-center transition ${
                        modalPrivacy === 'public' 
                          ? 'bg-purple-600 shadow-lg' 
                          : 'bg-white/5 border border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      🌐
                    </button>
                    <button 
                      onClick={() => setModalPrivacy('private')}
                      className={`flex-1 rounded-xl py-3 text-sm flex justify-center items-center transition ${
                        modalPrivacy === 'private' 
                          ? 'bg-purple-600 shadow-lg' 
                          : 'bg-white/5 border border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      🔒
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button onClick={() => setIsSettingsModalOpen(false)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 text-[10px] font-black tracking-widest uppercase transition">Cancel</button>
                <button onClick={saveRoomSettings} className="w-full bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)] rounded-xl py-4 text-[10px] font-black tracking-widest uppercase transition">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;