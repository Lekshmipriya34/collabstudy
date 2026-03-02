import { useEffect, useRef, useState } from "react";
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
  const localStreamRef = useRef(null); // Stores the full stream (Audio + Video)

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [connected, setConnected] = useState(false);

  const servers = {
    iceServers: [
      {
        urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  const clearCollection = async (colRef) => {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  // 1. Initial Setup
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

      // Get initial stream (Audio + Video)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
      });

      // --- CRITICAL FIX FOR LIGHT OFF ---
      // 1. Mute Mic (Soft mute is fine for audio)
      stream.getAudioTracks().forEach((t) => (t.enabled = false));

      // 2. Stop Camera (Hard stop turns off light)
      // We keep the track object to add it to PC, but we stop it immediately.
      const videoTrack = stream.getVideoTracks()[0];
      pc.addTrack(videoTrack, stream); // Add the "stopped" track slot to connection
      videoTrack.stop(); // Turn off the hardware light immediately

      // Add audio track
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      localStreamRef.current = stream;
      
      // Update local video element (it will be black/empty initially)
      if (localVideo.current) localVideo.current.srcObject = stream;

      // Handle Remote Stream
      pc.ontrack = (event) => {
        if (remoteVideo.current) {
          const remoteStream = new MediaStream();
          event.streams[0].getTracks().forEach((track) =>
            remoteStream.addTrack(track)
          );
          remoteVideo.current.srcObject = remoteStream;
        }
      };

      // --- Firebase Signaling Logic (Same as before) ---
      const roomRef = doc(db, "calls", roomId);
      const callerCandidatesCol = collection(db, "calls", roomId, "callerCandidates");
      const calleeCandidatesCol = collection(db, "calls", roomId, "calleeCandidates");

      const roomSnapshot = await getDoc(roomRef);
      const existingData = roomSnapshot.exists() ? roomSnapshot.data() : null;
      const hasLiveSession = existingData?.offer && existingData?.answer;
      const isCaller = !roomSnapshot.exists() || !hasLiveSession;

      if (isCaller) {
        await clearCollection(callerCandidatesCol);
        await clearCollection(calleeCandidatesCol);
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
      // Stop all tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [roomId]);

  // --- NEW TOGGLE CAMERA LOGIC ---
  const toggleCamera = async () => {
    // Turning ON
    if (!cameraOn) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];

        // 1. Replace the track in the peer connection (Sender)
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }

        // 2. Update local view
        if (localVideo.current) {
          // We need to keep the audio track, so we create a new stream or add to existing
           localStreamRef.current.addTrack(newVideoTrack);
           // Force update source object
           localVideo.current.srcObject = new MediaStream([newVideoTrack]); 
        }

        setCameraOn(true);
      } catch (err) {
        console.error("Error restarting video:", err);
      }
    } 
    // Turning OFF
    else {
      // 1. Stop the track (Hardware Light OFF)
      const videoTrack = localStreamRef.current.getVideoTracks().find(t => t.readyState === 'live');
      if (videoTrack) {
        videoTrack.stop(); // This kills the light
        localStreamRef.current.removeTrack(videoTrack);
      }

      // 2. Tell PeerConnection we stopped sending
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(null); // Send "nothing"
      }
      
      setCameraOn(false);
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-slate-800">Live Study Room</h2>
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            connected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* Videos */}
      <div className="flex gap-3 p-4 flex-wrap justify-center bg-slate-900">
        {/* Local */}
        <div className="relative rounded-xl overflow-hidden group">
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
              <div className="flex flex-col items-center gap-2 text-slate-400">
                {/* SVG Icon */}
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
                </svg>
                <span className="text-xs font-semibold">Camera off</span>
              </div>
            </div>
          )}
          
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">
            You {micOn ? "" : "(Muted)"}
          </span>
        </div>

        {/* Remote */}
        <div className="relative rounded-xl overflow-hidden">
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="w-64 h-44 bg-black object-cover"
          />
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">
            Peer
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-800 border-t border-slate-700">
        <button
          onClick={toggleMic}
          className={`flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            micOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>

        <button
          onClick={toggleCamera}
          className={`flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            cameraOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {cameraOn ? "Stop Video" : "Start Video"}
        </button>
      </div>
    </div>
  );
}

export default VideoRoom;