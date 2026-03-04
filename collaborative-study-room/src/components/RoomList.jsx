import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Pre-defined gradient themes to match the UI image
const cardThemes = [
  { bg: "from-[#8b2fc9] to-[#6018a3]", tag: "PHYSICS" },
  { bg: "from-[#1d58c8] to-[#123b8f]", tag: "COMPUTER SCIENCE" },
  { bg: "from-[#0d8250] to-[#085a36]", tag: "MATHEMATICS" },
  { bg: "from-[#e11d48] to-[#9f1239]", tag: "LITERATURE" },
  { bg: "from-[#d97706] to-[#92400e]", tag: "HISTORY" },
];

const fallbackInitials = ["A", "R", "P", "K", "S", "M", "N", "T"];

function RoomList({ onSelectRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch rooms where the current user is a member
    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Sort newest first
      roomData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRooms(roomData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="text-purple-300 animate-pulse font-bold tracking-widest text-sm">LOADING ROOMS...</span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center p-8 bg-black/10 rounded-3xl border border-white/10">
        <p className="text-2xl mb-2">🏜️</p>
        <p className="text-sm font-bold text-white/50 tracking-widest uppercase">No rooms joined yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {rooms.map((room, index) => {
        // Cycle through the themes based on the index
        const theme = cardThemes[index % cardThemes.length];
        
        // Mock data for UI (Replace with real room data if available in your schema)
        const memberCount = room.members?.length || 1;
        const displayCount = Math.min(memberCount, 3);
        const extraMembers = memberCount > 3 ? memberCount - 3 : 0;
        
        // Assume everyone in the room is "live" for the sake of the UI metric
        const liveCount = memberCount; 

        return (
          <div 
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className="flex flex-col rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-white/10 group bg-white"
          >
            {/* TOP SECTION (Colored Gradient) */}
            <div className={`bg-gradient-to-br ${theme.bg} p-6 pb-8 flex-grow flex flex-col justify-start relative overflow-hidden`}>
              {/* Subtle background glow effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              {/* Tag / Subject */}
              <span className="text-[10px] font-black text-white/70 tracking-widest uppercase mb-3 drop-shadow-sm">
                {room.subject || theme.tag}
              </span>

              {/* Title */}
              <h3 className="text-2xl font-black text-white leading-tight tracking-tighter mb-2 drop-shadow-md">
                {room.name}
              </h3>

              {/* Description / Subtitle */}
              <p className="text-sm text-white/80 font-medium leading-snug line-clamp-2">
                {room.description || "Collaborative study session & resource sharing"}
              </p>
            </div>

            {/* BOTTOM SECTION (White Area) */}
            <div className="bg-white p-4 flex items-center justify-between rounded-b-[2rem]">
              
              {/* LEFT GROUP: Avatars & Live Indicator */}
              <div className="flex items-center gap-3">
                {/* Avatars */}
                <div className="flex -space-x-2">
                  {[...Array(displayCount)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-sm relative"
                      style={{ 
                        backgroundColor: i === 0 ? '#8b2fc9' : i === 1 ? '#1d58c8' : '#0d8250',
                        zIndex: 10 - i // FIXED: Proper stacking order without breaking Tailwind compiler
                      }}
                    >
                      {/* Pick a pseudo-random letter based on room ID so it stays consistent */}
                      {fallbackInitials[(room.id.charCodeAt(i) || i) % fallbackInitials.length]}
                    </div>
                  ))}
                  {extraMembers > 0 && (
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[#8b2fc9] text-[10px] font-black shadow-sm relative"
                      style={{ zIndex: 0 }}
                    >
                      +{extraMembers}
                    </div>
                  )}
                </div>

                {/* Live Indicator */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-500 text-xs font-bold">{liveCount} live</span>
                </div>
              </div>

              {/* RIGHT GROUP: Join Button */}
              <button className="bg-[#6b21a8] hover:bg-[#581c87] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md group-hover:shadow-lg group-hover:-translate-y-0.5">
                Join
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RoomList;