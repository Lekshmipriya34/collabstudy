import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// Pre-loaded royalty-free ambient tracks
const SOUND_TRACKS = [
  { id: "none", name: "Silence", icon: "🤫", url: "" },
  { id: "lofi", name: "Lo-Fi Study", icon: "🎧", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "rain", name: "Soft Rain", icon: "🌧️", url: "https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bde807.mp3" },
  { id: "cafe", name: "Cozy Café", icon: "☕", url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3" },
  { id: "fire", name: "Campfire", icon: "🔥", url: "https://cdn.pixabay.com/audio/2022/02/22/audio_d0fd5af726.mp3" }
];

export default function AmbientSoundscape({ roomId }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  
  const [isHost, setIsHost] = useState(false);
  const [globalSoundId, setGlobalSoundId] = useState("none");
  
  // Local user settings (does not affect others)
  const [localVolume, setLocalVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayError, setAutoplayError] = useState(false);

  // 1. Listen to Firestore for the current room vibe & host status
  useEffect(() => {
    if (!roomId) return;
    
    const unsub = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsHost(data.createdBy === user?.uid);
        setGlobalSoundId(data.ambientSound || "none");
      }
    });

    return () => unsub();
  }, [roomId, user]);

  // 2. Handle Audio Playback when Host changes the vibe
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (globalSoundId === "none") {
      audioEl.pause();
      return;
    }

    const track = SOUND_TRACKS.find(t => t.id === globalSoundId);
    if (track && audioEl.src !== track.url) {
      audioEl.src = track.url;
      audioEl.loop = true;
      audioEl.volume = isMuted ? 0 : localVolume;
      
      // Play the new track
      audioEl.play().catch((err) => {
        console.warn("Autoplay blocked by browser. User must interact first.", err);
        setAutoplayError(true);
      });
    }
  }, [globalSoundId]);

  // 3. Handle local volume changes smoothly
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : localVolume;
    }
  }, [localVolume, isMuted]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Host Action: Update Firestore
  const handleHostSetVibe = async (soundId) => {
    if (!isHost) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), { ambientSound: soundId });
    } catch (err) {
      console.error("Failed to update room vibe:", err);
    }
  };

  const currentTrack = SOUND_TRACKS.find(t => t.id === globalSoundId) || SOUND_TRACKS[0];

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] shadow-xl p-5 text-white">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-purple-200">
          Room Vibe
        </h3>
        {globalSoundId !== "none" && !isMuted && !autoplayError && (
          <div className="flex gap-1 items-end h-3">
            <span className="w-1 bg-emerald-400 rounded-full animate-[lp-dot_1s_ease-in-out_infinite]" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[lp-dot_1s_ease-in-out_0.2s_infinite]" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[lp-dot_1s_ease-in-out_0.4s_infinite]" />
          </div>
        )}
      </div>

      {/* Currently Playing Info */}
      <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl shadow-inner">
          {currentTrack.icon}
        </div>
        <div>
          <p className="text-sm font-black tracking-wide">{currentTrack.name}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {isHost ? "You control the vibe" : "Set by Host"}
          </p>
        </div>
      </div>

      {/* Host Controls (Only visible to the room creator) */}
      {isHost && (
        <div className="mb-5">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Change Vibe</p>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {SOUND_TRACKS.map((track) => (
              <button
                key={track.id}
                onClick={() => handleHostSetVibe(track.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  globalSoundId === track.id
                    ? "bg-purple-500 text-white shadow-md scale-105"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{track.icon}</span>
                {track.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Local Volume Controls (Visible to everyone) */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="text-white/60 hover:text-white transition"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : "🔉"}
        </button>
        
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : localVolume}
          onChange={(e) => {
            setLocalVolume(parseFloat(e.target.value));
            if (isMuted) setIsMuted(false);
            if (autoplayError) {
              audioRef.current.play().catch(()=>console.log("Still blocked"));
              setAutoplayError(false);
            }
          }}
          className="w-full accent-purple-400 h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer"
        />
      </div>

      {autoplayError && (
        <button 
          onClick={() => { audioRef.current.play(); setAutoplayError(false); }}
          className="w-full mt-3 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold py-2 rounded-xl uppercase tracking-widest border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition"
        >
          ▶ Click to enable audio
        </button>
      )}
    </div>
  );
}