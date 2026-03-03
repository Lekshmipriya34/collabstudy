import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

function RoomSidebar({ roomId, isRunning }) {
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);

  // FIX: Subscribe to the real room document so invite code + name are live
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoom(data);

      // FIX: Fetch display names for each member UID from their auth profile.
      // We store displayName in the room's members array as objects when possible,
      // but fall back to Firebase Auth lookup via a public "users" collection.
      const memberUids = data.members || [];
      const memberProfiles = await Promise.all(
        memberUids.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const u = userSnap.data();
              const name = u.displayName || u.email || "Member";
              return {
                uid,
                name,
                username: u.email ? `@${u.email.split("@")[0]}` : `@${uid.slice(0, 6)}`,
                initial: name[0].toUpperCase(),
              };
            }
          } catch (_) {}
          return {
            uid,
            name: "Member",
            username: `@${uid.slice(0, 6)}`,
            initial: "M",
          };
        })
      );
      setMembers(memberProfiles);
    });
    return () => unsubscribe();
  }, [roomId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-6 text-white bg-gradient-to-br from-[#7c3aed]/80 to-[#4c1d95]/80">
      {/* ROOM HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-wide">
          {room?.name || "Study Room"}
        </h2>
        <p className="text-xs text-purple-200 uppercase tracking-widest">
          Study session active
        </p>
      </div>

      {/* INVITE FRIENDS */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
        <p className="text-sm tracking-widest mb-3 text-purple-200">
          INVITE FRIENDS
        </p>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-center font-mono text-2xl font-black tracking-[0.2em] shadow-inner text-white">
          {room?.code || roomId}
        </div>

        <button
          onClick={() => handleCopy(room?.code || roomId)}
          className="mt-4 w-full bg-white text-purple-700 font-bold py-2 rounded-full hover:bg-purple-100 transition"
        >
          {copied ? "✅ COPIED!" : "COPY CODE"}
        </button>
      </div>
      {/* ONLINE MEMBERS */}
      <div>
        <p className="text-sm tracking-widest text-purple-200 mb-3">
          MEMBERS ({members.length})
        </p>

        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.uid}
              className="flex items-center justify-between bg-white/10 rounded-xl p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500
                  ${
                    isRunning
                      ? "bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.9)]"
                      : "bg-purple-300 text-purple-900"
                  }`}
                >
                  {member.initial}
                </div>

                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-purple-200">{member.username}</p>
                </div>
              </div>

              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RoomSidebar;