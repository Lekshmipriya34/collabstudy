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

  const resetConnection = async () => {
    if(!roomId) return;
    const roomRef = doc(db, "calls", roomId);
    await deleteDoc(roomRef);
    const callerCandidates = await getDocs(collection(db, "calls", roomId, "callerCandidates"));
    const calleeCandidates = await getDocs(collection(db, "calls", roomId, "calleeCandidates"));
    callerCandidates.forEach((doc) => deleteDoc(doc.ref));
    calleeCandidates.forEach((doc) => deleteDoc(doc.ref));
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

      // 1. Initialize an empty stream container
      localStreamRef.current = new MediaStream();

      // 2. Add "Empty" Transceivers (THIS KEEPS HARDWARE OFF INITIALLY)
      // This tells the connection: "I might send media later, so prepare the channels"
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      pc.addTransceiver('video', { direction: 'sendrecv' });
      
      // Handle Remote Stream
      pc.ontrack = (event) => {
        if (remoteVideo.current && event.streams[0]) {
          remoteVideo.current.srcObject = event.streams[0];
        } else if (remoteVideo.current && event.track) {
          const remoteStream = new MediaStream();
          remoteStream.addTrack(event.track);
          remoteVideo.current.srcObject = remoteStream;
        }
      };

      // --- Signaling ---
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
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [roomId]);

  const toggleCamera = async () => {
    // 1. Turning Camera ON
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

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video") 
                       || pcRef.current.getSenders().find((s) => s.receiver?.track?.kind === "video"); 
        
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
    } 
    // 2. Turning Camera OFF (Hard Stop)
    else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop(); // Kills the camera hardware light
        localStreamRef.current.removeTrack(videoTrack);
      }
      
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(null); 
      
      setCameraOn(false);
    }
  };

  const toggleMic = async () => {
    // 1. Turning Mic OFF (Hard Stop)
    if (micOn) {
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.stop(); // Kills the browser's red recording dot!
        localStreamRef.current.removeTrack(audioTrack);
      }
      
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(null);
      
      setMicOn(false);
    } 
    // 2. Turning Mic ON
    else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true } 
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newAudioTrack);
        }

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "audio") 
                       || pcRef.current.getSenders().find((s) => s.receiver?.track?.kind === "audio"); 
        
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        } else {
          pcRef.current.addTrack(newAudioTrack, localStreamRef.current);
        }
        
        setMicOn(true);
      } catch (err) {
        console.error("Error starting mic:", err);
        alert("Could not access microphone.");
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-slate-800">Live Study Room</h2>
        <div className="flex gap-2">
           <button 
             onClick={resetConnection} 
             className="text-[10px] bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 px-2 py-1 rounded font-bold transition"
           >
             Reset
           </button>
           <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
             <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
             {connected ? "Connected" : "Wait..."}
           </span>
        </div>
      </div>

      {/* Videos */}
      <div className="flex gap-3 p-4 flex-wrap justify-center bg-slate-900">
        {/* Local Video */}
        <div className="relative rounded-xl overflow-hidden group">
          <video 
            ref={localVideo} 
            autoPlay 
            muted 
            playsInline 
            className="w-64 h-44 bg-black object-cover transform scale-x-[-1]" 
          />
          {!cameraOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-400">Camera off</span>
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You {micOn ? "" : "(Muted)"}</span>
        </div>

        {/* Remote Video */}
        <div className="relative rounded-xl overflow-hidden">
          <video 
            ref={remoteVideo} 
            autoPlay 
            playsInline 
            className="w-64 h-44 bg-black object-cover" 
          />
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