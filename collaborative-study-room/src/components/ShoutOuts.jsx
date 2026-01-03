import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit } from "firebase/firestore";

function ShoutOuts({ roomId }) {
  const [activeEmojis, setActiveEmojis] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "reactions"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && change.doc.data().createdAt) {
          triggerAnimation(change.doc.data().emoji);
        }
      });
    });
    return () => unsubscribe();
  }, [roomId]);

  const triggerAnimation = (emoji) => {
    const id = Date.now();
    setActiveEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 80 + 10 }]);
    setTimeout(() => setActiveEmojis((prev) => prev.filter((e) => e.id !== id)), 2000);
  };

  const sendReaction = async (emoji) => {
    await addDoc(collection(db, "rooms", roomId, "reactions"), { emoji, createdAt: serverTimestamp() });
  };

  return (
    <>
      {/* EMOJI ANIMATION LAYER */}
      <div className="fixed inset-0 pointer-events-none z-[1100] overflow-hidden">
        {activeEmojis.map((e) => (
          <div key={e.id} className="absolute bottom-0 text-7xl animate-float-up" style={{ left: `${e.left}%` }}>
            {e.emoji}
          </div>
        ))}
      </div>

      {/* THE DOCK UI */}
      <div className="flex items-center gap-2 bg-[#1a1a1a]/80 backdrop-blur-xl p-2 px-4 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
        <span className="text-[10px] font-black text-purple-300 uppercase tracking-tighter mr-2 border-r border-white/10 pr-3">Encourage</span>
        <div className="flex gap-1">
          {["👏", "🔥", "📚", "⭐", "💪"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="w-12 h-12 flex items-center justify-center text-2xl hover:bg-white/10 rounded-full hover:scale-125 transition-all active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default ShoutOuts;