'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMessenger = /FBAN\/Messenger|FBAV\/Messenger|FB_IAB\/MESSENGER/i.test(ua)
      const isFacebook = /FBAN\/FBIOS|FBAV\//i.test(ua)
      const isLine = /Line/i.test(ua)
      if (isMessenger || isFacebook || isLine) {
        setIsInAppBrowser(true)
      }
    }
  }, [])

  // ฟังก์ชันสำหรับสมัครสมาชิก
  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage('❌ กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน')
      return
    }
    if (password.length < 6) {
      setMessage('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }
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
    if (!email.trim() || !password.trim()) {
      setMessage('❌ กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน')
      return
    }
    setLoading(true)
    setMessage('กำลังเชื่อมต่อ...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setMessage('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ เข้าสู่ระบบสำเร็จ! กำลังกลับหน้าหลัก...')
      setTimeout(() => {
        router.push('/')
      }, 1200)
    }
    setLoading(false)
  }

  // ฟังก์ชันล็อกอินด้วย Google
  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('กำลังเชื่อมต่อกับ Google...')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    })
    if (error) {
      setMessage('❌ เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + error.message)
      setLoading(false)
    }
  }

  // ฟังก์ชันล็อกอินด้วย Facebook
  const handleFacebookLogin = async () => {
    if (isInAppBrowser) {
      const confirmLogin = window.confirm(
        '⚠️ คุณกำลังใช้งานผ่านแอปพลิเคชัน (In-App Browser) ซึ่ง Facebook อาจบล็อกการล็อกอินนี้\n\nต้องการดำเนินการต่อหรือไม่? (หากเกิดข้อผิดพลาด แนะนำให้กดปุ่ม ⋯ ที่มุมขวาบนเพื่อเปิดหน้านี้ในเบราว์เซอร์ Safari หรือ Chrome ครับ)'
      )
      if (!confirmLogin) return
    }
    setLoading(true)
    setMessage('กำลังเชื่อมต่อกับ Facebook...')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    })
    if (error) {
      setMessage('❌ เข้าสู่ระบบด้วย Facebook ไม่สำเร็จ: ' + error.message)
      setLoading(false)
    }
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

        {isInAppBrowser && (
          <div className="mb-6 p-4 bg-yellow-950/80 border border-yellow-800/60 rounded-lg text-yellow-200 text-sm">
            <div className="flex gap-2 font-bold mb-1 items-center text-yellow-400">
              <span>⚠️</span> แนะนำ: เปิดในเบราว์เซอร์หลัก
            </div>
            <p className="text-xs text-yellow-300/80 leading-relaxed">
              ขณะนี้คุณกำลังเปิดเว็บผ่านแอพ (เช่น Messenger / Facebook / Line) การเชื่อมต่อกับ Google อาจทำงานไม่สมบูรณ์
            </p>
            <p className="text-xs mt-2 font-semibold text-yellow-400">
              👉 วิธีแก้: กดปุ่ม <span className="bg-stone-900 px-1 py-0.5 rounded border border-stone-700 font-mono text-xs">⋮</span> หรือ <span className="bg-stone-900 px-1 py-0.5 rounded border border-stone-700 font-mono text-xs">⋯</span> ที่มุมขวาบน แล้วเลือก <strong className="underline text-yellow-300">"เปิดในเบราว์เซอร์" (Open in Browser)</strong> เพื่อการล็อกอินที่เสถียรครับ
            </p>
          </div>
        )}
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

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-stone-750"></div>
          <span className="flex-shrink mx-4 text-stone-500 text-xs">หรือเข้าสู่ระบบด้วย</span>
          <div className="flex-grow border-t border-stone-750"></div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleGoogleLogin} disabled={loading}
            className="w-full py-3 bg-white hover:bg-stone-100 text-stone-900 font-semibold rounded transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>
          {/* ปิดใช้งานล็อกอินด้วย Facebook ชั่วคราว
          <button 
            onClick={handleFacebookLogin} disabled={loading}
            className="w-full py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold rounded transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            เข้าสู่ระบบด้วย Facebook
          </button>
          */}
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
