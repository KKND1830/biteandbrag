'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getUserLevelInfo } from '../../../utils/level'
import ShareCardModal from '../../../components/ShareCardModal'
import { AVATARS, getAvatarPath } from '../../../utils/avatar'
import { parseImageUrls } from '../../../utils/image'
import ImageCarousel from '../../../components/ImageCarousel'
import InboxModal from '../../../components/InboxModal'

const CardMap = dynamic(() => import('../../../components/CardMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-950 flex items-center justify-center text-stone-500 text-xs">กำลังโหลดแผนที่...</div>
})

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'catches' | 'spots'>('catches')
  
  // Profile editing
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [inviteSentMessage, setInviteSentMessage] = useState('')

  // Feed interactions
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [sharingLog, setSharingLog] = useState<any | null>(null)
  const [sharingLogCatchCount, setSharingLogCatchCount] = useState<number>(0)

  // Inbox / Notification States
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [inboxInitialTab, setInboxInitialTab] = useState<'notifications' | 'chat'>('notifications')
  const [inboxTargetUserId, setInboxTargetUserId] = useState<string | null>(null)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  useEffect(() => {
    initProfile()
  }, [profileId])

  const initProfile = async () => {
    setLoading(true)
    // Check current logged in user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
    await fetchProfileData()
    await fetchUnreadCounts()
    setLoading(false)
  }

  const fetchUnreadCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. ดึงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    const { count: notifCount, error: notifErr } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!notifErr) {
      setUnreadNotifCount(notifCount || 0)
    }

    // 2. ดึงจำนวนข้อความแชตที่ยังไม่ได้อ่าน
    const { count: msgCount, error: msgErr } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    if (!msgErr) {
      setUnreadMsgCount(msgCount || 0)
    }
  }

  const fetchProfileData = async () => {
    // 1. Fetch profile details
    const { data: profData, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (profError) {
      console.error('Error fetching profile:', profError.message)
      setProfile(null)
      return
    }

    setProfile(profData)
    setNewName(profData.display_name || '')

    // 2. Fetch logs by this user
    const { data: logsData } = await supabase
      .from('bite_logs')
      .select('*, profiles(display_name, rank, total_points), likes(user_id)')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })

    if (logsData) {
      // 3. Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles(display_name, username)')
        .order('created_at', { ascending: true })

      const comments = commentsData || []
      const logsWithComments = logsData.map(log => ({
        ...log,
        comments: comments.filter((c: any) => c.log_id === log.id) || []
      }))
      setLogs(logsWithComments)
    }
  }

  const handleUpdateName = async () => {
    if (!newName.trim() || !currentUserId) return
    setUpdateMessage('กำลังบันทึก...')

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newName.trim() })
      .eq('id', currentUserId)

    if (error) {
      setUpdateMessage('❌ เกิดข้อผิดพลาด: ' + error.message)
    } else {
      setUpdateMessage('✅ เปลี่ยนชื่อสำเร็จ!')
      setProfile((prev: any) => ({ ...prev, display_name: newName.trim() }))
      setIsEditingName(false)
      await fetchProfileData()
      setTimeout(() => setUpdateMessage(''), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('ต้องการลบโพสต์นี้ใช่หรือไม่? 🗑️')
    if (!confirmDelete) return
    const { error } = await supabase.from('bite_logs').delete().eq('id', id)
    if (!error) {
      setLogs(logs.filter((log) => log.id !== id))
    }
  }

  const handleToggleLike = async (logId: string, hasLiked: boolean) => {
    if (!currentUserId) {
      alert('กรุณาเข้าสู่ระบบก่อนกดหมานๆ ครับ!')
      return
    }
    if (hasLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('log_id', logId)
    } else {
      await supabase.from('likes').insert([{ user_id: currentUserId, log_id: logId }])

      // สร้างข้อความแจ้งเตือน (Notification) ไปยังเจ้าของโพสต์
      const targetLog = logs.find(l => l.id === logId)
      if (targetLog && targetLog.user_id && targetLog.user_id !== currentUserId) {
        await supabase.from('notifications').insert([
          {
            user_id: targetLog.user_id,
            sender_id: currentUserId,
            type: 'like',
            log_id: logId
          }
        ])
      }
    }
    await fetchProfileData()
    await fetchUnreadCounts()
  }

  const handleSendTournamentInvite = async () => {
    if (!currentUserId || !profileId) return

    const { error } = await supabase.from('notifications').insert([
      {
        user_id: profileId,
        sender_id: currentUserId,
        type: 'tournament_invite',
        content: 'ชวนเข้าร่วมกิจกรรมแข่งขันตกปลา'
      }
    ])

    if (error) {
      alert('ไม่สามารถส่งคำชวนได้: ' + error.message)
    } else {
      setInviteSentMessage('✅ ส่งคำชวนเข้าร่วมการแข่งขันสำเร็จแล้ว!')
      setTimeout(() => {
        setInviteSentMessage('')
      }, 3000)
    }
  }

  const handleAddComment = async (logId: string) => {
    const content = commentInputs[logId] || ''
    if (!content.trim()) return

    if (!currentUserId) {
      alert('กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็นครับ!')
      return
    }

    const { data: insertedComment, error } = await supabase.from('comments').insert([
      {
        log_id: logId,
        user_id: currentUserId,
        content: content.trim()
      }
    ]).select()

    if (error) {
      alert('ไม่สามารถเพิ่มความคิดเห็นได้: ' + error.message)
    } else {
      setCommentInputs(prev => ({ ...prev, [logId]: '' }))
      await fetchProfileData()

      // สร้างข้อความแจ้งเตือน (Notification) ไปยังเจ้าของโพสต์
      const targetLog = logs.find(l => l.id === logId)
      if (targetLog && targetLog.user_id && targetLog.user_id !== currentUserId) {
        await supabase.from('notifications').insert([
          {
            user_id: targetLog.user_id,
            sender_id: currentUserId,
            type: 'comment',
            log_id: logId,
            comment_id: insertedComment?.[0]?.id,
            content: content.trim()
          }
        ])
      }
      await fetchUnreadCounts()
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = window.confirm('ต้องการลบความคิดเห็นนี้ใช่หรือไม่? 🗑️')
    if (!confirmDelete) return

    const { error } = await supabase.from('comments').delete().eq('id', commentId)

    if (error) {
      alert('ไม่สามารถลบความคิดเห็นได้: ' + error.message)
    } else {
      await fetchProfileData()
    }
  }

  const toggleComments = (logId: string) => {
    setExpandedComments(prev => ({ ...prev, [logId]: !prev[logId] }))
  }

  // Calculate statistics
  const catches = logs.filter(log => !log.fish_name?.startsWith('📍'))
  const spots = logs.filter(log => log.fish_name?.startsWith('📍'))

  const catchCount = catches.length
  const spotCount = spots.length
  const totalWeight = catches.reduce((sum, log) => sum + (log.weight || 0), 0)

  // Avatar stats
  const totalLikes = logs.reduce((sum, log) => sum + (log.likes?.length || 0), 0)
  const maxWeight = catches.reduce((max, log) => (log.weight && log.weight > max) ? log.weight : max, 0)
  const luresUsed = logs.map(log => log.lure_used?.trim()?.toLowerCase()).filter(Boolean)
  const uniqueLures = new Set(luresUsed).size

  const statsForAvatars = {
    spotCount,
    totalLikes,
    maxWeight,
    uniqueLures
  }

  // Level info
  const lvlInfo = getUserLevelInfo(catchCount, profile?.total_points || 0)

  // Helper to find most frequent
  const getMostFrequent = (arr: any[], key: string) => {
    const counts: Record<string, number> = {}
    arr.forEach((log) => {
      const val = log[key]
      if (val) {
        counts[val] = (counts[val] || 0) + 1
      }
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted.length > 0 ? sorted[0][0] : '-'
  }

  const topFish = getMostFrequent(catches, 'fish_name')
  const topLure = getMostFrequent(logs, 'lure_used')
  const topLocation = getMostFrequent(logs, 'location_name')

  const displayedLogs = activeTab === 'catches' ? catches : spots

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-stone-200">
        <p className="text-stone-400 animate-pulse">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-stone-200 p-4">
        <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 max-w-md shadow-xl">
          <p className="text-red-400 text-lg font-bold mb-4">❌ ไม่พบข้อมูลโปรไฟล์นักตกปลานี้</p>
          <Link href="/" className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-stone-900 rounded font-bold text-sm transition-colors">
            กลับหน้าหลัก
          </Link>
        </div>
      </main>
    )
  }

  const isOwner = currentUserId === profileId

  return (
    <main className="flex min-h-screen flex-col items-center pt-24 pb-12 px-4 bg-stone-900 text-stone-200">
      {/* Navigation Bar (Fixed Top) */}
      <nav className="w-full bg-stone-950/90 backdrop-blur-md border-b border-stone-800 fixed top-0 left-0 z-50 px-4 py-3.5 flex justify-center shadow-lg">
        <div className="w-full max-w-2xl flex justify-between items-center">
          <Link href="/" className="text-xl font-black text-yellow-500 tracking-wider flex items-center gap-2">
            <span>🎣</span> Bite & Brag
          </Link>
          
          <div className="flex items-center gap-3">
            {currentUserId && (
              <>
                {/* 🔔 ปุ่มแจ้งเตือน */}
                <button
                  onClick={() => {
                    setInboxInitialTab('notifications')
                    setInboxTargetUserId(null)
                    setIsInboxOpen(true)
                  }}
                  className="relative text-stone-400 hover:text-white text-base p-1.5 cursor-pointer transition-colors"
                  title="การแจ้งเตือน"
                >
                  🔔
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border border-stone-900 shadow-sm animate-pulse">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* ✉️ ปุ่มแชต */}
                <button
                  onClick={() => {
                    setInboxInitialTab('chat')
                    setInboxTargetUserId(null)
                    setIsInboxOpen(true)
                  }}
                  className="relative text-stone-400 hover:text-white text-base p-1.5 cursor-pointer transition-colors"
                  title="ข้อความส่วนตัว"
                >
                  ✉️
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border border-stone-900 shadow-sm animate-pulse">
                      {unreadMsgCount}
                    </span>
                  )}
                </button>
              </>
            )}

            <Link href="/" className="bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold py-2 px-3.5 rounded transition-all hover:text-white cursor-pointer">
              ⬅️ กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-2xl space-y-6">
        {/* Profile Card Header */}
        <div className={`overflow-hidden bg-stone-800 rounded-lg shadow-xl p-6 transition-all duration-300 relative border ${lvlInfo.frameClass}`}>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* Avatar placeholder with Level Frame colors */}
            <div className="w-24 h-24 rounded-full bg-stone-950 flex items-center justify-center border-4 shadow-md relative shrink-0 overflow-hidden" style={{ borderColor: lvlInfo.colorHex }}>
              <img src={getAvatarPath(profile.username)} alt="Avatar" className="w-full h-full object-cover animate-fade-in" />
              <span className="absolute -bottom-2 -right-1 bg-stone-900 text-yellow-400 font-black px-2 py-0.5 rounded-full text-[10px] border border-stone-700">
                LV.{lvlInfo.level}
              </span>
            </div>

            {/* User Bio and Title */}
            <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                {isEditingName ? (
                  <div className="flex gap-2 w-full max-w-sm justify-center sm:justify-start">
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-stone-700 px-3 py-1 text-sm rounded text-white focus:ring-2 focus:ring-yellow-500 max-w-[200px]"
                    />
                    <button onClick={handleUpdateName} className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 text-xs font-bold px-3 py-1 rounded">
                      บันทึก
                    </button>
                    <button onClick={() => { setIsEditingName(false); setNewName(profile.display_name || ''); }} className="bg-stone-600 hover:bg-stone-500 text-stone-300 text-xs font-bold px-3 py-1 rounded">
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-black text-white truncate">
                    {profile.display_name || 'นักตกปลา'}
                  </h1>
                )}

                {!isEditingName && isOwner && (
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="text-stone-500 hover:text-stone-350 text-xs transition-colors self-center flex items-center gap-1 cursor-pointer"
                  >
                    ✏️ แก้ไขชื่อ
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-black border leading-none ${lvlInfo.colorClass}`}>
                  {lvlInfo.title}
                </span>
                <span className="bg-stone-700/60 border border-stone-600 px-2.5 py-1 rounded text-xs text-stone-300">
                  ⭐️ {profile.total_points || 0} คะแนนสะสม
                </span>
              </div>

              {isOwner && (
                <div className="flex justify-center sm:justify-start pt-1">
                  <button 
                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                    className="text-yellow-500 hover:text-yellow-400 text-xs transition-colors flex items-center gap-1 cursor-pointer font-bold bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-full shadow-sm"
                  >
                    🛡️ เปลี่ยนอวตาร์เครื่องยศ
                  </button>
                </div>
              )}

              {!isOwner && currentUserId && (
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <button 
                      onClick={() => {
                        setInboxInitialTab('chat')
                        setInboxTargetUserId(profileId)
                        setIsInboxOpen(true)
                      }}
                      className="text-yellow-500 hover:text-yellow-400 text-xs transition-colors flex items-center gap-1 cursor-pointer font-bold bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1.5 rounded-full shadow-sm hover:bg-yellow-500/20"
                    >
                      💬 ส่งข้อความส่วนตัว (Chat)
                    </button>
                    <button 
                      onClick={handleSendTournamentInvite}
                      className="text-yellow-500 hover:text-yellow-400 text-xs transition-colors flex items-center gap-1 cursor-pointer font-bold bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1.5 rounded-full shadow-sm hover:bg-yellow-500/20"
                    >
                      🏆 ชวนแข่งขัน
                    </button>
                  </div>
                  {inviteSentMessage && (
                    <p className="text-xs text-yellow-500 font-bold animate-pulse text-center sm:text-left">
                      {inviteSentMessage}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-stone-400 italic">
                {isOwner 
                  ? "เป็นเกียรติแก่นักตกปลา! นี่คือสมุดบันทึกและสถิติการตกปลาของคุณ"
                  : `สมุดบันทึกส่วนตัวของยอดฝีมือนักตกปลา ${profile.display_name || 'นักตกปลา'}`}
              </p>
              
            </div>
          </div>

          {/* Avatar selector panel */}
          {showAvatarSelector && isOwner && (
            <div className="mt-6 pt-6 border-t border-stone-700/80 space-y-3">
              <h3 className="text-sm font-bold text-yellow-500 flex justify-between items-center">
                <span>🛡️ เลือกอวตาร์เครื่องยศนักตกปลา</span>
                <button onClick={() => setShowAvatarSelector(false)} className="text-stone-400 hover:text-white text-xs cursor-pointer">❌ ปิด</button>
              </h3>
              <p className="text-[11px] text-stone-400">อวตาร์จะถูกปลดล็อกโดยอัตโนมัติตามเควสท้าทายที่คุณผ่านเกณฑ์</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVATARS.map(avatar => {
                  const isUnlocked = avatar.checkUnlocked(statsForAvatars)
                  const isSelected = profile.username === avatar.id || (!profile.username && avatar.id === 'basic_rod')
                  return (
                    <button 
                      key={avatar.id} 
                      type="button"
                      disabled={!isUnlocked}
                      onClick={async () => {
                        if (!isUnlocked) return
                        const { error } = await supabase.from('profiles').update({ username: avatar.id }).eq('id', currentUserId)
                        if (!error) {
                          setProfile((prev: any) => ({ ...prev, username: avatar.id }))
                        } else {
                          alert('เลือกอวตาร์ไม่สำเร็จ: ' + error.message)
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isUnlocked 
                          ? 'cursor-pointer hover:bg-stone-750/50 bg-stone-850' 
                          : 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800'
                      } ${
                        isSelected 
                          ? 'border-yellow-500 bg-yellow-500/5 ring-1 ring-yellow-500/25' 
                          : 'border-stone-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-950 border border-stone-700 shrink-0">
                        <img src={avatar.imagePath} alt={avatar.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {avatar.name}
                          {isSelected && <span className="text-[9px] bg-yellow-600 text-stone-950 px-1.5 py-0.5 rounded leading-none font-black">ใช้งาน</span>}
                        </h4>
                        <p className="text-[10px] text-stone-400 truncate mt-0.5">{avatar.description}</p>
                        <p className={`text-[9px] mt-1 ${isUnlocked ? 'text-green-400 font-semibold' : 'text-stone-500'}`}>
                          {isUnlocked ? '✅ ปลดล็อกแล้ว' : `🔒 เควส: ${avatar.requirement}`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">🎣</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">จำนวนปลาที่ตกได้</span>
            <span className="text-lg font-black text-white font-mono">{catchCount} ตัว</span>
          </div>

          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">🗺️</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">ปักหมุดหมายสวย</span>
            <span className="text-lg font-black text-white font-mono">{spotCount} หมาย</span>
          </div>

          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">⚖️</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">น้ำหนักรวม</span>
            <span className="text-lg font-black text-white font-mono">{totalWeight.toFixed(2)} กก.</span>
          </div>

          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">🐟</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">ปลาที่ได้บ่อย</span>
            <span className="text-sm font-black text-yellow-500 truncate" title={topFish}>{topFish}</span>
          </div>

          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">🐛</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">เหยื่อที่ใช้บ่อย</span>
            <span className="text-sm font-black text-yellow-500 truncate" title={topLure}>{topLure}</span>
          </div>

          <div className="bg-stone-800/80 border border-stone-750 p-4 rounded-lg text-center flex flex-col justify-center shadow-lg">
            <span className="text-2xl mb-1">📍</span>
            <span className="text-stone-555 text-[10px] uppercase font-bold tracking-wider">หมายยอดฮิต</span>
            <span className="text-sm font-black text-yellow-500 truncate" title={topLocation}>{topLocation}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-800 flex gap-2">
          <button
            onClick={() => setActiveTab('catches')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'catches'
                ? 'bg-yellow-600 text-stone-900 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            🎣 ผลงานตกปลา ({catchCount})
          </button>
          <button
            onClick={() => setActiveTab('spots')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'spots'
                ? 'bg-yellow-600 text-stone-900 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            🗺️ หมายสวยที่แนะนำ ({spotCount})
          </button>
        </div>

        {/* Feed List */}
        <div className="space-y-6">
          {displayedLogs.length === 0 ? (
            <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 shadow-xl">
              <p className="text-stone-400 text-sm">ยังไม่มีข้อมูลในส่วนนี้เลยครับ</p>
            </div>
          ) : (
            displayedLogs.map((log) => {
              const likeCount = log.likes?.length || 0;
              const hasLiked = log.likes?.some((like: any) => like.user_id === currentUserId);

              return (
                <div key={log.id} id={`log-${log.id}`} className={`overflow-hidden bg-stone-800 rounded-lg shadow-xl transition-all duration-300 ${lvlInfo.frameClass}`}>
                  {/* Photo & Mini Map Map */}
                  {currentUserId && (parseImageUrls(log.image_url).length > 0 || (log.latitude && log.longitude)) ? (
                    <div className="flex flex-col sm:flex-row h-[360px] sm:h-64 bg-stone-950 overflow-hidden relative border-b border-stone-700">
                      {parseImageUrls(log.image_url).length > 0 && (
                        <div className={`${log.latitude && log.longitude ? 'w-full sm:w-1/2 h-1/2 sm:h-full' : 'w-full h-full'} relative`}>
                          <ImageCarousel imageUrls={parseImageUrls(log.image_url)} alt={log.fish_name} />
                        </div>
                      )}
                      {log.latitude && log.longitude && (
                        <div className={`${parseImageUrls(log.image_url).length > 0 ? 'w-full sm:w-1/2 h-1/2 sm:h-full border-t sm:border-t-0 sm:border-l border-stone-700' : 'w-full h-full'} relative`}>
                          <CardMap lat={log.latitude} lng={log.longitude} />
                        </div>
                      )}
                    </div>
                  ) : (
                    parseImageUrls(log.image_url).length > 0 && (
                      <div className="w-full h-64 bg-stone-950 overflow-hidden relative border-b border-stone-700">
                        <ImageCarousel imageUrls={parseImageUrls(log.image_url)} alt={log.fish_name} />
                      </div>
                    )
                  )}

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4 border-b border-stone-700 pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {log.fish_name?.startsWith('📍') && (
                            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold">
                              🗺️ หมายแนะนำ
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{log.fish_name}</h2>
                        <p className="text-sm font-medium text-yellow-500 flex flex-wrap items-center gap-1.5">
                          <span>👤 ผู้โพสต์:</span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-white bg-stone-700/50 px-2 py-0.5 rounded text-xs">
                            <img src={getAvatarPath(profile.username)} alt="avatar" className="w-6 h-6 rounded-full object-cover bg-stone-950 border border-stone-700/40" />
                            {profile.display_name || 'นักตกปลา'}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black border leading-none ${lvlInfo.colorClass}`}>
                            {lvlInfo.title}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-stone-400">{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                        {log.user_id === currentUserId && (
                          <div className="flex gap-3">
                            <Link href={`/edit-log/${log.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">แก้ไข</Link>
                            <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors">ลบ</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Table Details */}
                    {log.fish_name?.startsWith('📍') ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-stone-300 mb-6">
                        <p>
                          <span className="text-stone-500 text-sm block">ชื่อหมายตกปลา</span>
                          <span className="inline-flex items-center gap-2 flex-wrap font-bold text-white">
                            <span>{log.location_name || 'ไม่ระบุ'}</span>
                            {log.latitude && log.longitude && (
                              currentUserId ? (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 px-2 py-0.5 rounded transition-all font-normal"
                                >
                                  📍 นำทาง
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-stone-700/50 text-stone-400 border border-stone-600/30 px-2 py-0.5 rounded font-normal">
                                  🔒 เข้าสู่ระบบเพื่อดูแผนที่
                                </span>
                              )
                            )}
                          </span>
                        </p>
                        <p><span className="text-stone-500 text-sm block">เหยื่อแนะนำ</span> <span className="font-bold text-white">{log.lure_used || 'ไม่ระบุ'}</span></p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-stone-300 mb-6">
                        <p><span className="text-stone-500 text-sm block">น้ำหนัก</span> {log.weight ? `${log.weight} กก.` : '-'}</p>
                        <p><span className="text-stone-500 text-sm block">ความยาว</span> {log.length ? `${log.length} ซม.` : '-'}</p>
                        <p>
                          <span className="text-stone-500 text-sm block">หมายตกปลา</span>
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span>{log.location_name || 'ไม่ระบุ'}</span>
                            {log.latitude && log.longitude && (
                              currentUserId ? (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 px-2 py-0.5 rounded transition-all"
                                >
                                  📍 นำทาง
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-stone-700/50 text-stone-400 border border-stone-600/30 px-2 py-0.5 rounded">
                                  🔒 เข้าสู่ระบบเพื่อดูแผนที่
                                </span>
                              )
                            )}
                          </span>
                        </p>
                        <p><span className="text-stone-500 text-sm block">เหยื่อที่ใช้</span> {log.lure_used || 'ไม่ระบุ'}</p>
                      </div>
                    )}

                    {/* Actions and Comments */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-700/50 flex-wrap gap-2">
                      <button 
                        onClick={() => handleToggleLike(log.id, hasLiked)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                          hasLiked ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-stone-700 text-stone-300 hover:bg-stone-600 border border-transparent'
                        }`}
                      >
                        <span>{hasLiked ? '❤️ หมานสุดๆ!' : '🤍 หมานๆ'}</span>
                        {likeCount > 0 && <span className="bg-stone-900 px-2 py-0.5 rounded-full text-xs">{likeCount}</span>}
                      </button>

                      <button
                        onClick={() => toggleComments(log.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                          expandedComments[log.id] ? 'bg-yellow-600 text-stone-900' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                        }`}
                      >
                        <span>💬 คอมเมนต์</span>
                        {log.comments && log.comments.length > 0 && (
                          <span className={`${expandedComments[log.id] ? 'bg-stone-900 text-yellow-500 font-bold' : 'bg-stone-900 text-stone-300'} px-2 py-0.5 rounded-full text-xs`}>
                            {log.comments.length}
                          </span>
                        )}
                      </button>

                      {currentUserId && log.user_id === currentUserId && (
                        <button 
                          onClick={() => {
                            setSharingLog(log)
                            setSharingLogCatchCount(catchCount)
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-stone-700 hover:bg-stone-600 border border-transparent text-stone-300 hover:text-white transition-all duration-200"
                        >
                          <span>🔗 แชร์ผลงาน</span>
                        </button>
                      )}
                    </div>

                    {/* Comments section */}
                    {expandedComments[log.id] && (
                      <div className="mt-5 pt-5 border-t border-stone-700/50 space-y-4">
                        <h4 className="text-sm font-bold text-yellow-500 flex items-center gap-1.5">
                          <span>💬</span> ความคิดเห็น ({log.comments?.length || 0})
                        </h4>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {log.comments && log.comments.length > 0 ? (
                            log.comments.map((comment: any) => (
                              <div key={comment.id} className="bg-stone-850 p-3 rounded-lg border border-stone-750 flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                    {comment.user_id ? (
                                      <Link href={`/profile/${comment.user_id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:underline">
                                        <img src={getAvatarPath(comment.profiles?.username)} alt="avatar" className="w-5 h-5 rounded-full object-cover bg-stone-950 border border-stone-700/30" />
                                        {comment.profiles?.display_name || 'นักตกปลา'}
                                      </Link>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                                        <img src={getAvatarPath(null)} alt="avatar" className="w-5 h-5 rounded-full object-cover bg-stone-950 border border-stone-700/30" />
                                        {comment.profiles?.display_name || 'นักตกปลา'}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-stone-500">
                                      {new Date(comment.created_at).toLocaleDateString('th-TH')} {new Date(comment.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-300 break-words leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                </div>
                                {currentUserId && comment.user_id === currentUserId && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-stone-500 hover:text-red-400 text-xs p-1 transition-colors"
                                    title="ลบคอมเมนต์"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-stone-500 text-center py-2">ยังไม่มีความคิดเห็นเกี่ยวกับผลงานนี้ 🎣</p>
                          )}
                        </div>

                        {currentUserId ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="เขียนความคิดเห็น..."
                              value={commentInputs[log.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [log.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(log.id)
                                }
                              }}
                              className="flex-1 bg-stone-700 rounded px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                            <button
                              onClick={() => handleAddComment(log.id)}
                              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-stone-900 rounded font-bold text-xs transition-colors shrink-0"
                            >
                              ส่ง
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 text-center">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {sharingLog && (
        <ShareCardModal 
          log={sharingLog} 
          catchCount={sharingLogCatchCount} 
          onClose={() => setSharingLog(null)} 
        />
      )}

      {/* หน้าต่างกล่องข้อความ / แชต */}
      {isInboxOpen && currentUserId && (
        <InboxModal
          currentUserId={currentUserId}
          initialTab={inboxInitialTab}
          targetUserId={inboxTargetUserId}
          onClose={() => {
            setIsInboxOpen(false)
            fetchUnreadCounts()
          }}
          onRefreshCounts={fetchUnreadCounts}
        />
      )}
    </main>
  )
}
