import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from './pages/signup.jsx';
import Login from './pages/login.jsx'
import TutorDashboard from './pages/Tutor/TutorDashboard.jsx';
import ParentDashboard from './pages/parent/ParentDashboard.jsx'

function App() {

  return (
    <BrowserRouter>
      <Routes>
          <Route path='/signup' element={<Signup/>}/>
          <Route path='/login' element={<Login/>}/>
          <Route path='/tutor/dashboard' element={<TutorDashboard/>}/>
          <Route path='/parent/dashboard' element={<ParentDashboard/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
