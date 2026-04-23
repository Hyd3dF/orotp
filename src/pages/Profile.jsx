import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Avatar, Button, Input, Modal } from '../components/ui'
import {
  Edit3,
  Camera,
  MessageCircle,
  Heart,
  Mail,
  User,
  Calendar,
  LogOut,
} from 'lucide-react'
import { formatTime } from '../lib/utils'

export default function Profile() {
  const { user, profile, updateProfile, uploadAvatar, signOut } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [rooms, setRooms] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function loadProfileData() {
      try {
        const [postsResult, roomsResult] = await Promise.all([
          supabase
            .from('posts')
            .select(`
              *,
              likes (user_id),
              comments (id)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('room_members')
            .select(`
              rooms (id, name, created_at)
            `)
            .eq('user_id', user.id),
        ])

        if (cancelled) return

        if (postsResult.data) setPosts(postsResult.data)
        if (roomsResult.data) setRooms(roomsResult.data.map((m) => m.rooms))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfileData()

    return () => {
      cancelled = true
    }
  }, [user])

  function openEditModal() {
    setEditFullName(profile?.full_name || '')
    setEditUsername(profile?.username || '')
    setEditBio(profile?.bio || '')
    setEditPhone(profile?.phone || '')
    setShowEdit(true)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)

    await updateProfile({
      full_name: editFullName,
      username: editUsername,
      bio: editBio,
      phone: editPhone,
    })

    setSaving(false)
    setShowEdit(false)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (file) {
      await uploadAvatar(file)
    }
  }

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    const { error } = await signOut()
    setSigningOut(false)

    if (!error) {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username}
              size="xl"
            />
            <label className="absolute bottom-0 right-0 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-primary text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary-dark">
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-text">
                {profile?.full_name || profile?.username}
              </h1>
            </div>

            <p className="mb-3 text-sm text-text-secondary">@{profile?.username}</p>

            {profile?.bio && (
              <p className="max-w-xl text-sm leading-6 text-text">{profile.bio}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
              {profile?.email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5">
                  <Mail className="h-3 w-3" />
                  {profile.email}
                </span>
              )}
              {profile?.phone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5">
                  <User className="h-3 w-3" />
                  {profile.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5">
                <Calendar className="h-3 w-3" />
                {formatTime(profile?.created_at)} katıldı
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <button
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/15 transition-colors hover:bg-primary-dark"
            >
              <Edit3 className="h-4 w-4" />
              Düzenle
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-white/75 px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-text">{posts.length}</p>
          <p className="text-sm text-text-secondary">Gönderi</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-text">{rooms.length}</p>
          <p className="text-sm text-text-secondary">Oda</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-text">
            {posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0)}
          </p>
          <p className="text-sm text-text-secondary">Beğeni</p>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-text">Katıldığı Odalar</h2>
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-text">{room.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-text">Gönderiler</h2>
        {loading ? (
          <p className="py-8 text-center text-text-secondary">Yükleniyor...</p>
        ) : posts.length === 0 ? (
          <p className="py-8 text-center text-text-secondary">Henüz gönderi yok</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm"
              >
                {post.content && (
                  <p className="mb-2 whitespace-pre-wrap text-text">{post.content}</p>
                )}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Gönderi"
                    className="mb-2 max-h-64 rounded-xl object-cover"
                  />
                )}
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {post.comments?.length || 0}
                  </span>
                  <span>{formatTime(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Profili Düzenle"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Ad Soyad"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            required
          />
          <Input
            label="Kullanıcı Adı"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            required
          />
          <Input
            label="Telefon"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="+90 555 123 4567"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Bio
            </label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              placeholder="Kendinden bahset..."
              className="w-full resize-none rounded-xl border border-border bg-white px-4 py-2.5 text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <Button type="submit" loading={saving} className="w-full">
            Kaydet
          </Button>
        </form>
      </Modal>
    </div>
  )
}
