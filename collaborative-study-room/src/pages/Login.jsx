import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; 
import { useAuth } from "../context/AuthContext";
import welcomeImg from "../assets/welcome.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); 
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth(); 

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Try again later.");
      } else {
        setError("Failed to login. Please check your details.");
      }
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address above to reset your password.");
      return;
    }

    try {
      setMessage("");
      setError("");
      await sendPasswordResetEmail(auth, email);
      setMessage("Check your inbox! We sent a password reset link.");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError("Failed to send reset email. Try again.");
      }
    }
  };

  // Modern Input Style
  const inputStyle = "w-full bg-white/10 border border-white/20 text-white placeholder-purple-200 px-5 py-4 rounded-2xl focus:outline-none focus:border-purple-300 focus:bg-white/20 transition-all font-medium text-sm backdrop-blur-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e879f9] via-[#7c3aed] to-[#4c1d95] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      
      {/* Background Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-900/40 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[2.5rem] shadow-2xl z-10">
        
        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">
            <h1 className="text-white text-3xl font-black tracking-tighter mb-2 italic">
              CLOCKED<span className="text-purple-200">IN</span>
            </h1>
            <img 
              src={welcomeImg} 
              alt="Welcome Illustration" 
              className="w-28 opacity-90 drop-shadow-2xl" 
            />
        </div>

        {/* STATUS MESSAGES */}
        {error && (
          <div className="bg-rose-500/20 border border-rose-500/50 text-rose-100 px-4 py-3 rounded-2xl text-center text-[11px] mb-6 font-bold uppercase tracking-widest">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 px-4 py-3 rounded-2xl text-center text-[11px] mb-6 font-bold uppercase tracking-widest">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-100 uppercase tracking-widest ml-2">Email Address</label>
            <input
              type="email"
              placeholder="scholar@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-100 uppercase tracking-widest ml-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-purple-900 py-4 rounded-2xl font-black shadow-lg shadow-purple-900/20 hover:bg-purple-50 transition-all active:scale-95 tracking-widest text-sm mt-4 uppercase"
          >
            {loading ? "AUTHENTICATING..." : "ENTER WORKSPACE"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <button 
            onClick={handleResetPassword}
            className="text-purple-100 text-[11px] font-bold uppercase tracking-widest hover:text-white transition opacity-70 hover:opacity-100"
          >
            Forgot Password?
          </button>

          <p className="text-purple-100/60 text-xs font-medium">
            New here?{" "}
            <Link to="/signup" className="text-white font-black hover:underline underline-offset-4">
              CREATE ACCOUNT
            </Link>
          </p>
          
          <Link to="/" className="text-[10px] text-white/30 hover:text-white font-bold tracking-widest uppercase transition mt-2">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;