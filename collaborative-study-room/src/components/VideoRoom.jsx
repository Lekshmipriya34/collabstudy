import { useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

function VideoRoom({ roomId }) {
  const { user } = useAuth();
  const videoContainerRef = useRef(null);

  useEffect(() => {
    if (!videoContainerRef.current || !user || !roomId) return;

    let zp = null;

    const startMeeting = async () => {
      // 1. Get your Zego credentials from the .env file
      const appID = Number(import.meta.env.VITE_ZEGO_APP_ID);
      const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

      if (!appID || !serverSecret) {
        console.error("ZegoCloud credentials missing in .env file!");
        return;
      }

      // 2. Generate a token so the user can join securely
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomId,             // The room they are joining
        user.uid,           // Their unique Firebase ID
        user.displayName || "Scholar" // Their display name
      );

      // 3. Initialize the Zego Room
      zp = ZegoUIKitPrebuilt.create(kitToken);

      // 4. Mount the UI to our div
      zp.joinRoom({
        container: videoContainerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall, // Configured for multi-user study groups!
        },
        showScreenSharingButton: true,       // Essential for study rooms
        showPreJoinView: false,              // Skip the lobby, jump right in
        turnOnCameraWhenJoining: false,      // Start with camera off for privacy
        turnOnMicrophoneWhenJoining: false,  // Start muted
        layout: "Grid",                      // Auto-arranges tiles for multiple people
        maxUsers: 10,                        // Cap the study room size if you want
      });
    };

    startMeeting();

    // 5. Clean up and leave the room when the component unmounts
    return () => {
      if (zp) {
        zp.destroy();
      }
    };
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

      {/* ZegoCloud will inject the entire video grid and controls right here */}
      <div 
        ref={videoContainerRef} 
        className="w-full h-[350px] md:h-[450px] lg:h-[500px]"
      />
    </div>
  );
}

export default VideoRoom;