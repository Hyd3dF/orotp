import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, Newspaper, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function MobileNav() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const navItems = [
    { path: '/chat', label: 'Sohbet', icon: MessageCircle },
    { path: '/feed', label: 'Akış', icon: Newspaper },
    { path: '/profile', label: 'Profil', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border border-border/70 border-b-0 bg-white/90 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden">
      <div className="flex h-16 items-center justify-around px-3 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-white/70 hover:text-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
