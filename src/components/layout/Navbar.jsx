import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui'
import { MessageCircle, Newspaper, Sparkles } from 'lucide-react'

export default function Navbar() {
  const { user, profile } = useAuth()
  const location = useLocation()
  
  const isChatRoom = location.pathname.match(/^\/chat\/[a-zA-Z0-9-]+$/)

  const navItems = [
    { path: '/chat', label: 'Sohbet', icon: MessageCircle },
    { path: '/feed', label: 'Akış', icon: Newspaper },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-2xl shadow-sm shadow-black/[0.02]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3 transition-transform hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary text-white shadow-md shadow-primary/20 ring-1 ring-black/5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <p className="font-sans text-xl font-bold tracking-tight text-text">
              oroto chat
            </p>
          </div>
        </Link>

        {user && !isChatRoom && (
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-2xl bg-black/[0.02] p-1 ring-1 ring-black/[0.03]">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-primary shadow-sm ring-1 ring-black/[0.04]'
                      : 'text-text-secondary hover:bg-black/[0.02] hover:text-text'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'text-text-secondary/70'}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
            {user ? (
            <Link
              to="/profile"
              className="flex items-center overflow-hidden rounded-[14px] bg-white/50 p-1 pr-3 shadow-sm ring-1 ring-black/[0.04] transition-all hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.username}
                  size="sm"
                />
                <span className="hidden lg:inline text-[15px] font-semibold text-text">
                  {profile?.username}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-xl bg-primary px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
