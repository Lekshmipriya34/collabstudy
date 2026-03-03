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
    <div className="mb-6 bg-white/10 p-4 rounded-lg shadow-sm border border-white/20">
      <h2 className="text-lg font-bold text-white mb-2">Have a Code?</h2>
      <p className="text-xs text-purple-200 mb-3">
        Enter the 6-character Room Code to join.
      </p>
      
      <div className="flex gap-2">
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="e.g. HX92KP"
          className="border border-white/20 bg-white/10 text-white placeholder-purple-200 p-2 rounded flex-grow focus:outline-none focus:border-purple-300 font-mono text-sm uppercase"
          maxLength={6}
        />
        <button
          onClick={handleJoinRoom}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded font-semibold transition whitespace-nowrap"
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}

export default JoinRoom;