import ShoutOuts from "../components/ShoutOuts";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";        
import { auth, db } from "../firebase"; 
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore"; 
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
import EncryptedChat from "../components/EncryptedChat";

function Dashboard() {
  const { user } = useAuth(); 
  const [displayName, setDisplayName] = useState("SCHOLAR");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isFlowActive, setIsFlowActive] = useState("focus");
  
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [currentRoomCode, setCurrentRoomCode] = useState("");
  
  // UPDATED: Advanced state to hold detailed analytics
  const [userStats, setUserStats] = useState({ 
    streak: 0, 
    pomodorosToday: 0,
    pomodoroTrend: "",
    pomodoroTrendColor: "",
    hoursThisWeek: 0,
    flashcardAccuracy: 87 // Mocked for UI, can be connected to flashcard db later
  });

  const navigate = useNavigate(); 

  // Fetch User Display Name
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

  // CALCULATE ADVANCED STATS FROM STUDY SESSIONS
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "users", user.uid, "studySessions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const sessions = snap.docs.map((doc) => doc.data());

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const todayStr = formatDate(today);
      const yesterdayStr = formatDate(yesterday);

      let pToday = 0;
      let pYesterday = 0;
      let pThisWeek = 0;
      const dates = new Set();

      sessions.forEach((s) => {
        const dateObj = s.createdAt ? s.createdAt.toDate() : new Date();
        const dateStr = formatDate(dateObj);
        dates.add(dateStr);

        if (dateStr === todayStr) pToday++;
        if (dateStr === yesterdayStr) pYesterday++;
        if (dateObj >= oneWeekAgo) pThisWeek++;
      });

      // Calculate Streak
      const uniqueDates = Array.from(dates);
      let currentStreak = 0;

      if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
        let checkDate = uniqueDates.includes(todayStr) ? today : yesterday;
        while (true) {
          const dStr = formatDate(checkDate);
          if (uniqueDates.includes(dStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); 
          } else {
            break;
          }
        }
      }

      // Calculate Trends & Hours
      const diff = pToday - pYesterday;
      const trendText = diff >= 0 ? `↑ +${diff} vs yesterday` : `↓ ${Math.abs(diff)} vs yesterday`;
      const trendColor = diff >= 0 ? "text-emerald-500" : "text-rose-500";
      
      const hours = ((pThisWeek * 25) / 60).toFixed(1);

      setUserStats({ 
        streak: currentStreak, 
        pomodorosToday: pToday,
        pomodoroTrend: trendText,
        pomodoroTrendColor: trendColor,
        hoursThisWeek: hours,
        flashcardAccuracy: 87 // keeping mock for now
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Room Name AND Short Code whenever a room is selected
  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!selectedRoomId) {
        setCurrentRoomName("");
        setCurrentRoomCode("");
        return;
      }
      try {
        const roomDoc = await getDoc(doc(db, "rooms", selectedRoomId));
        if (roomDoc.exists()) {
          const data = roomDoc.data();
          setCurrentRoomName(data.name || "STUDY ROOM");
          setCurrentRoomCode(data.code || data.roomCode || selectedRoomId); 
        }
      } catch (error) {
        console.error("Error fetching room details:", error);
      }
    };

    fetchRoomDetails();
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
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold tracking-widest drop-shadow-md flex items-center gap-3">
                <span className="bg-white/20 px-3 py-1 rounded-xl text-2xl border border-white/30">🎧</span>
                {currentRoomName.toUpperCase()}
              </h1>
              <div className="flex items-center mt-2">
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 pr-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
                </span>
                <span className="text-purple-200 text-xs font-bold border-l border-white/20 pl-3">
                  ROOM CODE: <span className="font-mono text-white tracking-wider select-all ml-1 bg-white/10 px-2 py-0.5 rounded">{currentRoomCode}</span>
                </span>
              </div>
            </div>
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
              <EncryptedChat 
                roomId={selectedRoomId} 
                roomCode={currentRoomCode} 
              />
            </div>

          </div>
        </div>
      ) : (
        /* ===== MAIN DASHBOARD VIEW ===== */
        <div className="space-y-8">
          
          {/* NEW: ANALYTICS WIDGETS SECTION */}
          <div>
            <div className="mb-4">
              <span className="text-[#f0abfc] text-xs font-bold tracking-[0.2em] uppercase">05 — Dashboard</span>
              <h2 className="text-3xl font-black mt-1 mb-1 tracking-tighter">Analytics Widgets</h2>
              <p className="text-purple-200/80 text-sm">Key metrics displayed with personality — not just numbers, actionable insights.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Widget 1: Pomodoros Today */}
              <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-slate-100 overflow-hidden text-slate-800 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-500"></div>
                <div className="text-sm font-semibold text-slate-400">Pomodoros Today</div>
                <div className="text-5xl font-black text-[#1a0533] mt-2 mb-4 tracking-tighter">{userStats.pomodorosToday}</div>
                <div className={`text-xs font-bold ${userStats.pomodoroTrendColor}`}>
                  {userStats.pomodoroTrend}
                </div>
                <span className="absolute -right-2 -bottom-2 text-6xl opacity-10 drop-shadow-sm grayscale">🍅</span>
              </div>

              {/* Widget 2: Study Streak */}
              <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-slate-100 overflow-hidden text-slate-800 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400"></div>
                <div className="text-sm font-semibold text-slate-400">Study Streak</div>
                <div className="text-5xl font-black text-[#1a0533] mt-2 mb-4 tracking-tighter">{userStats.streak}d</div>
                <div className="text-xs font-bold text-emerald-500">↑ Personal best!</div>
                <span className="absolute -right-2 -bottom-2 text-6xl opacity-10 drop-shadow-sm grayscale">🔥</span>
              </div>

              {/* Widget 3: Flashcard Accuracy */}
              <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-slate-100 overflow-hidden text-slate-800 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
                <div className="text-sm font-semibold text-slate-400">Flashcard Accuracy</div>
                <div className="text-5xl font-black text-[#1a0533] mt-2 mb-4 tracking-tighter">{userStats.flashcardAccuracy}%</div>
                <div className="text-xs font-bold text-emerald-500">↑ +5% this week</div>
                <span className="absolute -right-2 -bottom-2 text-6xl opacity-10 drop-shadow-sm grayscale">🧠</span>
              </div>

              {/* Widget 4: Hours This Week */}
              <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-slate-100 overflow-hidden text-slate-800 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
                <div className="text-sm font-semibold text-slate-400">Hours This Week</div>
                <div className="text-5xl font-black text-[#1a0533] mt-2 mb-4 tracking-tighter">{userStats.hoursThisWeek}h</div>
                <div className="text-xs font-bold text-rose-500">↓ Goal: 25h</div>
                <span className="absolute -right-2 -bottom-2 text-6xl opacity-10 drop-shadow-sm grayscale">⏰</span>
              </div>
            </div>
          </div>

          {/* LOWER DASHBOARD CONTENT */}
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

        </div>
      )}
    </div>
  );
}

export default Dashboard;