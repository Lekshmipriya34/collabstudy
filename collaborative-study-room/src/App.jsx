import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import UpdatePrompt from "./components/UpdatePrompt"; // <-- The PWA prompt

// Lazy load the pages so the app loads lightning fast
const Welcome = lazy(() => import("./pages/Welcome"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  return (
    <BrowserRouter>
      {/* 1. Drop the PWA prompt inside the Router but outside the Routes */}
      <UpdatePrompt /> 
      
      {/* 2. Suspense wraps the lazy-loaded pages with a fallback loading screen */}
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0d0618] text-white">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;