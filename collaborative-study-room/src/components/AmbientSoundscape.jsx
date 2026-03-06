import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// All URLs are from Pixabay's CDN which explicitly allows hotlinking/embedding.
// Verified working as of 2025. If one ever breaks, swap with another Pixabay audio URL.
const SOUND_TRACKS = [
  {
    id: "none",
    name: "Silence",
    icon: "🤫",
    url: "",
  },
  {
    id: "lofi",
    name: "Lo-Fi Study",
    icon: "🎧",
    // Pixabay: "lofi-study" by Lesfm
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "rain",
    name: "Soft Rain",
    icon: "🌧️",
    // Pixabay: "rain-and-thunder" by floraphonic — no hotlink restriction
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_946f0a8b6e.mp3",
  },
  {
    id: "cafe",
    name: "Cozy Café",
    icon: "☕",
    // Pixabay: "coffee-shop-ambience" by freesound_community
    url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3",
  },
  {
    id: "fire",
    name: "Campfire",
    icon: "🔥",
    // Pixabay: "crackling-fireplace" by freesound_community
    url: "https://cdn.pixabay.com/audio/2022/03/10/audio_270f49d3f5.mp3",
  },
  {
    id: "forest",
    name: "Forest",
    icon: "🌿",
    // Pixabay: "forest-with-small-river-birds-and-nature-sounds" by Olexy
    url: "https://cdn.pixabay.com/audio/2022/03/10/audio_bb630cc098.mp3",
  },
];

export default function AmbientSoundscape({ roomId }) {
  const audioRef = useRef(null);

  const [globalSoundId, setGlobalSoundId]   = useState("none");
  const [localVolume, setLocalVolume]         = useState(0.4);
  const [isMuted, setIsMuted]                 = useState(false);
  const [autoplayError, setAutoplayError]     = useState(false);
  const [isLoading, setIsLoading]             = useState(false);

  // 1. Listen to Firestore for the current room vibe
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSoundId(docSnap.data().ambientSound || "none");
      }
    });
    return () => unsub();
  }, [roomId]);

  // 2. Handle audio playback when vibe changes
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (globalSoundId === "none") {
      audioEl.pause();
      setIsLoading(false);
      return;
    }

    const track = SOUND_TRACKS.find((t) => t.id === globalSoundId);
    if (!track?.url) return;

    // Only reload if the source actually changed
    const newSrc = track.url;
    if (audioEl.src !== newSrc) {
      setIsLoading(true);
      audioEl.src = newSrc;
      audioEl.loop = true;
    }

    audioEl.volume = isMuted ? 0 : localVolume;

    audioEl
      .play()
      .then(() => {
        setAutoplayError(false);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Autoplay blocked:", err);
        setAutoplayError(true);
        setIsLoading(false);
      });
  }, [globalSoundId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Local volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : localVolume;
    }
  }, [localVolume, isMuted]);

  // 4. Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handleSetVibe = async (soundId) => {
    try {
      await updateDoc(doc(db, "rooms", roomId), { ambientSound: soundId });
    } catch (err) {
      console.error("Failed to update room vibe:", err);
    }
  };

  const handleManualPlay = () => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setAutoplayError(false))
      .catch(console.warn);
  };

  const currentTrack = SOUND_TRACKS.find((t) => t.id === globalSoundId) || SOUND_TRACKS[0];
  const isPlaying = globalSoundId !== "none" && !isMuted && !autoplayError;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] shadow-xl p-5 text-white">
      <audio ref={audioRef} preload="none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-purple-200">
          Room Vibe
        </h3>
        {/* Animated bars when playing */}
        {isPlaying && !isLoading && (
          <div className="flex gap-[3px] items-end h-4">
            {[0, 0.2, 0.1, 0.3, 0.15].map((d, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-emerald-400"
                style={{
                  height: "100%",
                  animation: `soundBar 0.9s ease-in-out ${d}s infinite alternate`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>
        )}
        {isLoading && (
          <span className="text-[10px] text-white/40 uppercase tracking-widest animate-pulse">
            Loading…
          </span>
        )}
      </div>

      {/* Inline keyframes for the sound bars */}
      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.25); opacity: 0.5; }
          to   { transform: scaleY(1);    opacity: 1; }
        }
      `}</style>

      {/* Currently Playing */}
      <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl shadow-inner">
          {currentTrack.icon}
        </div>
        <div>
          <p className="text-sm font-black tracking-wide">{currentTrack.name}</p>
          <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold">
            {globalSoundId === "none" ? "No audio playing" : "Shared with room"}
          </p>
        </div>
      </div>

      {/* Track selector */}
      <div className="mb-5">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">
          Change Vibe
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {SOUND_TRACKS.map((track) => (
            <button
              key={track.id}
              onClick={() => handleSetVibe(track.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
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

      {/* Local volume */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <button
          onClick={() => setIsMuted((m) => !m)}
          className="text-white/60 hover:text-white transition text-lg"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : localVolume < 0.4 ? "🔈" : "🔉"}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : localVolume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setLocalVolume(v);
            if (isMuted) setIsMuted(false);
            // If user drags volume, treat it as interaction → retry autoplay
            if (autoplayError && audioRef.current) {
              audioRef.current.play()
                .then(() => setAutoplayError(false))
                .catch(console.warn);
            }
          }}
          className="w-full accent-purple-400 h-1.5 rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, #a855f7 ${(isMuted ? 0 : localVolume) * 100}%, rgba(255,255,255,0.15) 0%)` }}
        />

        <span className="text-[10px] text-white/30 font-mono w-6 text-right">
          {Math.round((isMuted ? 0 : localVolume) * 100)}
        </span>
      </div>

      {/* Autoplay blocked banner */}
      {autoplayError && (
        <button
          onClick={handleManualPlay}
          className="w-full mt-3 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold py-2.5 rounded-xl uppercase tracking-widest border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition"
        >
          ▶ Click to enable audio
        </button>
      )}
    </div>
  );
}