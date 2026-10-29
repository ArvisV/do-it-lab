
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import './DashboardPage.css'
import {
  House,
  Folder,
  CirclePlus,
  Bookmark,
  Heart,
  UserRound,
  Leaf,
  Sprout,
  Cpu,
  Palette,
  Hammer,
} from 'lucide-react'

const API_URL = 'http://localhost:5000/api'


const categories = [
  { name: 'Visas kategorijas', icon: Leaf },
  { name: 'Koks un amatniecība', icon: Hammer },
  { name: 'Dārzs un daba', icon: Sprout },
  { name: 'Elektronika', icon: Cpu },
  { name: 'DIY un māja', icon: House },
  { name: 'Radošie darbi', icon: Palette },
]


const projects = [
  {
    title: 'Koka plaukts istabas augiem',
    category: 'Koks un amatniecība',
    author: 'Anna',
    status: 'Pabeigts',
    image:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Automātiska augu laistīšana',
    category: 'Elektronika',
    author: 'Jānis',
    status: 'Procesā',
    image:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Mazs zaļais dārzs mājās',
    category: 'Dārzs un daba',
    author: 'Līga',
    status: 'Plānots',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Roku darbs mājīgākai mājai',
    category: 'DIY un māja',
    author: 'Zane',
    status: 'Pabeigts',
    image:
      'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Putnu būrītis no pārpalikumiem',
    category: 'Koks un amatniecība',
    author: 'Mārtiņš',
    status: 'Procesā',
    image:
      'https://images.unsplash.com/photo-1520637836862-4d197d17c13a?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Instrumentu organizators',
    category: 'DIY un māja',
    author: 'Kristaps',
    status: 'Plānots',
    image:
      'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=85',
  },
]

