import { useState } from 'react'
import {Route,Routes} from 'react-router-dom'
import './App.css'
import Lobby from './components/Lobby'
import Home from './components/Home'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/" element={<Lobby/>} />
      <Route path="/home/:roomId" element={<Home/>} />
    </Routes>
  )
}

export default App
