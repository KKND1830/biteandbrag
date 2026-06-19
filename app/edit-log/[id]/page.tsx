'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditLog() {
  const params = useParams()
  const router = useRouter()
  const logId = params.id

  const [fishName, setFishName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [location, setLocation] = useState('')
  const [lure, setLure] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // 1. ดึงข้อมูลเดิมมาแสดง
  useEffect(() => {
    fetchLog()
  }, [])

  const fetchLog = async () => {
    const { data, error } = await supabase
      .from('bite_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (data) {
      setFishName(data.fish_name)
      setWeight(data.weight?.toString() || '')
      setLength(data.length?.toString() || '')
      setLocation(data.location_name || '')
      setLure(data.lure_used || '')
    }
    setLoading(false)
  }

  // 2. บันทึกข้อมูลใหม่ทับของเดิม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('กำลังอัปเดตข้อมูล...')

    const { error } = await supabase
      .from('bite_logs')
      .update({ 
        fish_name: fishName, 
        weight: weight ? parseFloat(weight) : null, 
        length: length ? parseFloat(length) : null, 
        location_name: location, 
        lure_used: lure 
      })
      .eq('id', logId)

    if (error) {
      setMessage('❌ อัปเดตไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ แก้ไขข้อมูลสำเร็จแล้ว! กำลังกลับหน้าหลัก...')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
  }

  if (loading) return <p className="text-center text-stone-400 mt-20 animate-pulse">กำลังโหลดข้อมูล...</p>

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 bg-stone-900 text-stone-200">
      <div className="w-full max-w-lg p-8 bg-stone-800 rounded-lg shadow-xl border border-stone-700">
        <div className="flex justify-between items-center mb-8 border-b border-stone-750 pb-4">
          <h1 className="text-2xl font-bold text-yellow-500">แก้ไขผลงาน 📝</h1>
          <Link href="/" className="text-stone-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <span>⬅️</span> กลับหน้าหลัก
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-stone-400">ชนิดปลา *</label>
            <input type="text" required value={fishName} onChange={(e) => setFishName(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" />
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block mb-1 text-sm text-stone-400">น้ำหนัก (กก.)</label>
              <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div className="w-1/2">
              <label className="block mb-1 text-sm text-stone-400">ความยาว (ซม.)</label>
              <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)}
                className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">หมายตกปลา</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" />
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">เหยื่อที่ใช้</label>
            <input type="text" value={lure} onChange={(e) => setLure(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" />
          </div>

          <button type="submit" className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors">
            บันทึกการแก้ไข
          </button>
        </form>

        {message && (
          <div className="mt-6 p-3 bg-stone-900 rounded border border-stone-700 text-center text-sm font-mono text-yellow-400">
            {message}
          </div>
        )}
      </div>
    </main>
  )
}
