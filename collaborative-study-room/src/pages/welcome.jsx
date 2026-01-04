import { useNavigate } from "react-router-dom";
import welcomeImg from "../assets/welcome.png";

function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 px-4">

      {/* 🌕 GLOW BUBBLES BACKGROUND */}
      <div className="glow-orb w-72 h-72 bg-white/70 top-10 left-10"></div>
      <div className="glow-orb w-96 h-96 bg-fuchsia-500/50 top-1/3 right-20"></div>
      <div className="glow-orb w-60 h-60 bg-indigo-400/60 bottom-20 left-1/4"></div>
      <div className="glow-orb w-48 h-48 bg-white/50 bottom-10 right-10"></div>

      {/* 🌟 CONTENT */}
      <div className="relative z-10 w-full max-w-sm text-center">

        <h1 className="text-white text-3xl font-extrabold tracking-widest mb-6">
          CLOCKEDIN
        </h1>

        <div className="bg-white/20 backdrop-blur-xl rounded-[40px] p-8 shadow-2xl border border-white/30">

          <img
            src={welcomeImg}
            alt="Welcome Illustration"
            className="w-40 mx-auto mb-6"
          />

          <p className="text-xl font-semibold text-white mb-2">
            Welcome!
          </p>

          <p className="text-white/80 mb-8">
            It's about time you got it together 😄
          </p>

          {/* CREATE ACCOUNT */}
          <button
            className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white py-3 rounded-xl shadow-lg mb-4 hover:scale-[1.02] transition"
            onClick={() => navigate("/signup")}
          >
            CREATE A NEW ACCOUNT
          </button>

          {/* LOGIN */}
          <button
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-xl shadow-lg hover:scale-[1.02] transition"
            onClick={() => navigate("/login")}
          >
            LOG IN
          </button>

        </div>
      </div>
    </div>
  );
}

export default Welcome;
