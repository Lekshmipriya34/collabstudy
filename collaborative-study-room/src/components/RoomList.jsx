import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function RoomList({ onSelectRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 text-white">Your Study Rooms</h2>

      {rooms.length === 0 && <p className="text-purple-200 italic">No rooms joined yet.</p>}

      {rooms.map((room) => {
        // Use the short code if available, otherwise fallback to the long ID
        const displayCode = room.code || room.id;

        return (
          <div
            key={room.id}
            className="border border-white/20 p-5 rounded-lg mb-4 bg-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/20 transition"
          >
            <div>
              <h3 className="font-bold text-lg text-white">{room.name}</h3>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-purple-200 uppercase tracking-wide">
                  Share Code:
                </span>
                <div 
                  className="bg-black/30 border border-white/10 px-2 py-1 rounded text-sm font-mono text-emerald-300 font-bold tracking-wider cursor-pointer select-all"
                  title="Click to select"
                >
                  {displayCode}
                </div>
                
                <button 
                  onClick={() => handleCopy(displayCode)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition"
                >
                  {copiedId === displayCode ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>
            
            <button
              onClick={() => onSelectRoom(room.id)}
              className="bg-white text-purple-900 px-5 py-2 rounded-md font-bold hover:bg-purple-100 transition shadow-sm whitespace-nowrap"
            >
              Enter Room →
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default RoomList;