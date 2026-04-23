import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'
import { MessageCircle, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (fullName.trim().length < 2) {
      setError('İsim en az 2 karakter olmalıdır')
      return
    }

    if (username.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Kullanıcı adı sadece harf, rakam ve _ içerebilir')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }

    setLoading(true)

    const { error, requiresEmailConfirmation } = await signUp(
      email.trim(),
      password,
      username,
      fullName.trim()
    )

    if (error) {
      if (
        error.message.includes('already registered') ||
        error.message.includes('already been registered')
      ) {
        setError('Bu e-posta adresi zaten kayıtlı')
      } else if (error.message.includes('duplicate key')) {
        setError('Bu kullanıcı adı zaten alınmış')
      } else {
        setError('Kayıt olurken bir hata oluştu: ' + error.message)
      }
      setLoading(false)
      return
    }

    if (requiresEmailConfirmation) {
      setSuccess('Kayıt tamamlandı. E-postanızı onayladıktan sonra giriş yapabilirsiniz.')
      setLoading(false)
      return
    }

    navigate('/feed')
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute left-8 top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-12 bottom-10 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden rounded-[2rem] border border-white/60 bg-white/65 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Join the network
            </div>
            <h1 className="brand-font mt-6 text-5xl font-bold leading-[0.95] text-text">
              Daha düzenli bir topluluk alanı kur.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-text-secondary">
              Profilini oluştur, odalara katıl ve içerik paylaş. Tüm akış daha temiz,
              daha güvenli ve daha profesyonel.
            </p>

            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">Güvenli kayıt</p>
                    <p className="text-sm text-text-secondary">
                      Hesap oluşturma akışı Supabase Auth ile korunur.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">Anında düzenleme</p>
                    <p className="text-sm text-text-secondary">
                      Kaydı tamamladığında profilin otomatik olarak oluşturulur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/60 p-5 shadow-[0_25px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-7">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/20">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold tracking-[-0.02em] text-text">
                  Hesap oluştur
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Topluluğa katılmak için birkaç alan yeterli
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-danger">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-green-200/80 bg-green-50/80 px-3 py-2.5 text-sm text-green-700">
                    {success}
                  </div>
                )}

                <Input
                  label="Ad Soyad"
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <Input
                  label="Kullanıcı Adı"
                  type="text"
                  placeholder="kullaniciadi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  required
                />

                <Input
                  label="E-posta"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="relative">
                  <Input
                    label="Şifre"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-text-secondary transition-colors hover:text-text"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <Button type="submit" loading={loading} className="w-full">
                  Kayıt Ol
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-text-secondary">
                Zaten hesabın var mı?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
