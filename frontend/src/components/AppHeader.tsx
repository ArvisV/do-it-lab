
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react'

import './AppHeader.css'

const API_URL = 'http://localhost:5000/api'

type User = {
  id: string
  email: string
  displayName?: string | null
  avatarPath?: string | null
}

export default function AppHeader() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login', { replace: true })
          }
          return
        }

        const data = await response.json()

        if (active) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Neizdevās ielādēt lietotāju:', error)
      }
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [navigate])

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      navigate('/', { replace: true })
    }
  }

  const displayName =
    user?.displayName?.trim() || 'Do It Lab lietotājs'

  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="app-header">
      <div className="app-header-spacer" />

      <div className="app-header-profile">
        <button
          type="button"
          className="app-header-user"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          title="Atvērt profila izvēlni"
        >
          <span className="app-header-avatar">
            {initial}
          </span>

          <span className="app-header-name">
            {displayName}
          </span>

          <ChevronDown
            size={16}
            className={menuOpen ? 'rotated' : ''}
          />
        </button>

        {menuOpen && (
          <div className="app-header-dropdown">
            <div className="app-header-dropdown-info">
              <span className="app-header-dropdown-avatar">
                {initial}
              </span>

              <div className="app-header-dropdown-text">
                <strong>{displayName}</strong>
                <span>Do It Lab dalībnieks</span>
              </div>
            </div>

            <div className="app-header-divider" />

            <button
              type="button"
              className="app-header-dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                navigate('/profile')
              }}
            >
              <Settings size={17} />
              Profila iestatījumi
            </button>

            <button
              type="button"
              className="app-header-dropdown-item logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              Izrakstīties
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
