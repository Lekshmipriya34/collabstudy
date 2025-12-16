import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// Accept the onSelectRoom prop
function RoomList({ onSelectRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);

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

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Your Study Rooms</h2>

      {rooms.length === 0 && <p className="text-gray-500">No rooms joined yet.</p>}

      {rooms.map((room) => (
        <div
          key={room.id}
          className="border p-4 rounded mb-2 bg-white shadow-sm flex justify-between items-center"
        >
          <div>
            <h3 className="font-bold text-lg">{room.name}</h3>
            <p className="text-xs text-gray-400">ID: {room.id}</p>
          </div>
          
          <button
            onClick={() => onSelectRoom(room.id)}
            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition"
          >
            Open Room
          </button>
        </div>
      ))}
    </div>
  );
}

export default RoomList;