'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { getAvatarPath } from '../utils/avatar'
import Link from 'next/link'

interface InboxModalProps {
  currentUserId: string
  initialTab?: 'notifications' | 'chat'
  targetUserId?: string | null
  onClose: () => void
  onRefreshCounts?: () => void
}

export default function InboxModal({
  currentUserId,
  initialTab = 'notifications',
  targetUserId = null,
  onClose,
  onRefreshCounts
}: InboxModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'chat'>(initialTab)
  
  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  
  // Chat/DM State
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null)
  const [activeChatProfile, setActiveChatProfile] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch initial data based on active tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications()
    } else {
      fetchConversations(targetUserId || undefined)
    }
  }, [activeTab, targetUserId])

  // Notifications API Calls
  const fetchNotifications = async () => {
    setLoadingNotifs(true)
    const { data: notifData, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error.message)
      setLoadingNotifs(false)
      return
    }

    if (notifData && notifData.length > 0) {
      const senderIds = Array.from(new Set(notifData.map(n => n.sender_id).filter(Boolean)))
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', senderIds)

        const profileMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, any>)

        const combined = notifData.map(n => ({
          ...n,
          sender: n.sender_id ? profileMap[n.sender_id] : null
        }))
        setNotifications(combined)
      } else {
        setNotifications(notifData.map(n => ({ ...n, sender: null })))
      }
    } else {
      setNotifications([])
    }
    setLoadingNotifs(false)
  }

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    if (error) {
      console.error('Error marking all as read:', error.message)
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      if (onRefreshCounts) onRefreshCounts()
    }
  }

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id)
      if (onRefreshCounts) onRefreshCounts()
    }
    onClose()
  }

  // Conversations & DMs API Calls
  const fetchConversations = async (targetUserIdToFocus?: string) => {
    setLoadingConversations(true)
    const { data: msgData, error } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error.message)
      setLoadingConversations(false)
      return
    }

    const partnersMap = new Map<string, { lastMessage: string, timestamp: string }>()
    if (msgData) {
      msgData.forEach(msg => {
        const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
        if (!partnersMap.has(partnerId)) {
          partnersMap.set(partnerId, {
            lastMessage: msg.content,
            timestamp: msg.created_at
          })
        }
      })
    }

    // Ensure focused user is in the list
    if (targetUserIdToFocus && !partnersMap.has(targetUserIdToFocus)) {
      partnersMap.set(targetUserIdToFocus, {
        lastMessage: 'เริ่มแชตใหม่...',
        timestamp: new Date().toISOString()
      })
    }

    const partnerIds = Array.from(partnersMap.keys())

    if (partnerIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', partnerIds)

      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)

      const unreadCountMap = (unreadData || []).reduce((acc, m) => {
        acc[m.sender_id] = (acc[m.sender_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const profileMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {} as Record<string, any>)

      const list = partnerIds.map(id => {
        const profile = profileMap[id] || { id, display_name: 'นักตกปลา', username: null }
        const details = partnersMap.get(id)
        return {
          id,
          profile,
          lastMessage: details?.lastMessage || '',
          timestamp: details?.timestamp || '',
          unreadCount: unreadCountMap[id] || 0
        }
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setConversations(list)

      // Auto focus conversation
      if (targetUserIdToFocus) {
        const targetConv = list.find(c => c.id === targetUserIdToFocus)
        if (targetConv) {
          setActiveChatUserId(targetUserIdToFocus)
          setActiveChatProfile(targetConv.profile)
          fetchMessages(targetUserIdToFocus)
        }
      }
    } else {
      setConversations([])
    }
    setLoadingConversations(false)
  }

  const fetchMessages = async (partnerId: string) => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('sender_id', [currentUserId, partnerId])
      .in('receiver_id', [currentUserId, partnerId])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error.message)
    } else {
      setMessages(data || [])

      // Mark incoming messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_id === partnerId && !m.is_read)
        .map(m => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds)

        // Reset badge locally
        setConversations(prev => prev.map(c => c.id === partnerId ? { ...c, unreadCount: 0 } : c))
        if (onRefreshCounts) onRefreshCounts()
      }
    }
    setLoadingMessages(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChatUserId) return

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: currentUserId,
          receiver_id: activeChatUserId,
          content: newMessage.trim()
        }
      ])
      .select()

    if (error) {
      alert('เกิดข้อผิดพลาดในการส่งข้อความ: ' + error.message)
    } else {
      setNewMessage('')
      if (data && data[0]) {
        setMessages(prev => [...prev, data[0]])
        // Update last message in local conversation list
        setConversations(prev => prev.map(c => c.id === activeChatUserId ? {
          ...c,
          lastMessage: data[0].content,
          timestamp: data[0].created_at
        } : c))
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 border border-stone-800 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-stone-850">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'text-yellow-500 border-yellow-500'
                  : 'text-stone-400 border-transparent hover:text-stone-300'
              }`}
            >
              🔔 การแจ้งเตือน
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-yellow-500 border-yellow-500'
                  : 'text-stone-400 border-transparent hover:text-stone-300'
              }`}
            >
              ✉️ แชตส่วนตัว
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xl p-1 cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* Tab 1: Notifications */}
        {activeTab === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {notifications.filter(n => !n.is_read).length > 0 && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs bg-stone-800 hover:bg-stone-750 text-yellow-500 font-bold py-1.5 px-3 rounded border border-stone-700 cursor-pointer transition-colors"
                >
                  ทำเครื่องหมายอ่านแล้วทั้งหมด
                </button>
              </div>
            )}

            {loadingNotifs ? (
              <div className="flex-1 flex items-center justify-center text-stone-500 text-sm animate-pulse">
                กำลังโหลดการแจ้งเตือน...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-500 py-10">
                <span className="text-3xl mb-2">🔔</span>
                <p className="text-sm">ไม่มีการแจ้งเตือนในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => {
                  let messageText = ''
                  let icon = '📢'
                  
                  if (notif.type === 'like') {
                    messageText = 'ถูกใจโพสต์ของคุณ'
                    icon = '🎣'
                  } else if (notif.type === 'comment') {
                    messageText = `คอมเมนต์บนโพสต์ของคุณ: "${notif.content || ''}"`
                    icon = '💬'
                  } else if (notif.type === 'avatar_unlock') {
                    messageText = `ยินดีด้วย! คุณปลดล็อกอวตาร์ใหม่: ${notif.content || ''}`
                    icon = '🏆'
                  } else {
                    messageText = notif.content || ''
                  }

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 rounded bg-stone-850 border border-stone-750 flex items-start gap-3 transition-colors cursor-pointer hover:bg-stone-800 ${
                        !notif.is_read ? 'border-l-4 border-l-yellow-500' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-stone-950 overflow-hidden shrink-0 flex items-center justify-center border border-stone-700">
                        {notif.type === 'avatar_unlock' ? (
                          <span className="text-lg">🏆</span>
                        ) : (
                          <img 
                            src={getAvatarPath(notif.sender?.username)} 
                            alt="avatar" 
                            className="w-full h-full object-cover" 
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-300 leading-relaxed">
                          <span className="font-bold text-white mr-1.5">
                            {notif.type === 'avatar_unlock' ? 'ระบบเกียรติยศ' : (notif.sender?.display_name || 'นักตกปลา')}
                          </span>
                          {messageText}
                        </p>
                        <span className="text-[10px] text-stone-500 block mt-1">
                          {new Date(notif.created_at).toLocaleString('th-TH')}
                        </span>
                      </div>

                      {notif.log_id && (
                        <Link 
                          href={notif.log_id ? `/#log-${notif.log_id}` : '/'}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] bg-stone-700 hover:bg-stone-600 text-stone-300 py-1 px-2 rounded shrink-0 transition-colors"
                        >
                          ดูโพสต์ ➡️
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Private Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation List */}
            <div className="w-1/3 border-r border-stone-850 overflow-y-auto flex flex-col bg-stone-950/20">
              {loadingConversations ? (
                <div className="flex-1 flex items-center justify-center text-xs text-stone-500 animate-pulse">
                  กำลังโหลดช่องแชต...
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-600 py-8 px-4 text-center">
                  <span className="text-2xl mb-1.5">✉️</span>
                  <p className="text-[11px]">ไม่มีประวัติแชต</p>
                  <p className="text-[9px] text-stone-600 mt-1">ทักคุยได้จากหน้าโปรไฟล์ผู้ใช้งานอื่น</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-850/50">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveChatUserId(conv.id)
                        setActiveChatProfile(conv.profile)
                        fetchMessages(conv.id)
                      }}
                      className={`w-full text-left p-3 flex gap-2.5 items-center hover:bg-stone-850 transition-colors cursor-pointer ${
                        activeChatUserId === conv.id ? 'bg-stone-800' : ''
                      }`}
                    >
                      <img
                        src={getAvatarPath(conv.profile?.username)}
                        alt="avatar"
                        className="w-7 h-7 rounded-full object-cover shrink-0 bg-stone-950 border border-stone-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-white block truncate">
                            {conv.profile?.display_name || 'นักตกปลา'}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Pane */}
            <div className="flex-1 flex flex-col bg-stone-900/40">
              {activeChatUserId ? (
                <>
                  {/* Chat Partner Header */}
                  <div className="p-3 bg-stone-850/80 border-b border-stone-850 flex items-center gap-2">
                    <img
                      src={getAvatarPath(activeChatProfile?.username)}
                      alt="avatar"
                      className="w-6.5 h-6.5 rounded-full object-cover bg-stone-950 border border-stone-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {activeChatProfile?.display_name || 'นักตกปลา'}
                      </span>
                      <Link 
                        href={`/profile/${activeChatUserId}`}
                        className="text-[9px] text-yellow-500 hover:underline"
                        onClick={onClose}
                      >
                        ดูโปรไฟล์ของนักตกปลา
                      </Link>
                    </div>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="h-full flex items-center justify-center text-xs text-stone-500 animate-pulse">
                        กำลังโหลดข้อความ...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-stone-500 py-10">
                        <span className="text-2xl mb-1">💬</span>
                        <p className="text-[11px]">ส่งข้อความแรกเลย!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="max-w-[75%]">
                              <div className={`p-2.5 rounded-lg text-xs leading-relaxed break-words whitespace-pre-wrap ${
                                isMe 
                                  ? 'bg-yellow-600 text-stone-950 font-medium rounded-tr-none' 
                                  : 'bg-stone-800 text-stone-200 rounded-tl-none border border-stone-750'
                              }`}>
                                {msg.content}
                              </div>
                              <span className={`text-[8px] text-stone-500 block mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send Input Form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-850 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="พิมพ์ข้อความที่นี่..."
                      className="flex-1 bg-stone-800 border border-stone-750 rounded px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    />
                    <button
                      type="submit"
                      className="bg-yellow-600 hover:bg-yellow-500 text-stone-900 font-bold px-4 py-2 rounded text-xs transition-colors cursor-pointer"
                    >
                      ส่ง
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-600">
                  <span className="text-3xl mb-2">💬</span>
                  <p className="text-xs">โปรดเลือกคนที่จะคุยทางแถบด้านซ้าย</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
