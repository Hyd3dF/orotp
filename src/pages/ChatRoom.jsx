import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/ui'
import { ArrowLeft, Send, Image, Users, Copy, Check, Hash, X } from 'lucide-react'
import { formatMessageTime } from '../lib/utils'
import {
  uploadStorageImage,
  getStorageErrorMessage,
} from '../lib/storage'

const roomCache = {}
const messagesCache = {}
const membersCache = {}

export default function ChatRoom() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState(roomCache[roomId] || null)
  const [messages, setMessages] = useState(messagesCache[roomId] || [])
  const [newMessage, setNewMessage] = useState('')
  const [members, setMembers] = useState(membersCache[roomId] || [])
  const [loading, setLoading] = useState(!roomCache[roomId] || !messagesCache[roomId])
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !data) {
      setError('Oda bilgisi yuklenemedi.')
      navigate('/chat')
      return
    }

    roomCache[roomId] = data
    setRoom(data)
  }, [navigate, roomId])

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!error && data) {
      messagesCache[roomId] = data
      setMessages(data)
      setError('')
    } else if (error) {
      setError('Mesajlar yuklenemedi.')
    }
    setLoading(false)
  }, [roomId])

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        user_id,
        profiles:user_id (username, avatar_url)
      `)
      .eq('room_id', roomId)

    if (!error && data) {
      membersCache[roomId] = data
      setMembers(data)
    } else if (error) {
      setError('Oda uyeleri yuklenemedi.')
    }
  }, [roomId])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    setError('')

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      user_id: user.id,
      content: newMessage.trim(),
    })

    if (!error) {
      setNewMessage('')
    } else {
      setError('Mesaj gonderilemedi. Odaya uye oldugunuzdan emin olun.')
    }
    setSending(false)
  }

  async function sendImage(e) {
    const file = e.target.files[0]
    if (!file) return

    setSending(true)
    setError('')

    const bucket = 'chat-images'
    const { data: uploadData, error: uploadError } = await uploadStorageImage({
      client: supabase,
      bucket,
      file,
      userId: user.id,
      folder: 'rooms',
    })

    if (uploadError) {
      setError(getStorageErrorMessage(uploadError, { bucket }))
      setSending(false)
      return
    }

    const { error: messageError } = await supabase.from('messages').insert({
      room_id: roomId,
      user_id: user.id,
      content: '',
      image_url: uploadData.publicUrl,
      image_path: uploadData.path,
      image_bucket: bucket,
      image_mime_type: uploadData.metadata.mimeType,
      image_size_bytes: uploadData.metadata.sizeBytes,
      image_original_name: uploadData.metadata.originalName,
    })

    if (messageError) {
      await supabase.storage.from(bucket).remove([uploadData.path])
      setError('Gorsel mesaji kaydedilemedi.')
      setSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSending(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  function copyCode() {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    async function loadRoomData() {
      await Promise.all([fetchRoom(), fetchMessages(), fetchMembers()])
    }

    loadRoomData()

    const messageSubscription = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
          scrollToBottom()
        }
      )
      .subscribe()

    const memberSubscription = supabase
      .channel(`room_members:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMembers()
        }
      )
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
      memberSubscription.unsubscribe()
    }
  }, [fetchMembers, fetchMessages, fetchRoom, roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-xs text-text-secondary">Yukleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 w-full flex-col overflow-hidden" style={{ background: '#f9fafb' }}>

      {/* ── Header ── */}
      <div className="z-10 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate('/chat')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-slate-100 hover:text-text"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        {/* Icon */}
        <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Hash className="h-4 w-4 text-primary" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-text">
            {room?.name}
          </h2>
          <p className="mt-0.5 truncate text-[11.5px] text-text-secondary">
            <span className="font-mono">{room?.invite_code || '—'}</span>
            <span className="mx-1.5 text-border">·</span>
            <span>{members.length} üye</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={copyCode}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text'
            }`}
            title="Davet Kodunu Kopyala"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>

          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all ${
              showMembers
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text'
            }`}
            title="Üyeler"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Üyeler</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="space-y-1">
              {messages.map((msg, index) => {
                const isOwn = msg.user_id === user.id
                const previousMsg = index > 0 ? messages[index - 1] : null
                const showMeta = !previousMsg || previousMsg.user_id !== msg.user_id
                const isGrouped = previousMsg && previousMsg.user_id === msg.user_id

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
                  >
                    {/* Avatar slot */}
                    <div className="w-7 shrink-0 self-end">
                      {showMeta && !isOwn && (
                        <Avatar
                          src={msg.profiles?.avatar_url}
                          name={msg.profiles?.username}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`flex max-w-[72%] sm:max-w-[60%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showMeta && !isOwn && (
                        <p className="mb-1 ml-0.5 text-[11px] font-medium text-text-secondary">
                          {msg.profiles?.username}
                        </p>
                      )}

                      {msg.image_url && !msg.content ? (
                        <img
                          src={msg.image_url}
                          alt="Fotoğraf"
                          className="max-h-56 rounded-2xl object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                            isOwn
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-white text-text shadow-sm border border-slate-100 rounded-bl-md'
                          }`}
                        >
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Fotoğraf"
                              className="mb-2 max-h-48 w-full rounded-xl object-cover"
                            />
                          )}
                          {msg.content && (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      )}

                      <p className={`mt-1 text-[10.5px] text-text-secondary/50 ${isOwn ? 'mr-0.5' : 'ml-0.5'}`}>
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={sendImage}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary/60 transition-colors hover:bg-slate-100 hover:text-text disabled:opacity-40"
              >
                <Image className="h-4 w-4" />
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mesaj yazın..."
                className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-text placeholder-text-secondary/50 transition-colors focus:border-primary/40 focus:bg-white focus:outline-none"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* ── Members Sidebar — desktop ── */}
        {showMembers && (
          <div className="hidden w-60 shrink-0 border-l border-slate-200 bg-white lg:block xl:w-64">
            <div className="p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Üyeler · {members.length}
              </p>
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  >
                    <Avatar
                      src={member.profiles?.avatar_url}
                      name={member.profiles?.username}
                      size="sm"
                      online={true}
                    />
                    <span className="truncate text-[13px] font-medium text-text">
                      {member.profiles?.username}
                      {member.user_id === user.id && (
                        <span className="ml-1 text-[10px] font-normal text-text-secondary">(Sen)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Members Bottom Sheet — mobile ── */}
      {showMembers && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowMembers(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-text">
                Üyeler
                <span className="ml-1.5 text-text-secondary font-normal">({members.length})</span>
              </p>
              <button
                onClick={() => setShowMembers(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2"
                >
                  <Avatar
                    src={member.profiles?.avatar_url}
                    name={member.profiles?.username}
                    size="md"
                    online={true}
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">
                      {member.profiles?.username}
                      {member.user_id === user.id && (
                        <span className="ml-1 text-xs font-normal text-text-secondary">(Sen)</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-accent">Çevrimiçi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
