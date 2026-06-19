'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Link from 'next/link'

export default function Home() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  
  // State สำหรับระบบโปรไฟล์
  const [myDisplayName, setMyDisplayName] = useState('')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  useEffect(() => {
    initHome()
  }, [])

  const initHome = async () => {
    setLoading(true)
    
    // 1. เช็คข้อมูลผู้ใช้งานที่กำลังออนไลน์
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      setCurrentUserEmail(user.email)
      
      // ดึงชื่อโปรไฟล์ที่ตั้งไว้จากตาราง profiles
      const { data: profData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      
      if (profData?.display_name) {
        setMyDisplayName(profData.display_name)
        setNewProfileName(profData.display_name)
      } else {
        // ถ้ายังไม่ได้ตั้งชื่อ ให้ดึงส่วนแรกของ email เป็นค่าเริ่มต้นก่อน
        const defaultName = user.email ? user.email.split('@')[0] : 'นักตกปลา'
        setMyDisplayName(defaultName)
        setNewProfileName(defaultName)
      }
    }

    // 2. ดึงข้อมูลผลงาน โดยดึงชื่อโปรไฟล์ของคนโพสต์มาเชื่อมโยงกันด้วย (Relational Join)
    const { data, error } = await supabase
      .from('bite_logs')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
    
    if (data) setLogs(data)
    setLoading(false)
  }

  // ฟังก์ชันอัปเดตชื่อโปรไฟล์ตัวเอง
  const handleUpdateProfile = async () => {
    if (!newProfileName.trim()) return
    
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newProfileName })
      .eq('id', currentUserId)

    if (error) {
      alert('❌ อัปเดตชื่อไม่สำเร็จ: ' + error.message)
    } else {
      setMyDisplayName(newProfileName)
      setIsEditingProfile(false)
      // โหลดข้อมูลหน้าจอใหม่เพื่ออัปเดตชื่อบนการ์ดทั้งหมด
      initHome()
    }
  }

  // ฟังก์ชันสำหรับลบผลงาน
  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('ต้องการลบผลงานนี้ใช่หรือไม่? 🗑️')
    if (!confirmDelete) return

    const { error } = await supabase.from('bite_logs').delete().eq('id', id)
    if (error) alert('❌ ลบไม่สำเร็จ: ' + error.message)
    else setLogs(logs.filter((log) => log.id !== id))
  }

  const displayedLogs = viewMode === 'all' 
    ? logs 
    : logs.filter((log) => log.user_id === currentUserId)

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 bg-stone-900 text-stone-200">
      <div className="w-full max-w-2xl">
        
        {/* 👤 ส่วนหัวเว็บ + ระบบจัดการโปรไฟล์ผู้ใช้งานออนไลน์ */}
        <div className="flex justify-between items-start mb-6 border-b border-stone-800 pb-6">
          <div>
            <h1 className="text-4xl font-bold text-yellow-500 mb-3">Bite & Brag 🎣</h1>
            {currentUserEmail && (
              <div className="bg-stone-800 border border-stone-700 rounded-lg p-3 shadow-sm">
                {isEditingProfile ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={newProfileName} 
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="p-1.5 bg-stone-700 rounded text-white text-xs border border-yellow-500 focus:outline-none"
                    />
                    <button onClick={handleUpdateProfile} className="bg-green-600 text-white text-xs px-2 py-1.5 rounded font-bold hover:bg-green-500">บันทึก</button>
                    <button onClick={() => setIsEditingProfile(false)} className="bg-stone-600 text-stone-200 text-xs px-2 py-1.5 rounded hover:bg-stone-500">ยกเลิก</button>
                  </div>
                ) : (
                  <div className="text-xs space-y-1">
                    <p className="text-stone-400">🟢 บัญชีออนไลน์ในโปรไฟล์นี้:</p>
                    <p className="text-sm font-bold text-white">
                      👑 นามแฝง: <span className="text-yellow-400">{myDisplayName}</span>
                    </p>
                    <p className="text-stone-500 text-[11px]">({currentUserEmail})</p>
                    <button 
                      onClick={() => setIsEditingProfile(true)} 
                      className="text-yellow-500 hover:underline text-[11px] font-semibold mt-1 block"
                    >
                      ✏️ แก้ไขชื่อนามแฝงโปรไฟล์ของคุณ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <Link href="/add-log" className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold py-2 px-4 rounded transition-colors shadow-lg">
            + เพิ่มผลงาน
          </Link>
        </div>

        {/* ปุ่มสลับแท็บแสดงผล */}
        <div className="flex gap-2 mb-8 bg-stone-800 p-1 rounded-lg border border-stone-700 shadow-md">
          <button onClick={() => setViewMode('all')} className={`flex-1 py-2.5 text-sm font-bold rounded transition-colors ${viewMode === 'all' ? 'bg-yellow-600 text-stone-900 shadow' : 'text-stone-400 hover:text-stone-200'}`}>
            🌍 ผลงานรวมในเว็บ ({logs.length})
          </button>
          <button onClick={() => setViewMode('mine')} className={`flex-1 py-2.5 text-sm font-bold rounded transition-colors ${viewMode === 'mine' ? 'bg-yellow-600 text-stone-900 shadow' : 'text-stone-400 hover:text-stone-200'}`}>
            👤 ผลงานของฉัน ({logs.filter(l => l.user_id === currentUserId).length})
          </button>
        </div>

        {loading ? (
          <p className="text-center text-stone-400 animate-pulse">กำลังดึงข้อมูลจากสายน้ำ...</p>
        ) : displayedLogs.length === 0 ? (
          <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 shadow-xl">
            <p className="text-stone-400 mb-4">{viewMode === 'all' ? 'สมุดบันทึกยังว่างเปล่า' : 'คุณยังไม่มีบันทึกผลงานของตัวเองเลยครับ'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedLogs.map((log) => (
              <div key={log.id} className="overflow-hidden bg-stone-800 rounded-lg shadow-xl border border-stone-700 hover:border-yellow-600 transition-colors">
                
                {log.image_url && (
                  <div className="w-full h-64 bg-stone-950 overflow-hidden relative border-b border-stone-700">
                    <img src={log.image_url} alt={log.fish_name} className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4 border-b border-stone-700 pb-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{log.fish_name}</h2>
                      {/* 👤 โชว์ชื่อเจ้าของโพสต์ที่ดึงแบบ Dynamic จากตารางโปรไฟล์ */}
                      <p className="text-sm font-medium text-yellow-500">
                        👤 ผู้โพสต์: <span className="font-bold text-white bg-stone-700/50 px-2 py-0.5 rounded text-xs">{log.profiles?.display_name || log.author_name || 'นักตกปลาลึกลับ'}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm text-stone-400">{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                      {log.user_id === currentUserId && (
                        <div className="flex gap-3">
                          <Link href={`/edit-log/${log.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">แก้ไข</Link>
                          <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors">ลบ</button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-stone-300">
                    <p><span className="text-stone-500 text-sm block">น้ำหนัก</span> {log.weight ? `${log.weight} กก.` : '-'}</p>
                    <p><span className="text-stone-500 text-sm block">ความยาว</span> {log.length ? `${log.length} ซม.` : '-'}</p>
                    <p><span className="text-stone-500 text-sm block">หมายตกปลา</span> {log.location_name || 'ไม่ระบุ'}</p>
                    <p><span className="text-stone-500 text-sm block">เหยื่อที่ใช้</span> {log.lure_used || 'ไม่ระบุ'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
