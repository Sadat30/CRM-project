import React from 'react'
import { useNavigate } from 'react-router-dom'
export default function Welcome(){
  const nav = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 bg-white rounded shadow w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to SimpleCRM</h1>
        <div className="space-x-3">
          <button onClick={()=>nav('/login')} className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
          <button onClick={()=>nav('/register')} className="px-4 py-2 border rounded">Register</button>
        </div>
      </div>
    </div>
  )
}
