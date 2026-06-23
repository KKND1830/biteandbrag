'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

import { getUserLevelInfo } from '../utils/level'
import ShareCardModal from '../components/ShareCardModal'
import { getAvatarPath } from '../utils/avatar'
import { parseImageUrls } from '../utils/image'
import ImageCarousel from '../components/ImageCarousel'
import InboxModal from '../components/InboxModal'

const CardMap = dynamic(() => import('../components/CardMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-950 flex items-center justify-center text-stone-500 text-xs">กำลังโหลดแผนที่...</div>
})

const InteractiveMap = dynamic(() => import('../components/InteractiveMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-stone-950 flex items-center justify-center text-stone-500 text-xs rounded-lg border border-stone-700">กำลังโหลดแผนที่ทั้งหมด...</div>
})

export default function Home() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  
  const [myDisplayName, setMyDisplayName] = useState('')
  const [myAvatarId, setMyAvatarId] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  
  // Inbox / Notification States
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [inboxInitialTab, setInboxInitialTab] = useState<'notifications' | 'chat'>('notifications')
  const [inboxTargetUserId, setInboxTargetUserId] = useState<string | null>(null)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [sharingLog, setSharingLog] = useState<any | null>(null)
  const [sharingLogCatchCount, setSharingLogCatchCount] = useState<number>(0)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [viewType, setViewType] = useState<'feed' | 'map' | 'rank'>('feed')

  useEffect(() => {
    initHome()
  }, [])

  const fetchLogs = async () => {
    const { data: logsData } = await supabase
      .from('bite_logs')
      .select('*, profiles(display_name, rank, total_points, username), likes(user_id)')
      .order('created_at', { ascending: false })

    if (logsData) {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles(display_name, username)')
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('Error fetching comments:', commentsError.message)
        // ถ้าไม่มีตาราง comments หรือโหลดไม่ได้ ให้เก็บผลงานโดยคอมเมนต์เป็นอาเรย์ว่าง
        setLogs(logsData.map(log => ({ ...log, comments: [] })))
      } else {
        const logsWithComments = logsData.map(log => ({
          ...log,
          comments: commentsData.filter((c: any) => c.log_id === log.id) || []
        }))
        setLogs(logsWithComments)
      }
    }
  }

  const initHome = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      setCurrentUserEmail(user.email || null)
      
      const { data: profData } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).single()
      
      if (profData?.display_name) {
        setMyDisplayName(profData.display_name)
        setNewProfileName(profData.display_name)
      } else {
        const defaultName = user.email ? user.email.split('@')[0] : 'นักตกปลา'
        setMyDisplayName(defaultName)
        setNewProfileName(defaultName)
      }

      if (profData?.username) {
        setMyAvatarId(profData.username)
      }
    }

    await fetchLogs()
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
    await fetchLogs()
    await fetchUnreadCounts()
  }

  const handleUpdateProfile = async () => {
    if (!newProfileName.trim()) return
    const { error } = await supabase.from('profiles').update({ display_name: newProfileName }).eq('id', currentUserId)
    if (!error) {
      setMyDisplayName(newProfileName)
      setIsEditingProfile(false)
      initHome()
    }
  }

  const handleLogout = async () => {
    const confirmLogout = window.confirm('ต้องการออกจากระบบใช่หรือไม่? 🚪')
    if (!confirmLogout) return
    await supabase.auth.signOut()
    setCurrentUserId(null)
    setCurrentUserEmail(null)
    setMyDisplayName('')
    setNewProfileName('')
    setViewMode('all')
    
    // โหลดข้อมูลผลงานใหม่ในฐานะ Guest
    setLoading(true)
    await fetchLogs()
    setLoading(false)
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
      await fetchLogs()

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
      await fetchLogs()
    }
  }

  const toggleComments = (logId: string) => {
    setExpandedComments(prev => ({ ...prev, [logId]: !prev[logId] }))
  }

  const getLeaderboardData = () => {
    const usersMap: Record<string, {
      userId: string
      displayName: string
      catchCount: number
      totalWeight: number
      points: number
    }> = {}

    filteredLogs.forEach(log => {
      // Exclude spot recommendations from leaderboard statistics
      if (log.fish_name?.startsWith('📍')) return

      const userId = log.user_id || `guest_${log.author_name || 'anonymous'}`
      const displayName = log.profiles?.display_name || log.author_name || 'นักตกปลาลึกลับ'

      if (!usersMap[userId]) {
        usersMap[userId] = {
          userId,
          displayName,
          catchCount: 0,
          totalWeight: 0,
          points: 0
        }
      }

      usersMap[userId].catchCount += 1
      usersMap[userId].totalWeight += log.weight || 0
    })

    return Object.values(usersMap)
      .map(user => {
        user.points = Math.round((user.totalWeight * 10) + (user.catchCount * 5))
        return user
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points
        }
        return b.totalWeight - a.totalWeight
      })
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('ต้องการลบผลงานนี้ใช่หรือไม่? 🗑️')
    if (!confirmDelete) return
    const { error } = await supabase.from('bite_logs').delete().eq('id', id)
    if (!error) setLogs(logs.filter((log) => log.id !== id))
  }

  const displayedLogs = viewMode === 'all' ? logs : logs.filter((log) => log.user_id === currentUserId)
  
  const myLogs = logs.filter((log) => log.user_id === currentUserId)

  // 🔍 กรองตามช่องค้นหา
  const filteredLogs = displayedLogs.filter((log) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const fishName = log.fish_name?.toLowerCase() || ''
    const locationName = log.location_name?.toLowerCase() || ''
    const lureUsed = log.lure_used?.toLowerCase() || ''
    const displayName = log.profiles?.display_name?.toLowerCase() || ''
    const authorName = log.author_name?.toLowerCase() || ''
    
    return (
      fishName.includes(query) ||
      locationName.includes(query) ||
      lureUsed.includes(query) ||
      displayName.includes(query) ||
      authorName.includes(query)
    )
  })

  const totalWeight = filteredLogs.reduce((sum, log) => sum + (log.weight || 0), 0)
  
  // 💡 ปรับการคำนวณสถิติให้เขียนถูกหลัก TypeScript แบบเข้มงวดที่สุด
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

  const topLure = getMostFrequent(filteredLogs, 'lure_used')
  const topLocation = getMostFrequent(filteredLogs, 'location_name')

  return (
    <main className="flex min-h-screen flex-col items-center pt-24 pb-12 px-4 bg-stone-900 text-stone-200">
      {/* 🧭 Navigation Bar (Fixed Top) */}
      <nav className="w-full bg-stone-950/90 backdrop-blur-md border-b border-stone-800 fixed top-0 left-0 z-50 px-4 py-3.5 flex justify-center shadow-lg">
        <div className="w-full max-w-2xl flex justify-between items-center">
          <Link href="/" className="text-xl font-black text-yellow-500 tracking-wider flex items-center gap-2">
            <span>🎣</span> Bite & Brag
          </Link>
          
          <div className="flex items-center gap-3">
            {currentUserEmail ? (
              <div className="flex items-center gap-3">
                <Link 
                  href={`/profile/${currentUserId}`} 
                  className="flex items-center gap-2 group hover:text-white transition-colors cursor-pointer"
                  title="ดูโปรไฟล์ของคุณ"
                >
                  <img 
                    src={getAvatarPath(myAvatarId)} 
                    alt="my-avatar" 
                    className="w-7 h-7 rounded-full object-cover bg-stone-950 border border-yellow-500/35 group-hover:border-yellow-500/75 transition-all shadow-md" 
                  />
                  <span className="hidden sm:inline text-xs text-stone-400 group-hover:text-stone-300 transition-colors">
                    สวัสดี, <span className="text-yellow-400 font-bold group-hover:text-yellow-350">{myDisplayName}</span> 👑
                  </span>
                </Link>

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

                <Link href="/add-log" className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 text-xs font-bold py-2 px-3 rounded transition-all shadow-md">
                  + เพิ่มผลงาน
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold py-2 px-3 rounded transition-all hover:text-white cursor-pointer"
                >
                  ออกจากระบบ 🚪
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/add-log" className="bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold py-2 px-3 rounded transition-all">
                  + เพิ่มผลงาน
                </Link>
                <Link href="/login" className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 text-xs font-bold py-2 px-4.5 rounded transition-all shadow-lg">
                  เข้าสู่ระบบ 🔑
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="w-full max-w-2xl">
        
        <div className="flex justify-between items-end mb-6 border-b border-stone-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">บันทึกความภูมิใจของนักตกปลา 🌊</h1>
            <p className="text-stone-400 text-sm">แชร์รูปปลา หมายเด็ด และเหยื่อหมานของเหล่ายอดฝีมือ</p>
          </div>
        </div>
        
        {currentUserEmail && (
          <div className="mb-6 bg-stone-800/40 border border-stone-700/50 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="text-xs text-stone-500 mb-1">🟢 บัญชีใช้งานในเครื่องนี้:</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-stone-200">👑 นามแฝง: <span className="text-yellow-400 text-base">{myDisplayName}</span></span>
                <span className="text-stone-500 text-xs">({currentUserEmail})</span>
              </div>
            </div>
            {isEditingProfile ? (
              <div className="flex gap-2 items-center w-full md:w-auto">
                <input 
                  type="text" 
                  value={newProfileName} 
                  onChange={(e) => setNewProfileName(e.target.value)} 
                  className="flex-1 md:flex-initial p-1.5 bg-stone-700 rounded text-white text-xs border border-yellow-500 focus:outline-none" 
                  placeholder="ใส่นามแฝงใหม่"
                />
                <button onClick={handleUpdateProfile} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2.5 py-1.5 rounded font-bold transition-colors">บันทึก</button>
                <button onClick={() => setIsEditingProfile(false)} className="bg-stone-650 hover:bg-stone-600 text-stone-200 text-xs px-2.5 py-1.5 rounded transition-colors">ยกเลิก</button>
              </div>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} className="text-yellow-500 hover:text-yellow-400 hover:underline text-xs font-semibold">✏️ แก้ไขชื่อนามแฝงโปรไฟล์</button>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6 bg-stone-800 p-1 rounded-lg border border-stone-700 shadow-md">
          <button onClick={() => setViewMode('all')} className={`flex-1 py-2.5 text-sm font-bold rounded transition-colors ${viewMode === 'all' ? 'bg-yellow-600 text-stone-900 shadow' : 'text-stone-400 hover:text-stone-200'}`}>🌍 ผลงานรวมในเว็บ ({logs.length})</button>
          <button onClick={() => setViewMode('mine')} className={`flex-1 py-2.5 text-sm font-bold rounded transition-colors ${viewMode === 'mine' ? 'bg-yellow-600 text-stone-900 shadow' : 'text-stone-400 hover:text-stone-200'}`}>👤 ผลงานของฉัน ({myLogs.length})</button>
        </div>

        {/* 📜/🗺️/🏆 แถบเลือกประเภทมุมมองแผนที่ ผลงาน หรือจัดอันดับ */}
        <div className="flex gap-2 mb-6 bg-stone-850 p-1 rounded-lg border border-stone-800 shadow-inner flex-wrap md:flex-nowrap">
          <button 
            onClick={() => setViewType('feed')} 
            className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${viewType === 'feed' ? 'bg-stone-700 text-yellow-500 shadow border border-stone-600' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <span>📜</span> แสดงผลงาน (Feed View)
          </button>
          <button 
            onClick={() => setViewType('map')} 
            className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${viewType === 'map' ? 'bg-stone-700 text-yellow-500 shadow border border-stone-600' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <span>🗺️</span> แผนที่หมาย (Map View)
          </button>
          <button 
            onClick={() => setViewType('rank')} 
            className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${viewType === 'rank' ? 'bg-stone-700 text-yellow-500 shadow border border-stone-600' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <span>🏆</span> อันดับนักตกปลา (Leaderboard)
          </button>
        </div>

        {/* 🔍 ช่องค้นหาผลงาน */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-stone-400 text-sm">🔍</span>
          </div>
          <input
            type="text"
            placeholder="ค้นหาตามชื่อปลา, หมายตกปลา, เหยื่อที่ใช้ หรือชื่อผู้โพสต์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all duration-200 shadow-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300 text-xs font-bold transition-colors"
            >
              เคลียร์
            </button>
          )}
        </div>

        {displayedLogs.length > 0 && (
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 text-center shadow-lg">
              <p className="text-stone-400 text-[11px] mb-1">
                {viewMode === 'all' ? '🎣 ผลงานรวมในเว็บ' : '🎣 ผลงานของฉัน'}
              </p>
              <p className="text-2xl font-bold text-white">{filteredLogs.length} <span className="text-xs font-normal text-stone-500">ตัว</span></p>
            </div>
            <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 text-center shadow-lg">
              <p className="text-stone-400 text-[11px] mb-1">
                {viewMode === 'all' ? '⚖️ น้ำหนักรวมทั้งหมด' : '⚖️ น้ำหนักรวมของฉัน'}
              </p>
              <p className="text-2xl font-bold text-yellow-500">{totalWeight.toFixed(2)} <span className="text-xs font-normal text-stone-500">กก.</span></p>
            </div>
            <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 text-center shadow-lg flex flex-col justify-center">
              <p className="text-stone-400 text-[11px] mb-1">
                {viewMode === 'all' ? '🐛 เหยื่อยอดนิยม' : '🐛 เหยื่อหมานสุด'}
              </p>
              <p className="text-sm font-bold text-white truncate px-1">{topLure}</p>
            </div>
            <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 text-center shadow-lg flex flex-col justify-center">
              <p className="text-stone-400 text-[11px] mb-1">
                {viewMode === 'all' ? '📍 หมายยอดฮิต' : '📍 หมายประจำ'}
              </p>
              <p className="text-sm font-bold text-white truncate px-1">{topLocation}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-stone-400 animate-pulse">กำลังดึงข้อมูลจากสายน้ำ...</p>
        ) : viewType === 'map' ? (
          <div className="mb-6">
            <InteractiveMap logs={filteredLogs} />
          </div>
        ) : viewType === 'rank' ? (
          <div className="bg-stone-800 rounded-lg border border-stone-700 shadow-xl overflow-hidden p-6 mb-6">
            <div className="flex items-center gap-3 mb-6 border-b border-stone-700 pb-4">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="text-xl font-bold text-white">อันดับจ้าวแห่งสายน้ำ</h2>
                <p className="text-stone-400 text-xs mt-0.5">วัดจากฝีมือ ความขยัน และขนาดของผลงาน</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-300">
                <thead>
                  <tr className="border-b border-stone-700 text-stone-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 text-center">อันดับ</th>
                    <th className="py-3 px-4">นักตกปลา</th>
                    <th className="py-3 px-4 text-center">จำนวนปลา (ตัว)</th>
                    <th className="py-3 px-4 text-right">น้ำหนักรวม (กก.)</th>
                    <th className="py-3 px-4 text-right text-yellow-500 font-bold">คะแนนสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-750">
                  {getLeaderboardData().length > 0 ? (
                    getLeaderboardData().map((user, index) => {
                      const rank = index + 1
                      let rankBadge = `${rank}`
                      let rowHighlight = ''

                      if (rank === 1) {
                        rankBadge = '🥇'
                        rowHighlight = 'bg-yellow-500/5 border-l-4 border-l-yellow-500 font-bold text-white'
                      } else if (rank === 2) {
                        rankBadge = '🥈'
                        rowHighlight = 'bg-stone-300/5 border-l-4 border-l-stone-300 font-bold text-white'
                      } else if (rank === 3) {
                        rankBadge = '🥉'
                        rowHighlight = 'bg-amber-700/5 border-l-4 border-l-amber-700 font-bold text-white'
                      }

                      return (
                        <tr key={user.userId} className={`hover:bg-stone-700/30 transition-colors ${rowHighlight}`}>
                          <td className="py-4 px-4 text-center text-lg">{rankBadge}</td>
                          <td className="py-4 px-4">
                            {!user.userId.startsWith('guest_') ? (
                              <Link href={`/profile/${user.userId}`} className="bg-stone-700/40 hover:bg-stone-600/60 px-2.5 py-1 rounded text-xs border border-stone-600/50 text-white font-medium transition-colors">
                                {user.displayName}
                              </Link>
                            ) : (
                              <span className="bg-stone-700/40 px-2.5 py-1 rounded text-xs border border-stone-600/50 text-stone-300">
                                {user.displayName}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-mono">{user.catchCount}</td>
                          <td className="py-4 px-4 text-right font-mono">{user.totalWeight.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right text-yellow-500 font-black font-mono">{user.points}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-500 text-xs">
                        ยังไม่มีข้อมูลการจัดอันดับ 🎣
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4.5 bg-stone-900/60 rounded-lg border border-stone-750 text-xs text-stone-400 space-y-1.5 leading-relaxed">
              <p className="font-bold text-yellow-500 flex items-center gap-1">
                <span>💡</span> กติกาการคิดคะแนนและจัดอันดับ:
              </p>
              <ul className="list-disc list-inside pl-1 space-y-1 text-stone-400">
                <li>ปลาแต่ละตัวที่บันทึกสำเร็จจะได้รับ <strong className="text-stone-300">5 คะแนน</strong></li>
                <li>น้ำหนักรวมของปลาที่ตกได้ คิดกิโลกรัมละ <strong className="text-stone-300">10 คะแนน</strong> (เช่น ปลาหนัก 1.5 กิโลกรัม = 15 คะแนน)</li>
                <li>หากคะแนนเท่ากัน จะเรียงลำดับจากคนที่มี **น้ำหนักปลารวม** มากกว่า</li>
              </ul>
            </div>
          </div>
        ) : displayedLogs.length === 0 ? (
          <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 shadow-xl">
            <p className="text-stone-400 mb-4">{viewMode === 'all' ? 'สมุดบันทึกยังว่างเปล่า' : 'คุณยังไม่มีบันทึกผลงานของตัวเองเลยครับ'}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-8 bg-stone-800 rounded-lg border border-stone-700 shadow-xl">
            <p className="text-stone-400 mb-2">🔍 ไม่พบผลงานที่ตรงกับคำค้นหาของคุณ</p>
            <p className="text-stone-500 text-xs">ลองค้นหาคำอื่น เช่น ช่อน, กบยาง, หรือสถานที่ตกปลา</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredLogs.map((log) => {
              const likeCount = log.likes?.length || 0;
              const hasLiked = log.likes?.some((like: any) => like.user_id === currentUserId);

              // คำนวณหาจำนวนตัวสะสมที่ตกได้ของผู้โพสต์ล็อกนี้ (ไม่นับที่เป็นการปักหมุดหมายสวย)
              const authorCatchCount = logs.filter((l) => l.user_id === log.user_id && !l.fish_name?.startsWith('📍')).length
              // คำนวณเลเวลผู้โพสต์
              const authorLvlInfo = getUserLevelInfo(authorCatchCount, log.profiles?.total_points || 0)

              return (
                <div key={log.id} id={`log-${log.id}`} className={`overflow-hidden bg-stone-800 rounded-lg shadow-xl transition-all duration-300 ${authorLvlInfo.frameClass}`}>
                  {/* แสดงรูปภาพคู่กับแผนที่จำลอง (จำกัดเฉพาะสมาชิกที่เข้าสู่ระบบแล้วเท่านั้น) */}
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
                    /* สำหรับผู้ใช้งานทั่วไป/ผู้เยี่ยมชมที่ไม่ได้ล็อกอิน (จะเห็นเฉพาะรูปภาพเต็มความกว้าง) */
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
                          {log.user_id ? (
                            <Link href={`/profile/${log.user_id}`} className="inline-flex items-center gap-1.5 font-bold text-white bg-stone-700/50 hover:bg-stone-655 px-2 py-0.5 rounded text-xs transition-all hover:text-yellow-400">
                              <img src={getAvatarPath(log.profiles?.username)} alt="avatar" className="w-6 h-6 rounded-full object-cover bg-stone-950 border border-stone-700/40" />
                              {log.profiles?.display_name || log.author_name || 'นักตกปลาลึกลับ'}
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-white bg-stone-700/50 px-2 py-0.5 rounded text-xs">
                              <img src={getAvatarPath(null)} alt="avatar" className="w-6 h-6 rounded-full object-cover bg-stone-950 border border-stone-700/40" />
                              {log.profiles?.display_name || log.author_name || 'นักตกปลาลึกลับ'}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black border leading-none ${authorLvlInfo.colorClass}`}>
                            {authorLvlInfo.title}
                          </span>
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
                                  title="เปิดนำทางบน Google Maps"
                                >
                                  📍 นำทาง
                                </a>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] bg-stone-700/50 text-stone-400 border border-stone-600/30 px-2 py-0.5 rounded font-normal"
                                  title="ต้องเข้าสู่ระบบเพื่อนำทาง"
                                >
                                  🔒 เข้าสู่ระบบเพื่อดูแผนที่
                                </span>
                              )
                            )}
                          </span>
                        </p>
                        <p><span className="text-stone-500 text-sm block">เหยื่อแนะนำ</span> <span className="font-bold text-white">{log.lure_used || 'ไม่ระบุ'}</span></p>
                        {log.latitude && log.longitude && (
                          <p className="md:col-span-2">
                            <span className="text-stone-500 text-sm block font-mono">พิกัด GPS</span>
                            <span className="text-xs font-mono text-stone-400">{log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}</span>
                          </p>
                        )}
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
                                  title="เปิดนำทางบน Google Maps"
                                >
                                  📍 นำทาง
                                </a>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] bg-stone-700/50 text-stone-400 border border-stone-600/30 px-2 py-0.5 rounded"
                                  title="ต้องเข้าสู่ระบบเพื่อดูแผนที่"
                                >
                                  🔒 เข้าสู่ระบบเพื่อดูแผนที่
                                </span>
                              )
                            )}
                          </span>
                        </p>
                        <p><span className="text-stone-500 text-sm block">เหยื่อที่ใช้</span> {log.lure_used || 'ไม่ระบุ'}</p>
                      </div>
                    )}
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
                            setSharingLogCatchCount(authorCatchCount)
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-stone-700 hover:bg-stone-600 border border-transparent text-stone-300 hover:text-white transition-all duration-200"
                        >
                          <span>🔗 แชร์ผลงาน</span>
                        </button>
                      )}
                    </div>

                    {/* ส่วนแสดงความคิดเห็น (Comment Section) */}
                    {expandedComments[log.id] && (
                      <div className="mt-5 pt-5 border-t border-stone-700/50 space-y-4">
                        <h4 className="text-sm font-bold text-yellow-500 flex items-center gap-1.5">
                          <span>💬</span> ความคิดเห็น ({log.comments?.length || 0})
                        </h4>

                        {/* รายการคอมเมนต์ */}
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

                        {/* กล่องส่งคอมเมนต์ */}
                        {currentUserId ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="เขียนความคิดเห็นเกี่ยวกับผลงานนี้..."
                              value={commentInputs[log.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [log.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(log.id)
                                }
                              }}
                              className="flex-1 p-2 bg-stone-900 border border-stone-700 rounded text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                            <button
                              onClick={() => handleAddComment(log.id)}
                              className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold text-xs px-4 py-2 rounded transition-colors"
                            >
                              ส่ง
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-stone-900/50 border border-stone-850 rounded text-center text-xs text-stone-500">
                            🔒 กรุณา <Link href="/login" className="text-yellow-500 hover:underline">เข้าสู่ระบบ</Link> เพื่อเขียนความคิดเห็น
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* หน้าต่าง Share Card พรีวิวแบบ Dota */}
      {sharingLog && (
        <ShareCardModal
          log={sharingLog}
          catchCount={sharingLogCatchCount}
          onClose={() => {
            setSharingLog(null)
            setSharingLogCatchCount(0)
          }}
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