'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // ฟังก์ชันสำหรับสมัครสมาชิก
  const handleSignUp = async () => {
    setLoading(true)
    setMessage('กำลังดำเนินการ...')
    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setMessage('❌ สมัครไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ สมัครสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันตัวตน')
    }
    setLoading(false)
  }

  // ฟังก์ชันสำหรับเข้าสู่ระบบ
  const handleLogin = async () => {
    setLoading(true)
    setMessage('กำลังเชื่อมต่อ...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setMessage('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ เข้าสู่ระบบสำเร็จ! พร้อมลุยครับ')
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-stone-200">
      <div className="w-full max-w-md p-8 bg-stone-800 rounded-lg shadow-xl border border-stone-700">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-stone-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <span>⬅️</span> กลับหน้าหลัก
          </Link>
          <span className="text-yellow-500 font-bold text-sm">Bite & Brag 🎣</span>
        </div>
        <h1 className="text-3xl font-bold text-yellow-500 mb-6 text-center">ลงทะเบียนนักตกปลา 🎣</h1>
        
        <input 
          type="email" 
          placeholder="อีเมลของคุณ" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 bg-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <input 
          type="password" 
          placeholder="รหัสผ่าน (6 ตัวอักษรขึ้นไป)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 bg-stone-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />

        <div className="flex gap-4">
          <button 
            onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors"
          >
            เข้าสู่ระบบ
          </button>
          <button 
            onClick={handleSignUp} disabled={loading}
            className="w-full py-3 bg-stone-600 hover:bg-stone-500 text-white font-bold rounded transition-colors"
          >
            สมัครสมาชิก
          </button>
        </div>

        {message && (
          <div className="mt-6 p-3 bg-stone-900 rounded border border-stone-700 text-center text-sm font-mono text-yellow-400">
            {message}
          </div>
        )}
      </div>
    </main>
  )
}