type User = {
  id: string
  email: string
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] =
    useState('Visas kategorijas')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        })

        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        if (!response.ok) {
          throw new Error('Neizdevās pārbaudīt lietotāja sesiju.')
        }

        const data = await response.json()

        if (active) {
          setUser(data.user)
        }
      } catch {
        if (active) {
          setNotice(
            'Neizdevās sazināties ar serveri. Pārbaudi, vai backend darbojas.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [navigate])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesCategory =
        activeCategory === 'Visas kategorijas' ||
        project.category === activeCategory

      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.category.toLowerCase().includes(query) ||
        project.author.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

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

  const displayName = user?.email.split('@')[0] ?? ''
  const initial = displayName.charAt(0).toUpperCase() || 'L'

  if (loading) {
    return (
      <main className="dashboard-loading">
        <span className="loading-spinner" />
        <p>Atveram tavu radošo telpu...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="dashboard-loading">
        <p>Neizdevās ielādēt lietotāja informāciju.</p>
        <button
          className="dashboard-primary-button"
          onClick={() => navigate('/login')}
        >
          Pieslēgties vēlreiz
        </button>
      </main>
    )
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <Logo />
        </div>

        
        <nav className="dashboard-nav" aria-label="Lietotāja navigācija">
          <a className="dashboard-nav-link active" href="#sakums">
            <House className="nav-icon" />
            <span>Sākums</span>
          </a>

          <a className="dashboard-nav-link" href="#projekti">
            <Folder className="nav-icon" />
            <span>Projektu katalogs</span>
          </a>

          <button
            className="dashboard-nav-link"
            onClick={() =>
              setNotice('Projektu izveides formu izveidosim nākamajā solī.')
            }
          >
            <CirclePlus className="nav-icon" />
            <span>Izveidot projektu</span>
          </button>

  <button
    className="dashboard-nav-link"
    onClick={() =>
      setNotice('Sadaļu “Mani projekti” izveidosim vēlāk.')
    }
  >
    <Bookmark className="nav-icon" />
    <span>Mani projekti</span>
  </button>

  <button
    className="dashboard-nav-link"
    onClick={() =>
      setNotice('Saglabāto projektu sadaļu izveidosim vēlāk.')
    }
  >
    <Heart className="nav-icon" />
    <span>Saglabātie</span>
  </button>

  <button
    className="dashboard-nav-link"
    onClick={() => setNotice(`Tavs konts: ${user.email}`)}
  >
    <UserRound className="nav-icon" />
    <span>Profils</span>
  </button>
</nav>


        <div className="sidebar-bottom">
          <div className="sidebar-motto">
            RADI.
            <br />
            MĀCIES.
            <br />
            DALIES.
          </div>
          <button className="logout-button" onClick={handleLogout}>
            ↗ Izrakstīties
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Meklēt projektus"
              placeholder="Meklēt projektus..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search"
                aria-label="Notīrīt meklēšanu"
                onClick={() => setSearch('')}
              >
                ×
              </button>
            )}
          </div>

          <button
            className="dashboard-user"
            onClick={handleLogout}
            title="Noklikšķini, lai izrakstītos"
          >
            <span className="user-avatar">{initial}</span>
            <span className="user-name">{displayName}</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </header>

        <main id="sakums" className="dashboard-content">
          {notice && (
            <div className="dashboard-notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Aizvērt">
                ×
              </button>
            </div>
          )}

          <section className="welcome-banner">
            <div className="welcome-copy">
              <span className="dashboard-eyebrow">Laipni lūgts!</span>
              <h1>Sveiks, {displayName}!</h1>
              <p>Iedvesmojies, veido un dalies ar savām idejām.</p>
            </div>

            <div className="welcome-photo" role="img" aria-label="Mājīga radoša darba vieta ar krūzīti, augu un darbarīkiem">
              <div className="welcome-note">
                Lielas idejas
                <br />
                sākas ar
                <br />
                mazām detaļām.
                <span>〰</span>
              </div>
            </div>
          </section>

          <section className="dashboard-category-section">
            <div className="category-list" aria-label="Projektu kategorijas">
              {categories.map((category) => (
                <button
                  key={category.name}
                  className={`category-button ${
                    activeCategory === category.name ? 'selected' : ''
                  }`}
                  onClick={() => setActiveCategory(category.name)}
                  aria-pressed={activeCategory === category.name}
                >
                  <category.icon className="category-icon" />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            <button
              className="dashboard-primary-button create-project-button"
              onClick={() =>
                setNotice(
                  'Projektu izveides formu izveidosim nākamajā solī.',
                )
              }
            >
              <span>＋</span> Izveidot projektu
            </button>
          </section>

          <section className="dashboard-projects" id="projekti">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-eyebrow">Atrodi iedvesmu</span>
                <h2>
                  {search || activeCategory !== 'Visas kategorijas'
                    ? 'Atrasti projekti'
                    : 'Jaunākie projekti'}
                </h2>
              </div>

              <span className="project-count">
                {filteredProjects.length} projekti
              </span>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="dashboard-project-grid">
                {filteredProjects.map((project) => (
                  <article
                    className="dashboard-project-card"
                    key={project.title}
                  >
                    <div className="dashboard-project-image">
                      <img src={project.image} alt={project.title} loading="lazy" />
                      <span
                        className={`dashboard-status status-${project.status === 'Pabeigts' ? 'done' : project.status === 'Procesā' ? 'progress' : 'planned'}`}
                      >
                        <span />
                        {project.status}
                      </span>
                    </div>

                    <div className="dashboard-project-info">
                      <span className="dashboard-project-category">
                        {project.category}
                      </span>
                      <h3>{project.title}</h3>

                      <div className="dashboard-project-footer">
                        <span className="project-author">
                          <span className="author-avatar">
                            {project.author.charAt(0)}
                          </span>
                          {project.author}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <span>⌕</span>
                <h3>Projektus neizdevās atrast</h3>
                <p>Pamēģini citu meklēšanas vārdu vai kategoriju.</p>
                <button
                  className="dashboard-secondary-button"
                  onClick={() => {
                    setSearch('')
                    setActiveCategory('Visas kategorijas')
                  }}
                >
                  Rādīt visus projektus
                </button>
              </div>
            )}
          </section>

          <footer className="dashboard-footer">
            Do It Lab — idejām, kas pelnījušas kļūt īstas.
          </footer>
        </main>
      </div>
    </div>
  )
}
