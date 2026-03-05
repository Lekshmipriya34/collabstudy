import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import EditRoom from "./Editroom";

// Map simple IDs to actual Tailwind gradients for the sidebar header
const THEME_MAP = {
  purple: "from-[#8b2fc9] to-[#6018a3]",
  blue:   "from-[#1d58c8] to-[#123b8f]",
  green:  "from-[#0d8250] to-[#085a36]",
  red:    "from-[#e11d48] to-[#9f1239]",
  orange: "from-[#d97706] to-[#92400e]",
};

function RoomSidebar({ roomId, isRunning, onLeave }) {
  const [room, setRoom] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // inline quick-rename state
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
      if (docSnap.exists()) {
        setRoom(docSnap.data());
      } else {
        onLeave();
      }
    });
    return () => unsubscribe();
  }, [roomId, onLeave]);

  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, "users", user.uid);
    const setOnline  = () => updateDoc(userRef, { isOnline: true  }).catch(console.error);
    const setOffline = () => updateDoc(userRef, { isOnline: false }).catch(console.error);
    setOnline();
    window.addEventListener("beforeunload", setOffline);
    return () => { setOffline(); window.removeEventListener("beforeunload", setOffline); };
  }, [user]);

  useEffect(() => {
    if (!room?.members) return;
    const unsubscribes = room.members.map((uid) => {
      return onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) {
          const userData = { uid, ...snap.data() };
          setMemberProfiles((prev) => {
            const filtered = prev.filter((p) => p.uid !== uid);
            return [...filtered, userData];
          });
        }
      });
    });
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [room?.members]);

  const startInlineEdit = () => {
    setDraftName(room.name || "");
    setEditingName(true);
  };

  const saveInlineName = async () => {
    if (!draftName.trim()) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), { name: draftName.trim() });
    } catch (err) {
      console.error(err);
      alert("Failed to rename: " + err.message);
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handleCopy = async (code) => {
    if (!code) return;
    const text = String(code).trim();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.opacity = "0"; ta.style.position = "absolute";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Copy failed — please select the code manually.");
    }
  };

  const handleExitRoom = async () => {
    if (!window.confirm("Are you sure you want to leave this room?")) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Room does not exist!");
        const roomData = roomDoc.data();
        const newMembers = (roomData.members || []).filter((uid) => uid !== user.uid);
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
      console.error(error);
      alert("Failed to exit room: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm("Delete this room permanently? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "rooms", roomId));
      onLeave();
    } catch (error) {
      console.error(error);
      alert("Failed to delete room: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!room) return <div className="text-white/50 text-sm">Loading room details…</div>;

  const displayCode = room.code || roomId;
  const isHost      = room.createdBy === user?.uid;
  const onlineCount = memberProfiles.filter((p) => p.isOnline).length;
  const sortedProfiles = [...memberProfiles].sort((a, b) => {
    if (a.uid === user.uid) return -1;
    if (b.uid === user.uid) return 1;
    return 0;
  });

  // Calculate Header Gradient Safely
  const headerBg = THEME_MAP[room.color] || THEME_MAP.purple;

  return (
    <>
      {showEditModal && (
        <EditRoom
          roomId={roomId}
          room={room}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <div className="flex flex-col h-full">

        {/* ── ROOM HEADER ── */}
        <div className="mb-5">
          <div className={`bg-gradient-to-r ${headerBg} rounded-xl px-3 py-2 flex items-center gap-2 mb-3`}>
            <span className="text-2xl">{room.emoji || "📚"}</span>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate tracking-widest uppercase">STUDY SPACE</p>
              {room.description && (
                <p className="text-white/60 text-[10px] truncate">{room.description}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0 text-[9px] text-white/60 font-bold">
              {room.isPrivate ? "🔒" : "🌐"}
              <span>·</span>
              <span>{room.members?.length || 1}/{room.maxMembers || "∞"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 group">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") saveInlineName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  maxLength={40}
                  className="flex-1 bg-white/10 border border-purple-400 text-white font-black text-xl tracking-tighter rounded-lg px-2 py-1 outline-none"
                />
                <button
                  onClick={saveInlineName}
                  disabled={savingName}
                  className="text-emerald-300 hover:text-emerald-200 text-xs font-bold transition"
                >
                  {savingName ? "…" : "✓"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-white/40 hover:text-white text-xs transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black tracking-tighter text-white truncate flex-1">
                  {room.name?.toUpperCase()}
                </h2>
                {isHost && (
                  <button
                    onClick={startInlineEdit}
                    title="Rename room"
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition text-sm"
                  >
                    ✏️
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-200 tracking-widest uppercase">
              {onlineCount} Online
            </span>
          </div>
        </div>

        {/* ── INVITE CODE ── */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-5 border border-white/20">
          <p className="text-[10px] font-bold tracking-widest mb-3 text-purple-200 uppercase">
            Invite Code
          </p>
          <div
            onClick={() => handleCopy(displayCode)}
            className="bg-black/20 hover:bg-black/30 cursor-pointer rounded-xl p-3 text-center border border-white/10 transition group"
            title="Click to copy"
          >
            <span className={`font-mono font-black tracking-[0.2em] text-emerald-300 drop-shadow-sm ${displayCode.length > 6 ? "text-xs break-all" : "text-xl"}`}>
              {displayCode}
            </span>
            <div className="text-[10px] text-white/50 mt-1 group-hover:text-white/80 transition font-sans tracking-normal">
              {copied ? "✅ COPIED!" : "CLICK TO COPY"}
            </div>
          </div>
        </div>

        {/* ── EDIT ROOM BUTTON (host only) ── */}
        {isHost && (
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full mb-5 flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 hover:text-white border border-purple-500/30 px-4 py-2.5 rounded-xl transition-all font-bold text-xs tracking-widest uppercase"
          >
            ⚙️ Edit Room Settings
          </button>
        )}

        {/* ── MEMBERS ── */}
        <div className="flex-grow overflow-y-auto mb-5 custom-scrollbar pr-1">
          <p className="text-[10px] font-bold tracking-widest mb-3 text-purple-200 uppercase">
            Study Buddies
          </p>
          <div className="space-y-2">
            {sortedProfiles.map((profile) => {
              const isMe = profile.uid === user.uid;
              const name = profile.fullName || profile.username || "Scholar";
              return (
                <div
                  key={profile.uid}
                  className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold shadow-md uppercase">
                        {name.charAt(0)}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#4c1d95] ${
                          profile.isOnline ? "bg-emerald-400" : "bg-slate-400"
                        }`}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate text-white">
                        {isMe ? "You" : name}
                      </p>
                      <div className="flex gap-1 mt-0.5">
                        {profile.uid === room.createdBy && (
                          <span className="text-[8px] bg-yellow-500/20 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/30">
                            HOST
                          </span>
                        )}
                        {!profile.isOnline && (
                          <span className="text-[8px] text-slate-400 px-1 py-0.5">OFFLINE</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DANGER ZONE ── */}
        <div className="pt-4 border-t border-white/10">
          {isHost && (
            <button
              onClick={handleDeleteRoom}
              disabled={loading}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 px-4 py-3 rounded-xl transition-all font-bold text-xs tracking-widest uppercase group"
            >
              {loading ? "Deleting…" : "Delete Room"}
            </button>
          )}
          <button
            onClick={handleExitRoom}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-500/30 px-4 py-3 rounded-xl transition-all font-bold text-xs tracking-widest uppercase group"
          >
            {loading ? "Leaving…" : (
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
    </>
  );
}

export default RoomSidebar;