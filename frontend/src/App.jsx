import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from './pages/Signup.jsx';
import Login from './pages/login.jsx'
import TutorDashboard from './pages/Tutor/TutorDashboard.jsx';
import ParentDashboard from './pages/parent/ParentDashboard.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx';

function HomeRedirect() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  console.log("Role", localStorage.getItem("role"));
  if (token) {
    if (role === "TUTOR") {
      return <Navigate to="/tutor/dashboard" replace />
    }
    else if (role === "PARENT") {
      return <Navigate to="/parent/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }
  else return <Navigate to="/login" replace />
}

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<HomeRedirect />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/login' element={<Login />} />
          <Route path='/tutor/dashboard' element={<TutorDashboard />} />
          <Route path='/parent/dashboard' element={<ParentDashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
