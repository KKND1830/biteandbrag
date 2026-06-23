'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const MapPicker = dynamic(() => import('../../components/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-[250px] bg-stone-950 flex items-center justify-center text-stone-400">กำลังโหลดแผนที่...</div>
})

export default function AddLog() {
  const router = useRouter()
  const [postType, setPostType] = useState<'catch' | 'spot'>('catch')
  const [fishName, setFishName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [location, setLocation] = useState('')
  const [lure, setLure] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่สนับสนุนการดึงข้อมูลตำแหน่ง GPS')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString())
        setLongitude(position.coords.longitude.toString())
        setMessage('📍 ดึงตำแหน่งพิกัดปัจจุบันสำเร็จ!')
        setTimeout(() => setMessage(''), 3000)
      },
      (error) => {
        let errorMsg = 'ไม่สามารถดึงตำแหน่งได้'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'ผู้ใช้ปฏิเสธการเข้าถึงสิทธิ์ตำแหน่งที่ตั้ง (Permission Denied)'
            break
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน (Position Unavailable)'
            break
          case error.TIMEOUT:
            errorMsg = 'การดึงข้อมูลตำแหน่งหมดเวลา (Timeout)'
            break
        }
        alert('❌ ดึงตำแหน่งไม่สำเร็จ: ' + errorMsg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('กำลังบันทึกข้อมูลและอัปโหลดรูปภาพ...')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❌ กรุณาเข้าสู่ระบบก่อนบันทึกผลงานครับ')
      setLoading(false)
      return
    }

    // 💡 ไปดึงชื่อโปรไฟล์ปัจจุบันจากตาราง profiles มาบันทึกพร้อมโพสต์
    const { data: profData } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      
    // ถ้าตั้งชื่อไว้ให้ใช้ชื่อนั้น ถ้ายังไม่ตั้งให้ใช้ Email ส่วนหน้า
    const authorName = profData?.display_name || (user.email ? user.email.split('@')[0] : 'นักตกปลา')

    let publicImageUrl = null

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

      const { data } = supabase.storage.from('bite-images').getPublicUrl(filePath)
      publicImageUrl = data.publicUrl
    }

    const finalFishName = postType === 'spot' 
      ? `📍 แนะนำหมาย: ${location.trim() || 'หมายตกปลา'}` 
      : fishName;
      
    const finalWeight = postType === 'spot' ? null : (weight ? parseFloat(weight) : null);
    const finalLength = postType === 'spot' ? null : (length ? parseFloat(length) : null);

    const { error } = await supabase.from('bite_logs').insert([
      { 
        user_id: user.id, 
        author_name: authorName,
        fish_name: finalFishName, 
        weight: finalWeight, 
        length: finalLength, 
        location_name: location, 
        lure_used: lure,
        image_url: publicImageUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }
    ])

    if (error) {
      setMessage('❌ บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('✅ บันทึกผลงานสำเร็จแล้ว! กำลังกลับหน้าหลัก...')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 bg-stone-900 text-stone-200">
      <div className="w-full max-w-lg p-8 bg-stone-800 rounded-lg shadow-xl border border-stone-700">
        <div className="flex justify-between items-center mb-8 border-b border-stone-750 pb-4">
          <h1 className="text-2xl font-bold text-yellow-500">
            {postType === 'catch' ? 'บันทึกผลงาน 📸' : 'แนะนำหมายสวย 🗺️'}
          </h1>
          <Link href="/" className="text-stone-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <span>⬅️</span> กลับหน้าหลัก
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-stone-400">ประเภทโพสต์ *</label>
            <select value={postType} onChange={(e) => setPostType(e.target.value as 'catch' | 'spot')}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500">
              <option value="catch">📸 บันทึกผลงานการตกปลา (Catch Log)</option>
              <option value="spot">🗺️ แนะนำหมายตกปลา / ปักหมุดหมายสวย (Spot Recommendation)</option>
            </select>
          </div>

          {postType === 'catch' && (
            <>
              <div>
                <label className="block mb-1 text-sm text-stone-400">ชนิดปลา *</label>
                <input type="text" required={postType === 'catch'} value={fishName} onChange={(e) => setFishName(e.target.value)}
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
            </>
          )}

          {postType === 'spot' && (
            <div>
              <label className="block mb-1 text-sm text-stone-400">ชื่อหมายตกปลา *</label>
              <input type="text" required={postType === 'spot'} value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder="เช่น อ่างเก็บน้ำบางพระ, หลังวัดเชิงเลน" />
            </div>
          )}

          <div className="p-4 bg-stone-900/30 rounded border border-stone-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-yellow-500">📍 พิกัดหมายตกปลา (บนแผนที่)</span>
              <button type="button" onClick={handleGetCurrentLocation}
                className="px-3 py-1 bg-stone-600 hover:bg-stone-500 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1">
                <span>📍</span> ดึงพิกัดปัจจุบัน
              </button>
            </div>

            <MapPicker 
              lat={latitude ? parseFloat(latitude) : null}
              lng={longitude ? parseFloat(longitude) : null}
              onChange={(newLat, newLng) => {
                setLatitude(newLat.toString())
                setLongitude(newLng.toString())
              }}
            />

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block mb-1 text-xs text-stone-400">ละติจูด (Latitude)</label>
                <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
                  className="w-full p-2.5 bg-stone-700 rounded text-white text-sm focus:ring-2 focus:ring-yellow-500" placeholder="เช่น 13.7563" />
              </div>
              <div className="w-1/2">
                <label className="block mb-1 text-xs text-stone-400">ลองจิจูด (Longitude)</label>
                <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
                  className="w-full p-2.5 bg-stone-700 rounded text-white text-sm focus:ring-2 focus:ring-yellow-500" placeholder="เช่น 100.5018" />
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">
              {postType === 'catch' ? 'เหยื่อที่ใช้' : 'เหยื่อแนะนำ (ถ้ามี)'}
            </label>
            <input type="text" value={lure} onChange={(e) => setLure(e.target.value)}
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder={postType === 'catch' ? 'เช่น กบยาง, สปินเนอร์' : 'เช่น ปลายาง, รำผสม, ขนมปัง'} />
          </div>

          <div>
            <label className="block mb-1 text-sm text-stone-400">
              {postType === 'catch' ? 'รูปภาพผลงาน' : 'รูปภาพหมายตกปลา'}
            </label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full p-2 bg-stone-700 rounded text-stone-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-stone-900 hover:file:bg-yellow-500" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors disabled:bg-stone-600">
            {loading ? 'กำลังบันทึก...' : (postType === 'catch' ? 'ส่งบันทึกผลงาน' : 'ปักหมุดแนะนำหมาย')}
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
