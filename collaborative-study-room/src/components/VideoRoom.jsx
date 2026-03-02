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
  const localStreamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [connected, setConnected] = useState(false);

  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    ],
    iceCandidatePoolSize: 10,
  };

  // Helper to completely reset the signaling data in Firestore
  const resetConnection = async () => {
    if(!roomId) return;
    const roomRef = doc(db, "calls", roomId);
    // Delete the main call doc
    await deleteDoc(roomRef);
    // Delete all candidates
    const callerCandidates = await getDocs(collection(db, "calls", roomId, "callerCandidates"));
    const calleeCandidates = await getDocs(collection(db, "calls", roomId, "calleeCandidates"));
    
    callerCandidates.forEach((doc) => deleteDoc(doc.ref));
    calleeCandidates.forEach((doc) => deleteDoc(doc.ref));
    
    window.location.reload(); // Hard reload to force clean state
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
      });

      // Default to OFF
      stream.getAudioTracks().forEach((t) => (t.enabled = false));
      const videoTrack = stream.getVideoTracks()[0];
      pc.addTrack(videoTrack, stream);
      videoTrack.stop(); 
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      localStreamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      pc.ontrack = (event) => {
        if (remoteVideo.current) {
          const remoteStream = new MediaStream();
          event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
          remoteVideo.current.srcObject = remoteStream;
        }
      };

      const roomRef = doc(db, "calls", roomId);
      const callerCandidatesCol = collection(db, "calls", roomId, "callerCandidates");
      const calleeCandidatesCol = collection(db, "calls", roomId, "calleeCandidates");

      const roomSnapshot = await getDoc(roomRef);
      const existingData = roomSnapshot.exists() ? roomSnapshot.data() : null;
      // FIX: Stricter check for stale data
      const hasLiveSession = existingData?.offer && existingData?.answer;
      
      // If data exists but no answer, it might be stale. 
      // Current logic: If doc doesn't exist OR it has a full session (completed), we start fresh as caller.
      const isCaller = !roomSnapshot.exists();

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
        // We are Callee
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

  const toggleCamera = async () => {
    if (!cameraOn) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(newVideoTrack);
        if (localVideo.current) {
           localStreamRef.current.addTrack(newVideoTrack);
           localVideo.current.srcObject = new MediaStream([newVideoTrack]); 
        }
        setCameraOn(true);
      } catch (err) { console.error(err); }
    } else {
      const videoTrack = localStreamRef.current.getVideoTracks().find(t => t.readyState === 'live');
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current.removeTrack(videoTrack);
      }
      const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(null);
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
    <div className="bg-white rounded-2xl shadow-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-slate-800">Live Study Room</h2>
        <div className="flex gap-2">
           {/* RESET BUTTON */}
           <button 
             onClick={resetConnection} 
             className="text-[10px] bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 px-2 py-1 rounded font-bold transition"
             title="Click this if video is stuck"
           >
             Reset connection
           </button>
           <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
             <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
             {connected ? "Connected" : "Connecting..."}
           </span>
        </div>
      </div>

      {/* Videos */}
      <div className="flex gap-3 p-4 flex-wrap justify-center bg-slate-900">
        <div className="relative rounded-xl overflow-hidden group">
          <video ref={localVideo} autoPlay muted playsInline className="w-64 h-44 bg-black object-cover transform scale-x-[-1]" />
          {!cameraOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-400">Camera off</span>
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You {micOn ? "" : "(Muted)"}</span>
        </div>

        <div className="relative rounded-xl overflow-hidden">
          <video ref={remoteVideo} autoPlay playsInline className="w-64 h-44 bg-black object-cover" />
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">Peer</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-800 border-t border-slate-700">
        <button onClick={toggleMic} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${micOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"}`}>
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button onClick={toggleCamera} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${cameraOn ? "bg-slate-600 text-white" : "bg-red-500 text-white"}`}>
          {cameraOn ? "Stop Video" : "Start Video"}
        </button>
      </div>
    </div>
  );
}

export default VideoRoom;