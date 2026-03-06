import { useEffect, useState } from "react";

/**
 * RoomKeycardTransition
 * Renders the keycard flip animation before entering a room.
 *
 * Usage — in Dashboard.jsx where you handle setSelectedRoomId:
 *
 *   const [pendingRoom, setPendingRoom] = useState(null);
 *   const [selectedRoomId, setSelectedRoomId] = useState(null);
 *
 *   const enterRoom = (roomId, roomData) => setPendingRoom({ roomId, ...roomData });
 *
 *   if (pendingRoom) return (
 *     <RoomKeycardTransition
 *       room={pendingRoom}
 *       onComplete={() => { setSelectedRoomId(pendingRoom.roomId); setPendingRoom(null); }}
 *     />
 *   );
 */
export default function RoomKeycardTransition({ room, onComplete }) {
  const [phase, setPhase] = useState("enter"); // enter | float | exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("float"), 1500);
    const t2 = setTimeout(() => setPhase("exit"),  3200);
    const t3 = setTimeout(() => onComplete?.(),    3900);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onComplete]);

  /* mouse tilt */
  useEffect(() => {
    const card = document.getElementById("sh-keycard");
    if (!card) return;
    const move = (e) => {
      if (phase === "exit") return;
      const r   = card.getBoundingClientRect();
      const cx  = r.left + r.width  / 2;
      const cy  = r.top  + r.height / 2;
      const dx  = (e.clientX - cx) / (window.innerWidth  / 2);
      const dy  = (e.clientY - cy) / (window.innerHeight / 2);
      card.style.transform = `perspective(1100px) rotateX(${-dy*11}deg) rotateY(${dx*11}deg)`;
    };
    const leave = () => { card.style.transform = ""; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseleave", leave); };
  }, [phase]);

  const memberColors = [
    "linear-gradient(135deg,#7c3aed,#4c1d95)",
    "linear-gradient(135deg,#2563eb,#1e3a5f)",
    "linear-gradient(135deg,#059669,#064e3b)",
    "linear-gradient(135deg,#be185d,#7f1d1d)",
  ];

  const members = room.memberProfiles || [];

  return (
    <>
      <style>{`
        @keyframes kc-flip {
          0%  { opacity:0; transform:perspective(1100px) rotateY(-95deg) scale(.75) translateY(30px) }
          55% { opacity:1; transform:perspective(1100px) rotateY(14deg)  scale(1.05) translateY(-4px) }
          75% { transform:perspective(1100px) rotateY(-6deg) scale(1.02) }
          100%{ opacity:1; transform:perspective(1100px) rotateY(0deg)   scale(1) translateY(0) }
        }
        @keyframes kc-float {
          0%,100%{ transform:perspective(1100px) rotateY(0) rotateX(0) translateY(0) }
          25%    { transform:perspective(1100px) rotateY(4deg)  rotateX(-2deg) translateY(-6px) }
          50%    { transform:perspective(1100px) rotateY(-3deg) rotateX(2deg)  translateY(-10px) }
          75%    { transform:perspective(1100px) rotateY(5deg)  rotateX(-1deg) translateY(-4px) }
        }
        @keyframes kc-exit {
          0%  { opacity:1; transform:perspective(1100px) rotateY(0) scale(1) translateY(0) }
          30% { opacity:1; transform:perspective(1100px) rotateY(-8deg) scale(1.04) translateY(-12px) }
          100%{ opacity:0; transform:perspective(1100px) rotateY(90deg) scale(.8) translateY(-60px) }
        }
        @keyframes kc-shimmer { 0%{left:-130%} 100%{left:130%} }
        @keyframes kc-holo    { 0%{transform:rotate(0deg) scale(1);opacity:.4} 50%{transform:rotate(180deg) scale(1.5);opacity:.15} 100%{transform:rotate(360deg) scale(1);opacity:.4} }
        @keyframes kc-stripe  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes kc-chip    { 0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.6)} 50%{box-shadow:0 0 0 8px rgba(250,204,21,0)} }
        @keyframes kc-wifi    { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes kc-ring    { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.8);opacity:0} }
        @keyframes kc-fadeup  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes kc-fadedown{ from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes kc-dot     { 0%,100%{transform:translateY(0);opacity:.35} 50%{transform:translateY(-6px);opacity:1} }
        @keyframes orb-drift  { 0%{transform:translate(0,0)}33%{transform:translate(40px,-30px)}66%{transform:translate(-25px,20px)}100%{transform:translate(0,0)} }
      `}</style>

      <div style={{
        position:"fixed",inset:0,zIndex:9998,overflow:"hidden",
        background:"radial-gradient(ellipse at 55% 25%,#3b0764 0%,#1a0533 55%,#0d0618 100%)",
        display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",
        transition:"opacity .6s ease",
        opacity: phase==="exit" ? 0 : 1,
      }}>
        {/* grid */}
        <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)",backgroundSize:"52px 52px" }} />

        {/* orbs */}
        {[
          {w:600,x:"-120px",y:"-180px",c:"rgba(109,40,217,.14)",b:90,dur:"8s"},
          {w:400,x:"60%",   y:"55%",   c:"rgba(232,121,249,.1)", b:75,dur:"7s"},
        ].map((o,i)=>(
          <div key={i} style={{ position:"absolute",width:o.w,height:o.w,borderRadius:"50%",background:o.c,left:o.x,top:o.y,filter:`blur(${o.b}px)`,animation:`orb-drift ${o.dur} ease-in-out infinite`,pointerEvents:"none" }} />
        ))}

        {/* pulse rings behind card */}
        {[0,.6,1.2].map((d,i)=>(
          <div key={i} style={{ position:"absolute",width:420,height:260,borderRadius:22,border:"1px solid rgba(167,139,250,.18)",animation:`kc-ring 2.4s ease-out ${d}s infinite`,pointerEvents:"none" }} />
        ))}

        {/* entering label */}
        <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:700,letterSpacing:5,textTransform:"uppercase",color:"rgba(196,181,253,.5)",marginBottom:32,animation:"kc-fadedown .5s ease .2s both" }}>
          Entering room
        </p>

        {/* ── KEYCARD ── */}
        <div id="sh-keycard" style={{
          width:380, height:230,
          borderRadius:22, position:"relative", overflow:"hidden",
          boxShadow:"0 32px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08), 0 0 90px rgba(124,58,237,.4)",
          animation: phase==="enter" ? "kc-flip 1.1s cubic-bezier(.34,1.2,.64,1) .3s both"
                   : phase==="float" ? "kc-float 5s ease-in-out infinite"
                   : "kc-exit .7s cubic-bezier(.76,0,.24,1) forwards",
          transition:"transform .08s ease",
        }}>
          {/* base gradient */}
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#1e0a3c 0%,#3b0764 40%,#6b21a8 70%,#4c1d95 100%)" }} />

          {/* holographic */}
          <div style={{ position:"absolute",inset:0,background:"conic-gradient(from 0deg at 60% 40%,rgba(167,139,250,0) 0deg,rgba(232,121,249,.28) 60deg,rgba(56,189,248,.18) 120deg,rgba(167,139,250,0) 180deg,rgba(250,204,21,.14) 240deg,rgba(167,139,250,0) 300deg,rgba(232,121,249,.22) 360deg)",animation:"kc-holo 8s linear infinite",mixBlendMode:"screen",opacity:.5 }} />

          {/* shimmer sweep */}
          <div style={{ position:"absolute",top:0,bottom:0,width:"45%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)",transform:"skewX(-15deg)",left:"-130%",animation:"kc-shimmer 2.4s ease 1.2s infinite" }} />

          {/* noise */}
          <div style={{ position:"absolute",inset:0,opacity:.04,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

          {/* EMV chip */}
          <div style={{ position:"absolute",top:32,left:28,width:46,height:36,background:"linear-gradient(135deg,#fcd34d,#b45309)",borderRadius:7,boxShadow:"0 2px 10px rgba(0,0,0,.45)",animation:"kc-chip 2.2s ease-in-out 1.5s infinite" }}>
            <div style={{ position:"absolute",top:10,left:0,right:0,height:1,background:"rgba(0,0,0,.22)" }} />
            <div style={{ position:"absolute",top:18,left:0,right:0,height:1,background:"rgba(0,0,0,.22)" }} />
            <div style={{ position:"absolute",left:15,top:0,bottom:0,width:1,background:"rgba(0,0,0,.18)" }} />
          </div>

          {/* NFC arcs */}
          <div style={{ position:"absolute",top:36,left:90,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.7 }}>
            {[{w:6,h:4,d:0},{w:13,h:8,d:.2},{w:20,h:12,d:.4}].map((a,i)=>(
              <div key={i} style={{ width:a.w,height:a.h,border:"1.5px solid rgba(255,255,255,.6)",borderBottom:"none",borderRadius:"50% 50% 0 0",animation:`kc-wifi 1.5s ease-in-out ${a.d}s infinite` }} />
            ))}
            <div style={{ width:3,height:3,borderRadius:"50%",background:"rgba(255,255,255,.8)",animation:"kc-wifi 1.5s ease-in-out infinite" }} />
          </div>

          {/* Room name top-right */}
          <div style={{ position:"absolute",top:26,right:22,textAlign:"right" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:3,color:"rgba(255,255,255,.38)",textTransform:"uppercase" }}>Study Room</div>
            <div style={{ fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:"white",letterSpacing:-0.5,marginTop:5,textShadow:"0 2px 14px rgba(0,0,0,.4)" }}>
              {room.name || "Study Room"}
            </div>
          </div>

          {/* Subject badge */}
          {room.subject && (
            <div style={{ position:"absolute",top:82,right:22,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:100,padding:"3px 10px",fontSize:10,fontWeight:600,color:"rgba(255,255,255,.75)",fontFamily:"'Outfit',sans-serif",letterSpacing:1 }}>
              {room.subject}
            </div>
          )}

          {/* Access code */}
          <div style={{ position:"absolute",bottom:54,left:28,fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.35)",textTransform:"uppercase" }}>Access Code</div>
          <div style={{ position:"absolute",bottom:26,left:28,fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:700,letterSpacing:9,color:"white",textShadow:"0 0 22px rgba(232,121,249,.65)" }}>
            {room.code || "------"}
          </div>

          {/* Member avatars bottom-right */}
          <div style={{ position:"absolute",bottom:26,right:22,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5 }}>
            <div style={{ display:"flex" }}>
              {(members.length ? members : [null,null]).slice(0,4).map((m,i)=>(
                <div key={i} style={{ width:27,height:27,borderRadius:8,background:memberColors[i % memberColors.length],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fraunces',serif",fontSize:11,fontWeight:900,color:"white",border:"2px solid rgba(26,10,60,.8)",marginLeft:i===0?0:-7 }}>
                  {m ? (m.fullName||m.username||"?").charAt(0).toUpperCase() : "?"}
                </div>
              ))}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(255,255,255,.4)" }}>
              {room.members?.length || "—"} members
            </div>
          </div>

          {/* bottom stripe */}
          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:9,background:"linear-gradient(90deg,#7c3aed,#e879f9,#7c3aed,#e879f9)",backgroundSize:"200% 100%",animation:"kc-stripe 2s linear infinite",opacity:.85 }} />
        </div>

        {/* "Preparing room" dots */}
        <div style={{ marginTop:34,display:"flex",alignItems:"center",gap:10,animation:"kc-fadeup .5s ease 1.4s both" }}>
          <div style={{ display:"flex",gap:6 }}>
            {[0,.2,.4].map((d,i)=>(
              <div key={i} style={{ width:5,height:5,borderRadius:"50%",background:"#a78bfa",animation:`kc-dot 1.4s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
          <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:"rgba(196,181,253,.5)" }}>
            Preparing your room
          </span>
        </div>
      </div>
    </>
  );
}