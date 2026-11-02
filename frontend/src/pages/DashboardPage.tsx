
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
  type LucideIcon,
} from 'lucide-react'

const API_URL = 'http://localhost:5000/api'

type User = {
  id: string
  email: string
}

type Category = {
  id: string
  name: string
}

type PublicProject = {
  id: string
  title: string
  description: string
  imagePath: string | null
  createdAt: string
  category: Category | null
  user: {
    id: string
    email: string
  }
  _count?: {
    steps: number
  }
}

const categoryIcons: Record<string, LucideIcon> = {
  'Koks un amatniecība': Hammer,
  'Dārzs un daba': Sprout,
  Elektronika: Cpu,
  'DIY un māja': House,
  'Radošie darbi': Palette,
  'Citi projekti': Leaf,
}

function getAuthor(project: PublicProject) {
  return project.user.email.split('@')[0] || 'Do It Lab lietotājs'
}

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null

  if (imagePath.startsWith('http')) {
    return imagePath
  }

  return `http://localhost:5000/${imagePath.replace(/^\/+/, '')}`
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState<PublicProject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState('')

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] =
    useState('Visas kategorijas')

  const [notice, setNotice] = useState('')

  // Pārbauda lietotāja sesiju.
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

    void loadUser()

    return () => {
      active = false
    }
  }, [navigate])

  // Ielādē publiskos projektus un kategorijas no datubāzes.
  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      setProjectsLoading(true)
      setProjectsError('')

      try {
        const [projectsResponse, categoriesResponse] =
          await Promise.all([
            fetch(`${API_URL}/projects`),
            fetch(`${API_URL}/categories`),
          ])

        if (!projectsResponse.ok) {
          throw new Error(
            'Neizdevās ielādēt publiskos projektus.',
          )
        }

        if (!categoriesResponse.ok) {
          throw new Error(
            'Neizdevās ielādēt projektu kategorijas.',
          )
        }

        const projectsData = await projectsResponse.json()
        const categoriesData = await categoriesResponse.json()

        if (!Array.isArray(projectsData.projects)) {
          throw new Error('Saņemts nederīgs projektu saraksts.')
        }

        if (!Array.isArray(categoriesData.categories)) {
          throw new Error('Saņemts nederīgs kategoriju saraksts.')
        }

        if (active) {
          setProjects(projectsData.projects)
          setCategories(categoriesData.categories)
        }
      } catch (err) {
        if (active) {
          setProjectsError(
            err instanceof Error
              ? err.message
              : 'Neizdevās ielādēt datus no servera.',
          )
        }
      } finally {
        if (active) {
          setProjectsLoading(false)
        }
      }
    }

    void loadDashboardData()

    return () => {
      active = false
    }
  }, [])

  // Kategoriju sarakstam pievieno ikonas.
  const categoryFilters = useMemo(
    () => [
      {
        name: 'Visas kategorijas',
        icon: Leaf,
      },
      ...categories.map((category) => ({
        name: category.name,
        icon: categoryIcons[category.name] ?? Folder,
      })),
    ],
    [categories],
  )

  // Projektu meklēšana un filtrēšana.
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projects.filter((project) => {
      const categoryName = project.category?.name ?? ''
      const authorName = getAuthor(project)

      const matchesCategory =
        activeCategory === 'Visas kategorijas' ||
        categoryName === activeCategory

      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query) ||
        authorName.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [projects, search, activeCategory])

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

  // Lietotāja ielādes laikā.
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

        <nav
          className="dashboard-nav"
          aria-label="Lietotāja navigācija"
        >
          <button
            className="dashboard-nav-link active"
            onClick={() => navigate('/dashboard')}
          >
            <House className="nav-icon" />
            <span>Sākums</span>
          </button>

          <button
            className="dashboard-nav-link"
            onClick={() => navigate('/projects')}
          >
            <Folder className="nav-icon" />
            <span>Projektu katalogs</span>
          </button>

          <button
            className="dashboard-nav-link"
            onClick={() => navigate('/projects/new')}
          >
            <CirclePlus className="nav-icon" />
            <span>Izveidot projektu</span>
          </button>

          <button
            className="dashboard-nav-link"
            onClick={() => navigate('/projects/mine')}
          >
            <Bookmark className="nav-icon" />
            <span>Mani projekti</span>
          </button>

          <button
            className="dashboard-nav-link"
            onClick={() =>
              setNotice(
                'Saglabāto projektu sadaļu pievienosim nākamajā izstrādes solī.',
              )
            }
          >
            <Heart className="nav-icon" />
            <span>Saglabātie</span>
          </button>

          <button
            className="dashboard-nav-link"
            onClick={() =>
              setNotice(`Tavs konts: ${user.email}`)
            }
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

          <button
            className="logout-button"
            onClick={handleLogout}
          >
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
              <button
                onClick={() => setNotice('')}
                aria-label="Aizvērt"
              >
                ×
              </button>
            </div>
          )}

          <section className="welcome-banner">
            <div className="welcome-copy">
              <span className="dashboard-eyebrow">
                Laipni lūgts!
              </span>

              <h1>Sveiks, {displayName}!</h1>

              <p>
                Iedvesmojies, veido un dalies ar savām idejām.
              </p>
            </div>

            <div
              className="welcome-photo"
              role="img"
              aria-label="Mājīga radoša darba vieta ar krūzīti, augu un darbarīkiem"
            >
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
            <div
              className="category-list"
              aria-label="Projektu kategorijas"
            >
              {categoryFilters.map((category) => {
                const CategoryIcon = category.icon

                return (
                  <button
                    key={category.name}
                    className={`category-button ${
                      activeCategory === category.name
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setActiveCategory(category.name)
                    }
                    aria-pressed={
                      activeCategory === category.name
                    }
                  >
                    <CategoryIcon className="category-icon" />
                    <span>{category.name}</span>
                  </button>
                )
              })}
            </div>

            <button
              className="dashboard-primary-button create-project-button"
              onClick={() => navigate('/projects/new')}
            >
              <span>＋</span> Izveidot projektu
            </button>
          </section>

          <section className="dashboard-projects" id="projekti">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-eyebrow">
                  Atrodi iedvesmu
                </span>

                <h2>
                  {search ||
                  activeCategory !== 'Visas kategorijas'
                    ? 'Atrasti projekti'
                    : 'Jaunākie projekti'}
                </h2>
              </div>

              <span className="project-count">
                {filteredProjects.length}{' '}
                {filteredProjects.length === 1
                  ? 'projekts'
                  : 'projekti'}
              </span>
            </div>

            {projectsLoading ? (
              <div className="dashboard-empty">
                <span className="loading-spinner" />
                <p>Ielādē publiskos projektus...</p>
              </div>
            ) : projectsError ? (
              <div className="dashboard-empty" role="alert">
                <h3>Neizdevās ielādēt projektus</h3>
                <p>{projectsError}</p>

                <button
                  className="dashboard-secondary-button"
                  onClick={() => window.location.reload()}
                >
                  Mēģināt vēlreiz
                </button>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="dashboard-project-grid">
                {filteredProjects.map((project) => {
                  const imageUrl = getImageUrl(project.imagePath)
                  const authorName = getAuthor(project)

                  return (
                    <article
                      className="dashboard-project-card"
                      key={project.id}
                    >
                      <div className="dashboard-project-image">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={project.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="dashboard-project-placeholder">
                            <Leaf size={36} />
                            <span>
                              Projekta attēls vēl nav pievienots
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="dashboard-project-info">
                        <span className="dashboard-project-category">
                          {project.category?.name ??
                            'Bez kategorijas'}
                        </span>

                        <h3>{project.title}</h3>

                        <p className="dashboard-project-description">
                          {project.description}
                        </p>

                        <div className="dashboard-project-footer">
                          <span className="project-author">
                            <span className="author-avatar">
                              {authorName
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                            {authorName}
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <span>⌕</span>

                <h3>
                  {projects.length === 0
                    ? 'Pagaidām nav publicētu projektu'
                    : 'Projektus neizdevās atrast'}
                </h3>

                <p>
                  {projects.length === 0
                    ? 'Kad lietotāji publicēs projektus, tie būs redzami šeit.'
                    : 'Pamēģini citu meklēšanas vārdu vai kategoriju.'}
                </p>

                {(search ||
                  activeCategory !== 'Visas kategorijas') && (
                  <button
                    className="dashboard-secondary-button"
                    onClick={() => {
                      setSearch('')
                      setActiveCategory('Visas kategorijas')
                    }}
                  >
                    Rādīt visus projektus
                  </button>
                )}
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
