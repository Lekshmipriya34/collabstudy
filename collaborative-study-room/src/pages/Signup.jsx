import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // 1. Import Firestore functions
import { auth, db } from "../firebase"; // 2. Import db
import { useNavigate, Link } from "react-router-dom";
import welcomeImg from "../assets/welcome.png"; // Reusing your illustration

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

    // Basic Validation
    if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
    }

    try {
      // 1. Create the Authentication User
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // 2. Save the Extra Data to Firestore "users" collection
      // We use the user.uid as the document ID so it matches the Auth ID
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        username: formData.username,
        age: formData.age,
        gender: formData.gender,
        email: formData.email,
        createdAt: serverTimestamp(),
        uid: user.uid
      });

      // 3. Redirect (The AuthContext will likely handle this, but we force it here too)
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

  // Reusable Input Style Class
  const inputStyle = "w-full bg-[#1a1a1a] border-2 border-[#f0abfc] text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e879f9] to-[#4c1d95] flex flex-col items-center justify-center px-4 py-6 font-mono">
      
      {/* 1. Header Title */}
      <h1 className="text-white text-4xl font-bold tracking-widest mb-4 drop-shadow-md">
        CLOCKEDIN
      </h1>

      {/* 2. Illustration */}
      <div className="mb-6">
        <img 
          src={welcomeImg} 
          alt="Group Illustration" 
          className="w-64 mix-blend-screen opacity-90 grayscale contrast-125 brightness-150" 
        />
      </div>

      {/* 3. The Form */}
      <form onSubmit={handleSignup} className="w-full max-w-sm flex flex-col gap-3">
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white px-3 py-2 rounded text-center text-xs mb-2">
            {error}
          </div>
        )}

        {/* Full Name */}
        <input
          name="fullName"
          placeholder="Full name"
          value={formData.fullName}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Username */}
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Age & Gender Row */}
        <div className="flex gap-3">
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={formData.age}
            onChange={handleChange}
            className={`${inputStyle} w-1/2 text-center`}
            required
          />
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className={`${inputStyle} w-1/2 text-center appearance-none`}
            required
          >
            <option value="" disabled className="text-gray-500">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Email/Phone */}
        <input
          name="email"
          type="email"
          placeholder="Email-address/phone number"
          value={formData.email}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Password */}
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className={inputStyle}
          required
        />

        {/* Register Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-[#e8bdf0] text-black text-xl font-bold py-3 rounded-full shadow-lg hover:bg-[#d8a4e2] transition-transform transform active:scale-95 tracking-wide"
        >
          {loading ? "LOADING..." : "REGISTER!"}
        </button>

      </form>

      {/* Footer Link */}
      <Link to="/" className="mt-6 text-white text-lg underline hover:text-gray-200">
        Go back!
      </Link>

    </div>
  );
}

export default Signup;