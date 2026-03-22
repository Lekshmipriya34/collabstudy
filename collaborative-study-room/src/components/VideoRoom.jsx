import { useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

function VideoRoom({ roomId }) {
  const { user } = useAuth();
  const videoContainerRef = useRef(null);
  
  // 1. THE FIX: A lock to prevent React Strict Mode from double-loading Zego
  const joinedRef = useRef(false); 

  useEffect(() => {
    // Wait until the div exists and we have user data
    if (!videoContainerRef.current || !user || !roomId) return;
    
    // If we already joined, stop here!
    if (joinedRef.current) return; 

    const startMeeting = async () => {
      // 2. THE FIX: Force the AppID to be a Number, not a string
      const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
      const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

      if (!appID || !serverSecret) {
        console.error("ZegoCloud Error: Missing AppID or ServerSecret in .env");
        return;
      }

      try {
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId,             
          user.uid,           
          user.displayName || "Scholar" 
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        
        // Lock the room so it doesn't duplicate
        joinedRef.current = true; 

        zp.joinRoom({
          container: videoContainerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall, 
          },
          showScreenSharingButton: true,      
          showPreJoinView: false,             
          turnOnCameraWhenJoining: false,     
          turnOnMicrophoneWhenJoining: false, 
        });
      } catch (error) {
        console.error("ZegoCloud Failed to load:", error);
      }
    };

    startMeeting();

  }, [roomId, user]);

  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700/50 z-10">
        <h2 className="text-sm font-bold text-white tracking-widest uppercase">
          Live Study Group
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            Connected
          </span>
        </div>
      </div>

      {/* The Zego UI Container - Note the explicit min-height! */}
      <div 
        ref={videoContainerRef} 
        className="w-full min-h-[400px] md:h-[450px] lg:h-[500px]"
      />
    </div>
  );
}

export default VideoRoom;