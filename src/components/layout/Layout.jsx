import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNav from './MobileNav'

export default function Layout() {
  const location = useLocation()
  const isChatRoom = location.pathname.match(/^\/chat\/[a-zA-Z0-9-]+$/)

  return (
    <div className={`${isChatRoom ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} text-text flex flex-col bg-white`}>
      {!isChatRoom && <Navbar />}
      <main className={`relative flex-1 flex flex-col ${isChatRoom ? 'h-full overflow-hidden' : 'pt-16 pb-[4.5rem] md:pb-0'}`}>
        {!isChatRoom && <div className="pointer-events-none absolute inset-0 page-grid opacity-[0.22]" />}
        <Outlet />
      </main>
      {!isChatRoom && <MobileNav />}
    </div>
  )
}
