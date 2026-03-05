import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const ROOM_COLORS = [
  { id: "purple", bg: "from-[#8b2fc9] to-[#6018a3]", hex: "#8b2fc9" },
  { id: "blue",   bg: "from-[#1d58c8] to-[#123b8f]", hex: "#1d58c8" },
  { id: "green",  bg: "from-[#0d8250] to-[#085a36]", hex: "#0d8250" },
  { id: "red",    bg: "from-[#e11d48] to-[#9f1239]", hex: "#e11d48" },
  { id: "orange", bg: "from-[#d97706] to-[#92400e]", hex: "#d97706" },
];

const ROOM_EMOJIS = ["📚","🔬","🧮","💻","🎨","🌍","⚗️","🎵","📝","🏛️","🧬","🚀"];

export default function EditRoom({ roomId, room, onClose }) {
  const [name, setName] = useState(room.name || "");
  const [description, setDescription] = useState(room.description || "");
  const [emoji, setEmoji] = useState(room.emoji || "📚");
  
  // Safely find the current color object by ID, fallback to purple
  const [color, setColor] = useState(
    ROOM_COLORS.find(c => c.id === room.color) || ROOM_COLORS[0]
  );
  
  const [isPrivate, setIsPrivate] = useState(room.isPrivate ?? false);
  const [maxMembers, setMaxMembers] = useState(room.maxMembers || 10);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim()) { alert("Room name cannot be empty."); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        name: name.trim(),
        description: description.trim(),
        emoji,
        color: color.id, // Save the simple ID string!
        isPrivate,
        maxMembers: Number(maxMembers),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#1a0f2e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className={`bg-gradient-to-r ${color.bg} p-5 flex items-center gap-3`}>
          <span className="text-4xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg truncate">{name || "Room Name"}</p>
            <p className="text-white/60 text-xs">STUDY SPACE · {isPrivate ? "🔒 Private" : "🌐 Public"} · Max {maxMembers}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl transition">✕</button>
        </div>

        {/* ── BODY ── */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Name */}
          <div>
            <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-1.5">
              Room Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 px-3 py-2.5 rounded-xl outline-none focus:border-purple-400 text-sm font-bold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What are you studying?"
              rows={2}
              maxLength={120}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 px-3 py-2 rounded-xl outline-none focus:border-purple-400 text-sm resize-none"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-2">
              Room Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ROOM_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition ${
                    emoji === e
                      ? "bg-white/30 border-2 border-white scale-110"
                      : "bg-white/10 border border-white/10 hover:bg-white/20"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-2">
              Room Colour
            </label>
            <div className="flex gap-2 flex-wrap">
              {ROOM_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.bg} transition ${
                    color.id === c.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a0f2e] scale-110"
                      : "hover:scale-105"
                  }`}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Max Members + Privacy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-1.5">
                Max Members
              </label>
              <input
                type="number" min={2} max={50}
                value={maxMembers}
                onChange={e => setMaxMembers(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-xl outline-none focus:border-purple-400 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-purple-300 uppercase block mb-1.5">
                Privacy
              </label>
              <div className="flex gap-1.5 mt-1">
                {[false, true].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => setIsPrivate(v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      isPrivate === v
                        ? "bg-purple-600 text-white border border-purple-400"
                        : "bg-white/10 text-white/60 border border-white/10 hover:bg-white/20"
                    }`}
                  >
                    {v ? "🔒" : "🌐"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition shadow-lg ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {saved ? "✓ Saved!" : loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}