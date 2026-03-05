import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

function VideoRoom({ roomId }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  // Audio analysis refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioSourceRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0–100

  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    ],
    iceCandidatePoolSize: 10,
  };

  // ── AUDIO LEVEL ANALYSER ──────────────────────────────────────────────────
  // Starts polling the microphone's volume using Web Audio API.
  // Runs in a requestAnimationFrame loop so it's smooth and non-blocking.
  const startAudioAnalysis = useCallback((audioTrack) => {
    stopAudioAnalysis(); // clean up any previous analyser

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3; // how quickly it reacts (0=instant, 1=very smooth)

      const stream = new MediaStream([audioTrack]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      audioSourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const SPEAKING_THRESHOLD = 18; // tweak this (0–255): lower = more sensitive

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);

        // RMS (root mean square) gives a good loudness reading
        const rms = Math.sqrt(
          dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length
        );

        const level = Math.min(100, Math.round((rms / 128) * 100));
        setAudioLevel(level);
        setIsSpeaking(rms > SPEAKING_THRESHOLD);

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("Audio analysis failed:", err);
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  // ── CLEANUP on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => stopAudioAnalysis();
  }, [stopAudioAnalysis]);

  // ── WebRTC SETUP ──────────────────────────────────────────────
  const resetConnection = async () => {
    if (!roomId) return;
    const roomRef = doc(db, "calls", roomId);
    await deleteDoc(roomRef);
    const callerCandidates = await getDocs(collection(db, "calls", roomId, "callerCandidates"));
    const calleeCandidates = await getDocs(collection(db, "calls", roomId, "calleeCandidates"));
    await Promise.all(callerCandidates.docs.map((d) => deleteDoc(d.ref)));
    await Promise.all(calleeCandidates.docs.map((d) => deleteDoc(d.ref)));
    window.location.reload();
  };

  const clearCollection = async (colRef) => {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  useEffect(() => {
    if (!roomId) return;
    let unsubscribeRoom = null;
    let unsubscribeCandidates = null;

    const startCall = async () => {
      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        setConnected(pc.connectionState === "connected");
      };

      localStreamRef.current = new MediaStream();

      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteVideo.current.srcObject = event.streams[0];
        } else {
          let stream = remoteVideo.current.srcObject;
          if (!stream) {
            stream = new MediaStream();
            remoteVideo.current.srcObject = stream;
          }
          stream.addTrack(event.track);
        }
      };

      const roomRef = doc(db, "calls", roomId);
      const callerCandidatesCol = collection(db, "calls", roomId, "callerCandidates");
      const calleeCandidatesCol = collection(db, "calls", roomId, "calleeCandidates");

      const roomSnapshot = await getDoc(roomRef);
      const existingData = roomSnapshot.exists() ? roomSnapshot.data() : null;

      let isCaller = false;
      if (!existingData || !existingData.offer) {
        isCaller = true;
      } else if (existingData.offer && !existingData.answer) {
        isCaller = false;
      } else {
        await clearCollection(callerCandidatesCol);
        await clearCollection(calleeCandidatesCol);
        await setDoc(roomRef, {});
        isCaller = true;
      }

      const myCandidates = isCaller ? callerCandidatesCol : calleeCandidatesCol;
      pc.onicecandidate = (event) => {
        if (event.candidate) addDoc(myCandidates, event.candidate.toJSON());
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });

        unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.answer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            unsubscribeCandidates = onSnapshot(calleeCandidatesCol, (snap) => {
              snap.docChanges().forEach((change) => {
                if (change.type === "added")
                  pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              });
            });
          }
        });
      } else {
        await pc.setRemoteDescription(new RTCSessionDescription(existingData.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

        unsubscribeCandidates = onSnapshot(callerCandidatesCol, (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added")
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          });
        });
      }
    };

    startCall().catch(console.error);

    return () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeCandidates) unsubscribeCandidates();
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [roomId]);

  // ── TOGGLE CAMERA ─────────────────────────────────────────────
  const toggleCamera = async () => {
    if (!cameraOn) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideo.current) {
            localVideo.current.srcObject = null;
            localVideo.current.srcObject = localStreamRef.current;
          }
        }

        const sender =
          pcRef.current.getSenders().find((s) => s.track?.kind === "video") ||
          pcRef.current.getSenders().find((s) => s.receiver?.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        } else {
          pcRef.current.addTrack(newVideoTrack, localStreamRef.current);
        }

        setCameraOn(true);
      } catch (err) {
        console.error("Error starting video:", err);
        alert("Could not start camera. Make sure permissions are allowed.");
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current.removeTrack(videoTrack);
      }
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(null);
      setCameraOn(false);
    }
  };

  // ── TOGGLE MIC ─────────────────────────
  const toggleMic = async () => {
    if (micOn) {
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.stop();
        localStreamRef.current.removeTrack(audioTrack);
      }
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(null);

      stopAudioAnalysis(); // ← stop visualiser when mic turns off
      setMicOn(false);
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const newAudioTrack = newStream.getAudioTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newAudioTrack);
        }

        const sender =
          pcRef.current.getSenders().find((s) => s.track?.kind === "audio") ||
          pcRef.current.getSenders().find((s) => s.receiver?.track?.kind === "audio");

        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        } else {
          pcRef.current.addTrack(newAudioTrack, localStreamRef.current);
        }

        startAudioAnalysis(newAudioTrack); // ← start visualiser when mic turns on
        setMicOn(true);
      } catch (err) {
        console.error("Error starting mic:", err);
        alert("Could not access microphone.");
      }
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-slate-800">Live Study Room</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={resetConnection}
            className="text-[10px] bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 px-2 py-1 rounded font-bold transition"
          >
            Reset
          </button>
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
            {connected ? "Connected" : "Wait..."}
          </span>
        </div>
      </div>

      {/* Video tiles */}
      <div className="flex gap-3 p-4 flex-wrap justify-center bg-slate-900">

        {/* ── LOCAL TILE ── */}
        <div
          className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
            isSpeaking
              ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900"
              : "ring-2 ring-transparent ring-offset-2 ring-offset-slate-900"
          }`}
        >
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="w-64 h-44 bg-black object-cover transform scale-x-[-1]"
          />

          {/* Camera-off overlay */}
          {!cameraOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-400">Camera off</span>
            </div>
          )}

          {/* Bottom name bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-semibold">
              You {micOn ? "" : "(Muted)"}
            </span>

            {/* Speaking indicator — only visible when mic is on */}
            {micOn && (
              <div className="flex items-end gap-[2px] h-4">
                {[0.6, 1, 0.75, 1, 0.6].map((scale, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full transition-all duration-75"
                    style={{
                      // height grows proportionally to audioLevel
                      height: isSpeaking
                        ? `${Math.max(4, audioLevel * scale * 0.16)}px`
                        : "3px",
                      backgroundColor: isSpeaking ? "#a78bfa" : "#64748b",
                      // small stagger so bars look like a waveform
                      transitionDelay: `${i * 20}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Speaking glow badge (top-left) */}
          {isSpeaking && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-violet-600/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Speaking
            </div>
          )}
        </div>

        {/* ── REMOTE TILE ── */}
        <div className="relative rounded-xl overflow-hidden ring-2 ring-transparent ring-offset-2 ring-offset-slate-900">
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="w-64 h-44 bg-black object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-semibold">Peer</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-800 border-t border-slate-700">

        {/* Mic button — shows live audio level bar inside when active */}
        <button
          onClick={toggleMic}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all overflow-hidden ${
            micOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {/* audio level fill behind button text */}
          {micOn && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-violet-500/30 transition-all duration-75 rounded-xl"
              style={{ width: `${audioLevel}%` }}
            />
          )}
          <span className="relative z-10">{micOn ? "🎤 Mute" : "🔇 Unmute"}</span>

          {/* mini waveform inside button */}
          {micOn && (
            <div className="relative z-10 flex items-end gap-[2px] h-3">
              {[0.5, 1, 0.7, 1, 0.5].map((s, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-violet-300 transition-all duration-75"
                  style={{
                    height: isSpeaking ? `${Math.max(3, audioLevel * s * 0.12)}px` : "2px",
                    transitionDelay: `${i * 15}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </button>

        <button
          onClick={toggleCamera}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            cameraOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {cameraOn ? "📹 Stop Video" : "📷 Start Video"}
        </button>
      </div>
    </div>
  );
}

export default VideoRoom;