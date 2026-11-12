
import { NavLink } from 'react-router-dom'
import {
  House,
  Folder,
  CirclePlus,
  Bookmark,
  Heart,
  UserRound,
} from 'lucide-react'

import Logo from './Logo'
import './Sidebar.css'

const navigationItems = [
  { label: 'Sākums', path: '/dashboard', icon: House },
  { label: 'Projektu katalogs', path: '/projects', icon: Folder },
  { label: 'Izveidot projektu', path: '/projects/new', icon: CirclePlus },
  { label: 'Mani projekti', path: '/projects/mine', icon: Bookmark },
  { label: 'Saglabātie', path: '/projects/saved', icon: Heart },
  { label: 'Profils', path: '/profile', icon: UserRound },
]

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-logo">
          <Logo />
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Lietotāja navigācija"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="sidebar-icon" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <p>
            RADI.
            <br />
            MĀCIES.
            <br />
            DALIES.
          </p>
        </div>
      </div>
    </aside>
  )
}
