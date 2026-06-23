'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('../../../components/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-[250px] bg-stone-950 flex items-center justify-center text-stone-400">กำลังโหลดแผนที่...</div>
})

export default function EditLog() {
  const params = useParams()
  const router = useRouter()
  const logId = params.id

  const [postType, setPostType] = useState<'catch' | 'spot'>('catch')
  const [fishName, setFishName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [location, setLocation] = useState('')
  const [lure, setLure] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
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
      const isSpot = data.fish_name?.startsWith('📍 แนะนำหมาย:');
      if (isSpot) {
        setPostType('spot')
        setFishName('')
      } else {
        setPostType('catch')
        setFishName(data.fish_name)
      }
      setWeight(data.weight?.toString() || '')
      setLength(data.length?.toString() || '')
      setLocation(data.location_name || '')
      setLure(data.lure_used || '')
      setLatitude(data.latitude?.toString() || '')
      setLongitude(data.longitude?.toString() || '')
    }
    setLoading(false)
  }

  // 2. บันทึกข้อมูลใหม่ทับของเดิม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('กำลังอัปเดตข้อมูล...')

    const finalFishName = postType === 'spot' 
      ? `📍 แนะนำหมาย: ${location.trim() || 'หมายตกปลา'}` 
      : fishName;
      
    const finalWeight = postType === 'spot' ? null : (weight ? parseFloat(weight) : null);
    const finalLength = postType === 'spot' ? null : (length ? parseFloat(length) : null);

    const { error } = await supabase
      .from('bite_logs')
      .update({ 
        fish_name: finalFishName, 
        weight: finalWeight, 
        length: finalLength, 
        location_name: location, 
        lure_used: lure,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
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
          <h1 className="text-2xl font-bold text-yellow-500">
            {postType === 'catch' ? 'แก้ไขผลงาน 📝' : 'แก้ไขหมายแนะนำ 🗺️'}
          </h1>
          <Link href="/" className="text-stone-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <span>⬅️</span> กลับหน้าหลัก
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm text-stone-400">ประเภทโพสต์ *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPostType('catch')}
                className={`py-3 px-4 rounded font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  postType === 'catch'
                    ? 'bg-yellow-600 text-stone-900 shadow-md ring-2 ring-yellow-500/25'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-650 hover:text-white'
                }`}
              >
                📸 บันทึกผลงาน
              </button>
              <button
                type="button"
                onClick={() => setPostType('spot')}
                className={`py-3 px-4 rounded font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  postType === 'spot'
                    ? 'bg-yellow-600 text-stone-900 shadow-md ring-2 ring-yellow-500/25'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-650 hover:text-white'
                }`}
              >
                🗺️ แนะนำหมายสวย
              </button>
            </div>
          </div>

          {postType === 'catch' && (
            <>
              <div>
                <label className="block mb-1 text-sm text-stone-400">ชนิดปลา *</label>
                <input type="text" required={postType === 'catch'} value={fishName} onChange={(e) => setFishName(e.target.value)}
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
              className="w-full p-3 bg-stone-700 rounded text-white focus:ring-2 focus:ring-yellow-500" placeholder={postType === 'catch' ? '' : 'เช่น ปลายาง, รำผสม, ขนมปัง'} />
          </div>

          <button type="submit" className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold rounded transition-colors">
            {postType === 'catch' ? 'บันทึกการแก้ไขผลงาน' : 'บันทึกการแก้ไขหมายแนะนำ'}
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
