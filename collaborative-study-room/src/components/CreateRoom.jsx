import { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { generateRoomCode } from "../utils/generateRoomCode";

export const ROOM_COLORS = [
  { id: "purple", bg: "from-[#8b2fc9] to-[#6018a3]" },
  { id: "blue", bg: "from-[#1d58c8] to-[#123b8f]" },
  { id: "green", bg: "from-[#0d8250] to-[#085a36]" },
  { id: "red", bg: "from-[#e11d48] to-[#9f1239]" },
  { id: "orange", bg: "from-[#d97706] to-[#92400e]" },
];

function CreateRoom() {
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [roomName, setRoomName] = useState("");
  const [roomColor, setRoomColor] = useState("purple");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleNextStep = () => {
    if (!roomName.trim()) {
      alert("Please enter a room name.");
      return;
    }
    setStep(2);
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);

    try {
      let code;
      let isUnique = false;

      while (!isUnique) {
        code = generateRoomCode();
        const q = query(collection(db, "rooms"), where("code", "==", code));
        const snapshot = await getDocs(q);
        isUnique = snapshot.empty;
      }

      await addDoc(collection(db, "rooms"), {
        name: roomName.trim(),
        color: roomColor, // Saves "purple", "blue", etc.
        description: description.trim(),
        createdBy: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
        code: code,
      });

      setRoomName("");
      setRoomColor("purple");
      setDescription("");
      setStep(1);
      
    } catch (error) {
      console.error("Firestore error:", error.code, error.message);
      alert("Failed to create room.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white tracking-widest uppercase text-sm">
          {step === 1 ? "Create New Room" : "Customize Room"}
        </h2>
        <span className="text-[10px] font-bold text-white/40 tracking-widest">
          STEP {step} OF 2
        </span>
      </div>
      
      {step === 1 ? (
        <div className="space-y-3 animate-in fade-in duration-300">
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room Name (e.g. Finals Prep)"
            className="w-full border border-white/20 bg-white/10 text-white placeholder-purple-200/50 p-3 rounded-xl outline-none focus:border-[#f0abfc] transition text-sm font-bold"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
          />
          <button
            onClick={handleNextStep}
            className="w-full bg-[#f0abfc] text-[#1a0533] py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-white transition shadow-lg mt-2"
          >
            Continue →
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* COLOR PICKER */}
          <div>
            <label className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2 block">Room Color</label>
            <div className="flex gap-3">
              {ROOM_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setRoomColor(c.id)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.bg} transition-all duration-200 ${
                    roomColor === c.id 
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a0533] scale-110" 
                      : "opacity-50 hover:opacity-100 hover:scale-105"
                  }`}
                  type="button"
                />
              ))}
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            className="w-full border border-white/20 bg-white/10 text-white placeholder-purple-200/50 p-3 rounded-xl outline-none focus:border-[#f0abfc] transition text-xs resize-none"
            maxLength={80}
          />

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setStep(1)}
              className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold tracking-wider text-xs hover:bg-white/20 transition"
            >
              ← Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="flex-1 bg-[#f0abfc] text-[#1a0533] py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-white transition disabled:opacity-50 shadow-lg"
            >
              {isCreating ? "Creating..." : "Finish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateRoom;