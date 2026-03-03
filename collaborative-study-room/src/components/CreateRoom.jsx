import { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { generateRoomCode } from "../utils/generateRoomCode";

function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const { user } = useAuth();

  const handleCreateRoom = async () => {
    if (!roomName) {
      alert("Room name empty");
      return;
    }

    try {
      let code;
      let isUnique = false;

      // Keep generating until we get a unique code
      while (!isUnique) {
        code = generateRoomCode();
        const q = query(collection(db, "rooms"), where("code", "==", code));
        const snapshot = await getDocs(q);
        isUnique = snapshot.empty;
      }

      const docRef = await addDoc(collection(db, "rooms"), {
        name: roomName,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
        code: code, // Add the short code to the database
      });

      alert(`Room created! Code: ${code}`);
      setRoomName("");
    } catch (error) {
      console.error("Firestore error:", error.code, error.message);
      alert(error.message);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2 text-white">Create Study Room</h2>
      <input
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Room name"
        className="border border-white/20 bg-white/10 text-white placeholder-purple-200 p-2 mr-2 rounded outline-none focus:border-purple-300"
      />
      <button
        onClick={handleCreateRoom}
        className="bg-purple-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-purple-500 transition"
      >
        Create
      </button>
    </div>
  );
}

export default CreateRoom;