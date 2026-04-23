import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'
import { MessageCircle, Users, Heart, Zap, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Home() {
  const { user } = useAuth()

  const features = [
    {
      icon: MessageCircle,
      title: 'Canlı Sohbet',
      desc: 'Odalar içinde hızlı, akıcı ve gerçek zamanlı mesajlaşma.',
    },
    {
      icon: Users,
      title: 'Topluluk Odaları',
      desc: 'İlgi alanlarına göre katılabileceğin ve oluşturabileceğin odalar.',
    },
    {
      icon: Heart,
      title: 'Sosyal Akış',
      desc: 'Paylaşımlar, beğeniler ve yorumlarla canlı bir feed.',
    },
    {
      icon: ShieldCheck,
      title: 'Güvenli Giriş',
      desc: 'Oturum yönetimi ve profil kontrolü tek yerde.',
    },
  ]

  const stats = [
    { value: '24/7', label: 'Aktif deneyim' },
    { value: '3 modül', label: 'Sohbet, feed, profil' },
    { value: 'Mobile first', label: 'Her ekrana uyumlu' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Community space
            </div>

            <h1 className="brand-font mt-6 max-w-2xl text-5xl font-bold leading-[0.95] text-text md:text-7xl">
              Sohbet, paylaşım ve profil kontrolü tek akışta.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary md:text-lg">
              Klasik sosyal uygulama görünümünü bırakıp daha sinematik, daha yoğun
              ve daha modern bir arayüze geçtik.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/feed">
                  <Button size="lg" className="shadow-lg shadow-primary/20">
                    Devam Et <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="shadow-lg shadow-primary/20">
                      Hesap Oluştur
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">
                      Giriş Yap
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-white/80 p-4">
                  <p className="brand-font text-2xl font-bold text-text">{stat.value}</p>
                  <p className="mt-1 text-sm text-text-secondary">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-accent/20 blur-3xl" />

            <div className="glass-panel relative overflow-hidden rounded-[2rem] p-5">
              <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live room</p>
                    <p className="mt-1 text-lg font-semibold">Design-first chat</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Zap className="h-5 w-5 text-emerald-300" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-100">
                    Daha güçlü arka plan, daha net hiyerarşi.
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-medium text-white">
                    Tasarım artık aynı görünmüyor.
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-100">
                    Evet. Bu daha karakterli.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <article
              key={feature.title}
              className="glass-panel group rounded-[1.75rem] p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                0{index + 1}
              </p>
              <h3 className="brand-font text-xl font-semibold text-text">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{feature.desc}</p>
            </article>
          )
        })}
      </section>
    </div>
  )
}
