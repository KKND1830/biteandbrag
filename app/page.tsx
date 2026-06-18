'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Link from 'next/link'

export default function Home() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('bite_logs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setLogs(data)
    setLoading(false)
  }

  // ฟังก์ชันสำหรับลบผลงาน
  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('ต้องการลบผลงานนี้ใช่หรือไม่? 🗑️')
    if (!confirmDelete) return

    const { error } = await supabase
      .from('bite_logs')
      .delete()
      .eq('id', id)

    if (error) {
      alert('❌ ลบไม่สำเร็จ: ' + error.message)
    } else {
      // ถ้าลบในฐานข้อมูลสำเร็จ ให้เอาออกจากการแสดงผลหน้าเว็บด้วย
      setLogs(logs.filter((log) => log.id !== id))
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 bg-stone-900 text-stone-200">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-500">Bite & Brag 🎣</h1>
          <Link href="/add-log" className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold py-2 px-4 rounded transition-colors">
            + เพิ่มผลงาน
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-stone-400 animate-pulse">กำลังดึงข้อมูลจากสายน้ำ...</p>
        ) : logs.length === 0 ? (
          <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 shadow-xl">
            <p className="text-stone-400 mb-4">สมุดบันทึกยังว่างเปล่า</p>
            <Link href="/add-log" className="text-yellow-500 hover:underline">ไปบันทึกผลงานตัวแรกกันเลย!</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="overflow-hidden bg-stone-800 rounded-lg shadow-xl border border-stone-700 hover:border-yellow-600 transition-colors">
                
                {log.image_url && (
                  <div className="w-full h-64 bg-stone-950 overflow-hidden relative border-b border-stone-700">
                    <img 
                      src={log.image_url} 
                      alt={log.fish_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4 border-b border-stone-700 pb-2">
                    <h2 className="text-2xl font-bold text-white">{log.fish_name}</h2>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-stone-400">{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                      {/* ปุ่มลบ */}
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors"
                      >
                        ลบ
                      </button>
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
