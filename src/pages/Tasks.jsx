import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
export default function Tasks(){
  const [tasks,setTasks]=useState([]);
  useEffect(()=>{ (async()=>{
    const res = await axios.get(`${API_BASE}/tasks`, {headers:{authorization:'Bearer '+localStorage.getItem('token')}});
    setTasks(res.data);
  })() },[]);
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Tasks & Calendar (placeholder)</h2>
      <ul className="space-y-2">
        {tasks.map(t=> <li key={t.id} className="p-3 bg-white rounded shadow">{t.title} — {t.type} — Due: {t.due_date}</li>)}
      </ul>
    </div>
  )
}
