import { useState, useEffect } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function RoomSidebar({ roomId }) {
  const [roomData, setRoomData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    // 1. Listen to the Room Document (Real-time updates)
    const unsub = onSnapshot(doc(db, "rooms", roomId), async (roomSnap) => {
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        setRoomData(data);

        // 2. Fetch User Profiles for each member UID
        if (data.members && data.members.length > 0) {
          const memberPromises = data.members.map(async (uid) => {
            try {
              const userSnap = await getDoc(doc(db, "users", uid));
              // Return user data or a fallback if missing
              return userSnap.exists() 
                ? { uid, ...userSnap.data() } 
                : { uid, fullName: "Unknown User", username: "Guest" };
            } catch (error) {
              console.error("Error fetching member:", error);
              return { uid, fullName: "Error Loading", username: "?" };
            }
          });

          // Wait for all user data to load
          const memberList = await Promise.all(memberPromises);
          setMembers(memberList);
        } else {
          setMembers([]);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [roomId]);

  if (loading) return <div className="text-gray-400 text-sm animate-pulse">Loading room info...</div>;
  if (!roomData) return null;

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-purple-100">
      {/* Room Header */}
      <div className="mb-4 border-b pb-2 border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 break-words">
          {roomData.name}
        </h2>
        <p className="text-xs text-gray-400 font-mono mt-1 select-all">
          ID: {roomId}
        </p>
      </div>

      {/* Members Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Members ({members.length})
        </h3>
        
        <ul className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
          {members.map((member) => (
            <li key={member.uid} className="flex items-center gap-3">
              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {member.fullName ? member.fullName.charAt(0).toUpperCase() : "?"}
              </div>
              
              {/* Name Info */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 leading-none">
                  {member.fullName}
                </span>
                <span className="text-[10px] text-gray-400">
                  @{member.username}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RoomSidebar;