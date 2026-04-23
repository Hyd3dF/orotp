import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout'
import { ProtectedRoute } from './components/auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatRooms from './pages/ChatRooms'
import ChatRoom from './pages/ChatRoom'
import Feed from './pages/Feed'
import Profile from './pages/Profile'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="chat"
              element={
                <ProtectedRoute>
                  <ChatRooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat/:roomId"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
