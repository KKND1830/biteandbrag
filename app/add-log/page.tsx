'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'

export default function AddLog() {
  const [fishName, setFishName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [location, setLocation] = useState('')
  const [lure, setLure] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('กำลังบันทึกข้อมูล...')

    // เช็คว่าใครกำลังล็อกอินอยู่
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('❌ กรุณาเข้าสู่ระบบก่อนบันทึกผลงานครับ')
      return
    }

    // ส่งข้อมูลเข้าตาราง bite_logs
    const { error } = await supabase.from('bite_logs').insert([
      { 
        user_id: user.id, 
        fish_name: fishName, 
        weight: parseFloat(weight), 
        length: parseFloat(length), 
        location_name: location, 
        lure_used: lure 
      }
    ])

    if (error) {
      setMessage('❌ บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ บันทึกผลงานลงสมุดสำเร็จแล้ว! หมานๆ ครับ')
      // ล้างค่าฟอร์มหลังบันทึกเสร็จ
      setFishName(''); setWeight(''); setLength(''); setLocation(''); setLure('');
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 bg-stone-900 text-stone-200">
      <div className="w-full max-w-lg p-8 bg-stone-800 rounded-lg shadow-xl border border-stone-700">
        <h1 className="text-3xl font-bold text-yellow-500 mb-8 text-center">บันทึกผลงานตกปลา 📸</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-stone-400">ชนิดปลา *</label>
            <input type="text" required value={fishName} onChange={(e) => setFishName(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="เช่น ชะโด, กะพง" />
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block mb-1 text-sm text-stone-400">น้ำหนัก (กก.)</label>
              <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="0.00" />
            </div>
            <div className="w-1/2">
              <label className="block mb-1 text-sm text-stone-400">ความยาว (ซม.)</label>
              <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)}
                className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="0.0" />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">หมายตกปลา</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="เช่น แม่น้ำชี" />
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">เหยื่อที่ใช้</label>
            <input type="text" value={lure} onChange={(e) => setLure(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="เช่น กบยางพญาคันคาก, ปลายาง" />
          </div>

          <button type="submit" className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors">
            ส่งบันทึกผลงาน
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
