import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function RoomSidebar({ roomId, isRunning, onLeave }) {
  const [room, setRoom] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState([]); // Stores full user objects
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // 1. Listen for Room Data
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);

    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom(docSnap.data());
      } else {
        onLeave(); 
      }
    });

    return () => unsubscribe();
  }, [roomId, onLeave]);

  // 2. Presence System: Mark current user as Online/Offline
  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, "users", user.uid);

    const setOnline = () => updateDoc(userRef, { isOnline: true }).catch(console.error);
    const setOffline = () => updateDoc(userRef, { isOnline: false }).catch(console.error);

    // Set online when component mounts
    setOnline();

    // Set offline when the user closes the tab or refreshes
    window.addEventListener("beforeunload", setOffline);

    return () => {
      // Set offline when the component unmounts (e.g., they click "Logout" or navigate away)
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, [user]);

  // 3. Fetch Real Names and Status of all members in the room
  useEffect(() => {
    if (!room?.members) return;

    // Attach a listener to EVERY member's user document
    const unsubscribes = room.members.map((uid) => {
      const userRef = doc(db, "users", uid);
      return onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const userData = { uid, ...snap.data() };
          
          setMemberProfiles((prev) => {
            // Remove the old data for this user and add the fresh data
            const filtered = prev.filter((p) => p.uid !== uid);
            return [...filtered, userData];
          });
        }
      });
    });

    // Cleanup all listeners when room members change or component unmounts
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [room?.members]);

  const handleCopy = async (code) => {
    if (!code) return;
    const textToCopy = String(code).trim();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "absolute";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Clipboard copy failed. Please select and copy the text manually.");
    }
  };

  const handleExitRoom = async () => {
    if (!window.confirm("Are you sure you want to leave this room?")) return;
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await transaction.get(roomRef);

        if (!roomDoc.exists()) throw "Room does not exist!";

        const roomData = roomDoc.data();
        const currentMembers = roomData.members || [];
        const newMembers = currentMembers.filter((uid) => uid !== user.uid);

        if (newMembers.length === 0) {
          transaction.delete(roomRef);
        } else {
          transaction.update(roomRef, { members: newMembers });
          if (roomData.createdBy === user.uid) {
             transaction.update(roomRef, { createdBy: newMembers[0] });
          }
        }
      });
      onLeave();
    } catch (error) {
      console.error("Exit failed:", error);
      alert("Failed to exit room: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm("Are you sure you want to delete this room permanently?")) return;
    setLoading(true);

    try {
      await deleteDoc(doc(db, "rooms", roomId));
      onLeave();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete room: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!room) return <div className="text-white/50 text-sm">Loading room details...</div>;

  const displayCode = room.code || roomId;
  const isHost = room.createdBy === user?.uid;
  const onlineCount = memberProfiles.filter((p) => p.isOnline).length;

  // Sort profiles so "You" are always at the top
  const sortedProfiles = [...memberProfiles].sort((a, b) => {
    if (a.uid === user.uid) return -1;
    if (b.uid === user.uid) return 1;
    return 0;
  });

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
            {onlineCount} Online
          </span>
        </div>
      </div>

      {/* INVITE FRIENDS */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
        <p className="text-[10px] font-bold tracking-widest mb-3 text-purple-200 uppercase">
          Invite Code
        </p>

        <div 
          onClick={() => handleCopy(displayCode)}
          className="bg-black/20 hover:bg-black/30 cursor-pointer rounded-xl p-3 text-center border border-white/10 transition group"
          title="Click to copy!"
        >
          <span className={`font-mono font-black tracking-[0.2em] text-emerald-300 shadow-black drop-shadow-sm ${displayCode.length > 6 ? 'text-xs break-all' : 'text-xl'}`}>
            {displayCode}
          </span>
          <div className="text-[10px] text-white/50 mt-1 group-hover:text-white/80 transition font-sans tracking-normal">
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
          {sortedProfiles.map((profile) => {
            const isMe = profile.uid === user.uid;
            // Provide a fallback name just in case
            const displayName = profile.fullName || profile.username || "Scholar";
            
            return (
              <div key={profile.uid} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-3 overflow-hidden">
                  
                  {/* Status Dot + Avatar */}
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold shadow-md uppercase">
                      {displayName.charAt(0)}
                    </div>
                    {/* Online/Offline Indicator */}
                    <span 
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#4c1d95] ${
                        profile.isOnline ? "bg-emerald-400" : "bg-slate-400"
                      }`} 
                    />
                  </div>

                  {/* Name & Roles */}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate text-white">
                      {isMe ? "You" : displayName}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      {profile.uid === room.createdBy && (
                        <span className="text-[8px] bg-yellow-500/20 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/30">
                          HOST
                        </span>
                      )}
                      {!profile.isOnline && (
                         <span className="text-[8px] text-slate-400 px-1 py-0.5">
                           OFFLINE
                         </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER: DANGER ZONE */}
      <div className="pt-4 border-t border-white/10">
        {isHost && (
          <button
            onClick={handleDeleteRoom}
            disabled={loading}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-xs tracking-widest uppercase group"
          >
            {loading ? "Deleting..." : "Delete Room"}
          </button>
        )}

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