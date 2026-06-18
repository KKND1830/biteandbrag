'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Home() {
  const [status, setStatus] = useState('กำลังเชื่อมต่อฐานข้อมูล...')

  useEffect(() => {
    async function testConnection() {
      // ลองดึงข้อมูลจากตาราง profiles
      const { data, error } = await supabase.from('profiles').select('*')

      if (error) {
        setStatus('❌ เชื่อมต่อล้มเหลว: ' + error.message)
      } else {
        setStatus('✅ เชื่อมต่อฐานข้อมูล Supabase สำเร็จ 100%!')
      }
    }
    testConnection()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-yellow-500">
      <h1 className="text-5xl font-bold mb-4">Bite & Brag 🎣</h1>
      <p className="text-xl">บันทึกของนักล่าแห่งสายน้ำ</p>

      {/* กล่องแสดงสถานะการเชื่อมต่อ */}
      <div className="mt-8 p-4 bg-stone-800 rounded-lg border border-stone-700">
        <p className="text-md text-stone-300 font-mono">{status}</p>
      </div>
    </main>
  );
}
