import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Modal, Input } from '../components/ui'
import { Plus, Copy, Check, MessageCircle, Hash, Users, LogIn } from 'lucide-react'
import { generateInviteCode } from '../lib/utils'

function isMissingFunctionError(error) {
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    error?.message?.includes('Could not find the function')
  )
}

function getRoomErrorMessage(error, fallbackMessage) {
  if (!error) return fallbackMessage

  if (error.code === '23505') return 'Bu kayit zaten var. Lutfen tekrar deneyin.'
  if (error.code === '23503') return 'Kullanici profili veritabaninda bulunamadi.'
  if (error.code === '23514') return 'Oda adi 2 ile 100 karakter arasynda olmali.'
  if (error.code === 'P0002') return 'Oda bulunamadi. Davet kodunu kontrol edin.'

  return fallbackMessage
}

export default function ChatRooms() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)
  const [memberCounts, setMemberCounts] = useState({})

  const fetchRooms = useCallback(async () => {
    try {
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('room_members')
        .select(`
          room_id,
          joined_at,
          rooms (
            id,
            name,
            owner_id,
            invite_code,
            created_at,
            profiles:owner_id (username, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (!fetchError && data) {
        const roomsList = data.map((member) => ({ ...member.rooms, joined_at: member.joined_at }))
        setRooms(roomsList)

        const counts = {}
        await Promise.all(
          roomsList.map(async (room) => {
            const { count } = await supabase
              .from('room_members')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
            counts[room.id] = count || 0
          })
        )
        setMemberCounts(counts)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  async function createRoomFallback(name, inviteCode) {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ name, owner_id: user.id, invite_code: inviteCode })
      .select()
      .single()

    if (roomError) return { data: null, error: roomError }

    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      await supabase.from('rooms').delete().eq('id', room.id).eq('owner_id', user.id)
      return { data: null, error: memberError }
    }

    return { data: room, error: null }
  }

  async function joinRoomFallback(code) {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('invite_code', code)
      .single()

    if (roomError || !room) return { data: null, error: roomError }

    const { error: memberError } = await supabase
      .from('room_members')
      .insert({ room_id: room.id, user_id: user.id })

    if (memberError) return { data: null, error: memberError }

    return { data: room, error: null }
  }

  async function createRoom(e) {
    e.preventDefault()

    const trimmedRoomName = newRoomName.trim()
    if (!trimmedRoomName) return

    if (trimmedRoomName.length < 2 || trimmedRoomName.length > 100) {
      setError('Oda adi 2 ile 100 karakter arasynda olmali.')
      return
    }

    setCreating(true)
    setError('')

    let room = null
    let lastError = null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inviteCode = generateInviteCode()
      const rpcResult = await supabase.rpc('create_room_with_owner_membership', {
        p_name: trimmedRoomName,
        p_invite_code: inviteCode,
        p_description: '',
      })

      if (!rpcResult.error) {
        room = rpcResult.data
        break
      }

      if (isMissingFunctionError(rpcResult.error)) {
        const fallbackResult = await createRoomFallback(trimmedRoomName, inviteCode)
        room = fallbackResult.data
        lastError = fallbackResult.error
      } else {
        lastError = rpcResult.error
      }

      if (room || lastError?.code !== '23505') break
    }

    if (!room) {
      setError(getRoomErrorMessage(lastError, 'Oda olusturulamadi. Lutfen tekrar deneyin.'))
      setCreating(false)
      return
    }

    setNewRoomName('')
    setShowCreate(false)
    setCreating(false)
    fetchRooms()
  }

  async function joinRoom(e) {
    e.preventDefault()

    const trimmedCode = joinCode.trim()
    if (!trimmedCode) return

    setJoining(true)
    setError('')

    const rpcResult = await supabase.rpc('join_room_by_invite_code', {
      p_invite_code: trimmedCode,
    })

    let room = rpcResult.data
    let joinError = rpcResult.error

    if (isMissingFunctionError(joinError)) {
      const fallbackResult = await joinRoomFallback(trimmedCode)
      room = fallbackResult.data
      joinError = fallbackResult.error
    }

    if (joinError?.code === '23505') {
      setError('Bu odaya zaten uyeysiniz.')
    } else if (joinError || !room) {
      setError(getRoomErrorMessage(joinError, 'Odaya katilirken bir hata olustu.'))
    } else {
      setJoinCode('')
      setShowJoin(false)
      fetchRooms()
    }

    setJoining(false)
  }

  async function copyCode(code) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">

      {/* ── Page Header ── */}
      <div className="mb-6">
        <div className="flex items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-lg font-semibold text-text">Sohbet Odaları</h1>
            <p className="mt-1 text-xs text-text-secondary">
              {rooms.length > 0 ? `${rooms.length} aktif oda` : 'Henüz oda yok'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              <LogIn className="h-3.5 w-3.5" />
              Katıl
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Oda Oluştur</span>
              <span className="sm:hidden">Yeni</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Room List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="mt-3 text-xs text-text-secondary">Yükleniyor...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
            <MessageCircle className="h-5 w-5 text-text-secondary/50" />
          </div>
          <p className="text-sm font-medium text-text">Henüz bir odanız yok</p>
          <p className="mt-1 text-xs text-text-secondary">
            Yeni bir oda oluşturun veya davet koduyla katılın.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-3.5 w-3.5" />
              Oda Oluştur
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-xs font-medium text-text hover:border-primary/40 hover:text-primary"
            >
              <LogIn className="h-3.5 w-3.5" />
              Katıl
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-white overflow-hidden">
          {rooms.map((room) => (
            <Link
              key={room.id}
              to={`/chat/${room.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"
            >
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 transition-colors group-hover:bg-primary/12">
                <Hash className="h-4 w-4 text-primary" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-text">
                  {room.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-text-secondary">
                  <span className="truncate">{room.profiles?.username}</span>
                  {memberCounts[room.id] !== undefined && (
                    <>
                      <span className="text-border">·</span>
                      <span className="inline-flex shrink-0 items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {memberCounts[room.id]}
                      </span>
                    </>
                  )}
                  <span className="hidden text-border sm:inline">·</span>
                  <span className="hidden shrink-0 sm:inline">{formatDate(room.created_at)}</span>
                </div>
              </div>

              {/* Copy */}
              <button
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  copyCode(room.invite_code)
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary/40 transition-colors hover:bg-slate-100 hover:text-text-secondary"
                title="Davet Kodunu Kopyala"
              >
                {copied === room.invite_code ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError('') }} title="Yeni Oda Oluştur">
        <form onSubmit={createRoom} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <Input
            label="Oda Adı"
            placeholder="Oda adını girin"
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            required
          />
          <Button type="submit" loading={creating} className="w-full">
            Oluştur
          </Button>
        </form>
      </Modal>

      <Modal isOpen={showJoin} onClose={() => { setShowJoin(false); setError('') }} title="Odaya Katıl">
        <form onSubmit={joinRoom} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <Input
            label="Davet Kodu"
            placeholder="Oda davet kodunu girin"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            required
          />
          <Button type="submit" loading={joining} className="w-full">
            Katıl
          </Button>
        </form>
      </Modal>
    </div>
  )
}
