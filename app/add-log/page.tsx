'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'

export default function AddLog() {
  const [fishName, setFishName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [location, setLocation] = useState('')
  const [lure, setLure] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('กำลังบันทึกข้อมูลและอัปโหลดรูปภาพ...')

    // 1. เช็คผู้ใช้งาน
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❌ กรุณาเข้าสู่ระบบก่อนบันทึกผลงานครับ')
      setLoading(false)
      return
    }

    let publicImageUrl = null

    // 2. ถ้ามีการเลือกรูปภาพ ให้ทำการอัปโหลดก่อน
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('bite-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        setMessage('❌ อัปโหลดรูปภาพไม่สำเร็จ: ' + uploadError.message)
        setLoading(false)
        return
      }

      // ดึงลิงก์รูปภาพที่เป็นสาธารณะ
      const { data } = supabase.storage.from('bite-images').getPublicUrl(filePath)
      publicImageUrl = data.publicUrl
    }

    // 3. ส่งข้อมูลทั้งหมดเข้าตาราง bite_logs
    const { error } = await supabase.from('bite_logs').insert([
      { 
        user_id: user.id, 
        fish_name: fishName, 
        weight: weight ? parseFloat(weight) : null, 
        length: length ? parseFloat(length) : null, 
        location_name: location, 
        lure_used: lure,
        image_url: publicImageUrl
      }
    ])

    if (error) {
      setMessage('❌ บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ บันทึกผลงานพร้อมรูปภาพสำเร็จแล้ว! หมานๆ ครับ')
      setFishName(''); setWeight(''); setLength(''); setLocation(''); setLure(''); setImageFile(null);
    }
    setLoading(false)
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
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="เช่น กบยาง, ปลายาง" />
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">รูปภาพผลงาน</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full p-2 bg-stone-700 rounded text-stone-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-stone-900 hover:file:bg-yellow-500" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors disabled:bg-stone-600">
            {loading ? 'กำลังบันทึก...' : 'ส่งบันทึกผลงาน'}
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
