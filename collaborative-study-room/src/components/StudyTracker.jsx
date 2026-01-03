import { useState, useEffect } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function StudyTracker({ roomId }) {
  const { user } = useAuth();
  const [isStudying, setIsStudying] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [todayMinutes, setTodayMinutes] = useState(0);

  // Helper to get the correct collection reference
  const getSessionCollection = () => {
    if (roomId) {
      // Room Mode: Save to the specific room
      return collection(db, "rooms", roomId, "studySessions");
    } else {
      // Dashboard Mode: Save to user's personal logs
      return collection(db, "users", user.uid, "studySessions");
    }
  };

  const startStudy = () => {
    setStartTime(Date.now());
    setIsStudying(true);
  };

  const stopStudy = async () => {
    if (!startTime) return;
    
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 60000); // Duration in minutes

    // Prevent saving 0-minute sessions if clicked too fast
    if (duration > 0) {
      await addDoc(getSessionCollection(), {
        userId: user.uid,
        duration,
        createdAt: serverTimestamp(),
        roomId: roomId || "personal", // specific room ID or 'personal'
      });
    }

    setIsStudying(false);
    setStartTime(null);
  };

  useEffect(() => {
    if (!user) return;

    const sessionRef = getSessionCollection();

    // Query: Get all sessions for this user in this context
    const q = query(
      sessionRef,
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().duration || 0),
        0
      );
      setTodayMinutes(total);
    });

    return () => unsub();
  }, [roomId, user]);

  return (
    <div className="bg-white p-5 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-3">
        {roomId ? "Room Study Tracker" : "Personal Study Tracker"}
      </h2>

      <p className="mb-4 text-gray-600">
        Total recorded time: <span className="font-semibold text-blue-600">{todayMinutes} mins</span>
      </p>

      {!isStudying ? (
        <button
          onClick={startStudy}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition w-full md:w-auto"
        >
          Start Studying
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <button
            onClick={stopStudy}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
          >
            Stop & Save
          </button>
          <span className="animate-pulse text-green-600 font-semibold">Studying now...</span>
        </div>
      )}
    </div>
  );
}

export default StudyTracker;