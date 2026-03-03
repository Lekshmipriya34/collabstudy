import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function RoomSidebar({ roomId, isRunning, onLeave }) {
  const [room, setRoom] = useState(null);
  const [membersData, setMembersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);

    // Real-time listener for Room Data (to detect deletion/changes)
    const unsubscribe = onSnapshot(roomRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoom(data);
        // In a real app, you'd fetch user profiles here. 
        // For now, we just map UIDs to dummy avatars if specific names aren't stored
        setMembersData(data.members || []);
      } else {
        // Room was deleted while we were looking at it
        onLeave(); 
      }
    });

    return () => unsubscribe();
  }, [roomId, onLeave]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExitRoom = async () => {
    if (!confirm("Are you sure you want to leave this room?")) return;
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await transaction.get(roomRef);

        if (!roomDoc.exists()) {
          throw "Room does not exist!";
        }

        const roomData = roomDoc.data();
        const currentMembers = roomData.members || [];

        // 1. Filter out the current user
        const newMembers = currentMembers.filter((uid) => uid !== user.uid);

        if (newMembers.length === 0) {
          // 2. CASE: Room is now empty -> DELETE IT
          transaction.delete(roomRef);
          // Optional: Delete subcollections (notes, messages) manually if needed, 
          // but for this MVP, deleting the parent is often sufficient for access control.
          console.log("Room deleted as last member left.");
        } else {
          // 3. CASE: Others remain -> UPDATE MEMBERS
          transaction.update(roomRef, {
            members: newMembers
          });
          
          // If the owner left, you might want to assign a new owner here.
          // For now, we leave createdBy as is (historical) or update it:
          if (roomData.createdBy === user.uid) {
             transaction.update(roomRef, { createdBy: newMembers[0] });
          }
        }
      });
      
      // Close the view
      onLeave();

    } catch (error) {
      console.error("Exit failed:", error);
      alert("Failed to exit room: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!room) return <div className="text-white/50 text-sm">Loading room details...</div>;

  return (
    <div className="flex flex-col h-full">
      {/* ROOM HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tighter text-white mb-1">
          {room.name?.toUpperCase()}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-emerald-200 tracking-widest uppercase">
            {membersData.length} Online
          </span>
        </div>
      </div>

      {/* INVITE FRIENDS */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
        <p className="text-[10px] font-bold tracking-widest mb-3 text-purple-200 uppercase">
          Invite Code
        </p>

        <div 
          onClick={() => handleCopy(room.code || roomId)}
          className="bg-black/20 hover:bg-black/30 cursor-pointer rounded-xl p-3 text-center border border-white/10 transition group"
        >
          <span className="font-mono text-xl font-black tracking-[0.2em] text-emerald-300 shadow-black drop-shadow-sm">
            {room.code || "NO-CODE"}
          </span>
          <div className="text-[10px] text-white/50 mt-1 group-hover:text-white/80 transition">
             {copied ? "✅ COPIED!" : "CLICK TO COPY"}
          </div>
        </div>
      </div>

      {/* MEMBERS LIST (Scrollable) */}
      <div className="flex-grow overflow-y-auto mb-6 custom-scrollbar pr-2">
        <p className="text-[10px] font-bold tracking-widest mb-3 text-purple-200 uppercase">
          Study Buddies
        </p>
        <div className="space-y-3">
          {membersData.map((memberId, index) => (
            <div key={memberId} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold shadow-md">
                {/* Fallback avatar since we don't have all names fetched */}
                {index + 1}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">
                  {memberId === user.uid ? "You" : `Member ${index + 1}`}
                </p>
                {/* Show 'Host' badge if this user created the room */}
                {memberId === room.createdBy && (
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/30">
                    HOST
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER: DANGER ZONE */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleExitRoom}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-500/30 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-xs tracking-widest uppercase group"
        >
          {loading ? "Leaving..." : (
             <>
               <span>Exit Room</span>
               <span className="group-hover:translate-x-1 transition-transform">→</span>
             </>
          )}
        </button>
        <p className="text-[9px] text-center text-white/30 mt-2 px-2 leading-tight">
          If everyone leaves, this room will be automatically deleted.
        </p>
      </div>
    </div>
  );
}

export default RoomSidebar;