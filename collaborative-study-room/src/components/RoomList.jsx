import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { doc, deleteDoc } from "firebase/firestore";


const THEME_MAP = {
  purple: { bg: "from-[#8b2fc9] to-[#6018a3]", btn: "bg-[#8b2fc9] hover:bg-[#6018a3]", hex: "#8b2fc9" },
  blue:   { bg: "from-[#1d58c8] to-[#123b8f]", btn: "bg-[#1d58c8] hover:bg-[#123b8f]", hex: "#1d58c8" },
  green:  { bg: "from-[#0d8250] to-[#085a36]", btn: "bg-[#0d8250] hover:bg-[#085a36]", hex: "#0d8250" },
  red:    { bg: "from-[#e11d48] to-[#9f1239]", btn: "bg-[#e11d48] hover:bg-[#9f1239]", hex: "#e11d48" },
  orange: { bg: "from-[#d97706] to-[#92400e]", btn: "bg-[#d97706] hover:bg-[#92400e]", hex: "#d97706" },
};

const fallbackInitials = ["A", "R", "P", "K", "S", "M", "N", "T"];

function RoomList({ onSelectRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Added an optional orderBy to keep the list consistent
    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      roomData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRooms(roomData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e, roomId) => {
    e.stopPropagation(); 
    const confirmDelete = window.confirm("Delete this room?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "rooms", roomId));
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  return (
    <div className="space-y-3">
      {rooms.length === 0 && (
        <p className="text-white/30 italic text-xs text-center py-4 uppercase tracking-widest font-bold">
          No rooms joined yet.
        </p>
      )}

      {rooms.map((room) => (
        <div
          key={room.id}
          // Whole card click for UX
          onClick={() => onSelectRoom(room.id)}
          className="group bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-4"
        >
          {/* Room Info */}
          <div className="flex-grow min-w-0">
            <h3 className="font-bold text-white/90 truncate text-sm uppercase tracking-tight" title={room.name}>
              {room.name}
            </h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 font-black">
              Study Room
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            
            <button
              onClick={(e) => handleDelete(e, room.id)}
              className="p-2 text-white/20 hover:text-rose-400 transition-colors"
              title="Delete Room"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
            
            <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

            {/* FIXED: Added onClick to the Enter button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevents double-triggering the parent onClick
                onSelectRoom(room.id);
              }}
              className="border border-white/20 bg-white/5 hover:bg-white hover:text-purple-900 text-white/80 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg active:scale-95"
            >
              ENTER
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RoomList;