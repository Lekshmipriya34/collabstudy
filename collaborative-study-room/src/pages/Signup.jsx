import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase"; 
import { useNavigate, Link } from "react-router-dom";
import welcomeImg from "../assets/welcome.png";

function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    age: "",
    gender: "",
    email: "",
    password: ""
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        username: formData.username,
        age: formData.age,
        gender: formData.gender,
        email: formData.email,
        createdAt: serverTimestamp(),
        uid: user.uid
      });

      navigate("/dashboard");

    } catch (err) {
      console.error("Signup Error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already registered.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Modern Glassmorphism Input Style
  const inputStyle = "w-full bg-white/10 border border-white/20 text-white placeholder-purple-200 px-5 py-3 rounded-2xl focus:outline-none focus:border-purple-300 focus:bg-white/20 transition-all font-medium text-sm backdrop-blur-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e879f9] via-[#7c3aed] to-[#4c1d95] flex items-center justify-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Decorative Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-900/40 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl z-10 transition-all">
        
        {/* HEADER */}
        <div className="flex flex-col items-center mb-6">
            <h1 className="text-white text-3xl font-black tracking-tighter mb-2 italic">
              JOIN <span className="text-purple-200 uppercase text-2xl">Clockedin</span>
            </h1>
            <img src={welcomeImg} alt="Welcome" className="w-24 opacity-90 drop-shadow-2xl" />
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-rose-500/20 border border-rose-500/50 text-rose-100 px-4 py-2 rounded-2xl text-center text-[11px] mb-4 font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-100 uppercase tracking-widest ml-2">Personal Details</label>
            <input name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} className={inputStyle} required />
          </div>

          <input name="username" placeholder="Username" value={formData.username} onChange={handleChange} className={inputStyle} required />

          <div className="flex gap-3">
            <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} className={`${inputStyle} w-1/3`} required />
            <select name="gender" value={formData.gender} onChange={handleChange} className={`${inputStyle} w-2/3 appearance-none`} required >
              <option value="" disabled className="bg-purple-900">Gender</option>
              <option value="Male" className="bg-purple-900">Male</option>
              <option value="Female" className="bg-purple-900">Female</option>
              <option value="Other" className="bg-purple-900">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-100 uppercase tracking-widest ml-2">Account Security</label>
            <input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className={inputStyle} required />
          </div>

          <input name="password" type="password" placeholder="Password (Min 6 chars)" value={formData.password} onChange={handleChange} className={inputStyle} required />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-purple-900 py-4 rounded-2xl font-black shadow-lg shadow-purple-900/20 hover:bg-purple-50 transition-all active:scale-95 tracking-widest text-sm mt-4 uppercase"
          >
            {loading ? "CREATING PROFILE..." : "START STUDYING"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-purple-100/60 text-xs font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-black hover:underline underline-offset-4 tracking-tight">
              LOG IN
            </Link>
          </p>
          <Link to="/" className="inline-block mt-4 text-[10px] text-white/30 hover:text-white font-bold tracking-widest uppercase transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;