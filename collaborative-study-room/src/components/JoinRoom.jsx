import { useState } from "react";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = async () => {
    if (!roomId) return alert("Please enter a Room Code");
    setLoading(true);

    try {
      const cleanCode = roomId.trim();
      
      // 1. Search for the short code in the database
      const q = query(collection(db, "rooms"), where("code", "==", cleanCode.toUpperCase()));
      const snapshot = await getDocs(q);

      let targetRoomId = null;

      if (!snapshot.empty) {
        // Found a room with this short code
        targetRoomId = snapshot.docs[0].id;
      } else {
        // Fallback: Try to use the input as a long document ID (for older rooms)
        targetRoomId = cleanCode;
      }

      // 2. Update the members array of the found room
      const roomRef = doc(db, "rooms", targetRoomId);
      await updateDoc(roomRef, {
        members: arrayUnion(user.uid),
      });
      
      alert("Successfully joined the room!");
      setRoomId("");
    } catch (error) {
      console.error(error);
      alert("Invalid Room Code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-white mb-2">Have a Code?</h3>
      <p className="text-xs text-purple-200 mb-4 uppercase tracking-wider opacity-80">
        Enter the 6-character Room Code to join.
      </p>
      
      {/* Stacked layout ensures it stays inside the Sidebar Grid */}
      <div className="flex flex-col gap-3">
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="e.g. HX92KP"
          className="w-full border border-white/20 bg-white/5 text-white placeholder-purple-300/50 p-3 rounded-xl focus:outline-none focus:border-purple-400 font-mono text-sm uppercase transition-all"
          maxLength={6}
        />
        <button
          onClick={handleJoinRoom}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold transition shadow-lg active:scale-95 whitespace-nowrap"
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}

export default JoinRoom;