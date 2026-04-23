import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Avatar, Modal } from '../components/ui'
import {
  Heart,
  MessageSquare,
  Plus,
  Image,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatTime } from '../lib/utils'
import {
  uploadStorageImage,
  getStorageErrorMessage,
} from '../lib/storage'

export default function Feed() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newImage, setNewImage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [expandedComments, setExpandedComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    fetchPosts()

    const subscription = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function fetchPosts() {
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url),
        likes (user_id),
        comments (
          id,
          content,
          created_at,
          profiles:user_id (username, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!fetchError && data) {
      setPosts(data)
      setError('')
    } else if (fetchError) {
      setError('Gonderiler yuklenemedi.')
    }

    setLoading(false)
  }

  async function createPost(e) {
    e.preventDefault()
    if (!newContent.trim() && !newImage) return

    setCreating(true)
    setError('')

    let imageUrl = null
    let imagePath = null
    let imageMetadata = null

    if (newImage) {
      const bucket = 'post-images'
      const { data: uploadData, error: uploadError } = await uploadStorageImage({
        client: supabase,
        bucket,
        file: newImage,
        userId: user.id,
        folder: 'posts',
      })

      if (uploadError) {
        setError(getStorageErrorMessage(uploadError, { bucket }))
        setCreating(false)
        return
      }

      imageUrl = uploadData.publicUrl
      imagePath = uploadData.path
      imageMetadata = uploadData.metadata
    }

    const { error: insertError } = await supabase.from('posts').insert({
      user_id: user.id,
      content: newContent.trim(),
      image_url: imageUrl,
      image_path: imagePath,
      image_bucket: imagePath ? 'post-images' : null,
      image_mime_type: imageMetadata?.mimeType ?? null,
      image_size_bytes: imageMetadata?.sizeBytes ?? null,
      image_original_name: imageMetadata?.originalName ?? null,
    })

    if (!insertError) {
      setNewContent('')
      setNewImage(null)
      setShowCreate(false)
      fetchPosts()
    } else {
      if (imagePath) {
        await supabase.storage.from('post-images').remove([imagePath])
      }

      setError('Gonderi kaydedilemedi.')
    }

    setCreating(false)
  }

  async function toggleLike(post) {
    setError('')

    const alreadyLiked = post.likes?.some((like) => like.user_id === user.id)
    let actionError = null

    if (alreadyLiked) {
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id)

      actionError = deleteError
    } else {
      const { error: insertError } = await supabase.from('likes').insert({
        post_id: post.id,
        user_id: user.id,
      })

      actionError = insertError
    }

    if (actionError) {
      setError('Begeni kaydedilemedi.')
      return
    }

    fetchPosts()
  }

  async function addComment(postId) {
    const text = commentText[postId]
    if (!text?.trim()) return

    setError('')

    const { error: insertError } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text.trim(),
    })

    if (insertError) {
      setError('Yorum kaydedilemedi.')
      return
    }

    setCommentText({ ...commentText, [postId]: '' })
    fetchPosts()
  }

  function toggleComments(postId) {
    setExpandedComments({
      ...expandedComments,
      [postId]: !expandedComments[postId],
    })
  }

  function handleImageChange(event) {
    const file = event.target.files[0]
    if (!file) return

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setNewImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5">
      <div className="mb-6 rounded-[1.6rem] border border-white/60 bg-white/70 px-4 py-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-text">
              Akış
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Paylaşımlar, yorumlar ve beğeniler tek akışta
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="h-4 w-4" /> Paylaş
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Yukleniyor...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary mb-4">Henuz gonderi yok</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Ilk Gonderiyi Paylas
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isLiked = post.likes?.some((like) => like.user_id === user.id)
            const likeCount = post.likes?.length || 0
            const commentCount = post.comments?.length || 0
            const isExpanded = expandedComments[post.id]

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/75 shadow-[0_14px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl"
              >
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar
                      src={post.profiles?.avatar_url}
                      name={post.profiles?.username}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-text text-sm">
                        {post.profiles?.username}
                      </p>
                    <p className="text-xs text-text-secondary">
                        {formatTime(post.created_at)}
                      </p>
                    </div>
                  </div>

                  {post.content && (
                    <p className="mb-3 whitespace-pre-wrap text-text leading-6">
                      {post.content}
                    </p>
                  )}

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Gonderi"
                      className="mb-3 w-full max-h-96 rounded-[1.15rem] object-cover"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1 px-4 pb-3 sm:px-5">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                      isLiked
                        ? 'bg-red-50 text-red-500'
                        : 'text-text-secondary hover:bg-white/80 hover:text-text'
                    }`}
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={isLiked ? 'currentColor' : 'none'}
                    />
                    <span className="font-medium">{likeCount}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/80 hover:text-text"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">{commentCount}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/60 bg-white/30">
                    {post.comments?.length > 0 && (
                      <div className="max-h-60 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar
                              src={comment.profiles?.avatar_url}
                              name={comment.profiles?.username}
                              size="xs"
                            />
                            <div>
                              <p className="text-xs">
                                <span className="font-semibold text-text">
                                  {comment.profiles?.username}
                                </span>{' '}
                                <span className="text-text">
                                  {comment.content}
                                </span>
                              </p>
                              <p className="text-[10px] text-text-secondary">
                                {formatTime(comment.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                      <div className="flex items-center gap-2 border-t border-white/60 px-4 py-3 sm:px-5">
                        <Avatar
                          src={profile?.avatar_url}
                          name={profile?.username}
                          size="xs"
                        />
                      <input
                        type="text"
                        value={commentText[post.id] || ''}
                        onChange={(event) =>
                          setCommentText({
                            ...commentText,
                            [post.id]: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') addComment(post.id)
                        }}
                        placeholder="Yorum yaz..."
                        className="flex-1 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-sm text-text placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      />
                      <button
                        onClick={() => addComment(post.id)}
                        className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Yeni Gonderi"
      >
        <form onSubmit={createPost} className="space-y-4">
          <textarea
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="Ne dusunuyorsun?"
            rows={4}
            className="w-full resize-none rounded-[1.2rem] border border-white/70 bg-white/85 px-4 py-3 text-text placeholder-text-secondary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />

          {previewUrl && (
            <div className="relative">
              <img src={previewUrl} alt="Onizleme" className="max-h-48 rounded-[1.2rem] object-cover" />
              <button
                type="button"
                onClick={() => {
                  setNewImage(null)
                  setPreviewUrl('')
                }}
                className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur"
              >
                x
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-text-secondary transition-colors hover:bg-white/70">
              <Image className="h-5 w-5" />
              <span className="text-sm">Fotograf</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <Button type="submit" loading={creating}>
              Paylas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
