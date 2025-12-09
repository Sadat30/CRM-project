import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Nav from './components/Nav'
import Contacts from './pages/Contacts'
import Deals from './pages/Deals'
import Tasks from './pages/Tasks'
import Tickets from './pages/Tickets'
import Import from './pages/Import'
import PipelineSettings from './pages/PipelineSettings'
import KnowledgeBase from './pages/KnowledgeBase'
import Login from './pages/Login'
import Register from './pages/Register'
import TenantManagement from './pages/TenantManagement'
import AdminDashboard from './pages/AdminDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import CollapsibleChatWidget from './components/Chatbot/CollapsibleChatWidget'
import './index.css'

function App(){
  return (
    <BrowserRouter>
      <Nav/>
      <Routes>
        <Route path='/' element={<Welcome/>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/register' element={<Register/>} />
        <Route path='/tenants' element={<TenantManagement/>} />
        <Route path='/dashboard/admin' element={<AdminDashboard/>} />
        <Route path='/dashboard/customer' element={<CustomerDashboard/>} />
        <Route path='/contacts' element={<Contacts/>} />
        <Route path='/deals' element={<Deals/>} />
        <Route path='/tasks' element={<Tasks/>} />
        <Route path='/tickets' element={<Tickets/>} />
        <Route path='/import' element={<Import/>} />
        <Route path='/pipeline-settings' element={<PipelineSettings/>} />
        <Route path='/knowledge-base' element={<KnowledgeBase/>} />
        <Route path='/knowledge-base/:id' element={<KnowledgeBase/>} />
      </Routes>
      <CollapsibleChatWidget />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
