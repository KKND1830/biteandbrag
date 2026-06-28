'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { getAvatarPath } from '../utils/avatar'
import Link from 'next/link'

interface EventBannerProps {
  currentUserId: string | null
}

export default function EventBanner({ currentUserId }: EventBannerProps) {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const eventName = 'ตกปลาสุดสัปดาห์สุดขิง'

  useEffect(() => {
    fetchRegistrations()
  }, [currentUserId])

  const fetchRegistrations = async () => {
    setLoading(true)
    const { data: regs, error } = await supabase
      .from('event_registrations')
      .select('user_id, created_at')
      .eq('event_name', eventName)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching registrations:', error.message)
      setLoading(false)
      return
    }

    if (regs && regs.length > 0) {
      const userIds = regs.map(r => r.user_id)
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds)

      const profMap = (profs || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {} as Record<string, any>)

      const list = regs.map(r => ({
        ...r,
        profile: profMap[r.user_id] || { display_name: 'นักตกปลา', username: null }
      }))

      setRegistrations(list)
      if (currentUserId) {
        setIsRegistered(list.some(item => item.user_id === currentUserId))
      }
    } else {
      setRegistrations([])
      setIsRegistered(false)
    }
    setLoading(false)
  }

  const handleToggleRegistration = async () => {
    if (!currentUserId) {
      alert('กรุณาเข้าสู่ระบบก่อนลงทะเบียนเข้าร่วมแข่งขันครับ! 🔑')
      return
    }

    setSubmitting(true)
    setMessage('')

    if (isRegistered) {
      const confirmCancel = window.confirm('คุณต้องการยกเลิกการลงทะเบียนเข้าร่วมใช่หรือไม่?')
      if (!confirmCancel) {
        setSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('user_id', currentUserId)
        .eq('event_name', eventName)

      if (error) {
        setMessage('❌ ยกเลิกไม่สำเร็จ: ' + error.message)
      } else {
        setMessage('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว')
        await fetchRegistrations()
      }
    } else {
      const { error } = await supabase
        .from('event_registrations')
        .insert([
          {
            user_id: currentUserId,
            event_name: eventName
          }
        ])

      if (error) {
        setMessage('❌ ลงทะเบียนไม่สำเร็จ: ' + error.message)
      } else {
        setMessage('✅ ลงทะเบียนเข้าร่วมแข่งขันสำเร็จแล้ว! ลุยกันเลย 🎣')
        await fetchRegistrations()
      }
    }

    setSubmitting(false)
    setTimeout(() => setMessage(''), 4000)
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/40 via-stone-900 to-yellow-950/40 border border-yellow-500/30 rounded-xl p-6 mb-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Glow highlight background effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Tag */}
      <div className="flex justify-between items-center mb-3">
        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
          <span>🏆</span> กิจกรรมพิเศษประจำสุดสัปดาห์ (Weekend Match)
        </span>
        <span className="text-[11px] text-stone-400 font-mono">
          ระยะเวลา 1 วันเต็ม
        </span>
      </div>

      {/* Event Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide mb-3 flex items-center gap-2">
        <span className="text-yellow-500">ตกปลาสุดสัปดาห์สุดขิง</span> 🎣
      </h2>

      {/* Event Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 bg-stone-950/40 p-4 rounded-lg border border-stone-800 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-lg bg-stone-800 p-2 rounded-lg text-yellow-500 border border-stone-750">🕒</span>
          <div>
            <span className="text-stone-400 block text-[10px]">เวลาแข่งขัน</span>
            <span className="font-bold text-stone-200 text-xs">13:00 น. - 24:00 น.</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-lg bg-stone-800 p-2 rounded-lg text-yellow-500 border border-stone-750">⚖️</span>
          <div>
            <span className="text-stone-400 block text-[10px]">กติกาการตัดสิน</span>
            <span className="font-bold text-stone-200 text-xs">น้ำหนักปลารวมทั้งหมดตลอดวัน</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-lg bg-stone-800 p-2 rounded-lg text-yellow-500 border border-stone-750">📍</span>
          <div>
            <span className="text-stone-400 block text-[10px]">สถานที่หมายแข่ง</span>
            <span className="font-bold text-stone-200 text-xs">หมายตกปลาเฉพาะกิจ / อ่างเก็บน้ำบางพระ</span>
          </div>
        </div>
      </div>

      {/* Participants & Headcount Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-stone-800/80 mt-4">
        {/* Participants Avatars */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 overflow-hidden py-1">
            {registrations.slice(0, 6).map((reg, idx) => (
              <img
                key={idx}
                src={getAvatarPath(reg.profile?.username)}
                alt={reg.profile?.display_name || 'participant'}
                title={reg.profile?.display_name || 'ผู้ลงทะเบียน'}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-stone-900 object-cover bg-stone-950 shadow-md"
              />
            ))}
            {registrations.length === 0 && (
              <span className="text-xs text-stone-500 italic">ยังไม่มีผู้ลงทะเบียน</span>
            )}
          </div>
          <span className="text-xs font-bold text-stone-300">
            👥 ผู้ลงทะเบียนแล้ว <span className="text-yellow-400 font-black text-sm">{registrations.length}</span> คน
          </span>
        </div>

        {/* Action Button */}
        <div className="w-full sm:w-auto flex flex-col items-end gap-1">
          {currentUserId ? (
            <button
              onClick={handleToggleRegistration}
              disabled={submitting}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-black text-xs transition-all duration-300 shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                isRegistered
                  ? 'bg-stone-800 hover:bg-red-950/80 text-stone-300 hover:text-red-400 border border-stone-700 hover:border-red-800'
                  : 'bg-yellow-600 hover:bg-yellow-500 text-stone-950 hover:scale-102 ring-2 ring-yellow-500/20'
              }`}
            >
              {submitting ? (
                <span>กำลังบันทึก...</span>
              ) : isRegistered ? (
                <>
                  <span>✅ คุณลงทะเบียนแล้ว</span>
                  <span className="text-[10px] opacity-75 font-normal">(กดเพื่อยกเลิก)</span>
                </>
              ) : (
                <>
                  <span>📝 ลงทะเบียนเข้าร่วมแข่งขัน</span>
                </>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-black text-xs bg-yellow-600 hover:bg-yellow-500 text-stone-950 transition-all shadow-lg text-center"
            >
              🔒 เข้าสู่ระบบเพื่อลงทะเบียน
            </Link>
          )}

          {message && (
            <span className="text-[11px] font-bold text-yellow-400 animate-pulse mt-1">
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
