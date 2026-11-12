
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  House,
  FolderSearch,
  Heart,
  UserRound,
  Leaf,
  Cpu,
  Palette,
  Hammer,
  CalendarDays,
  Search,
  X,
  Sprout,
  Folder,
} from 'lucide-react'
import './ProjectCatalogPage.css'

const API_URL = 'http://localhost:5000/api'

type Project = {
  id: string
  title: string
  description: string
  imagePath?: string | null
  createdAt: string
  category?: {
    name: string
  } | null
  user?: {
    name?: string | null
    displayName?: string | null
    email?: string | null
  } | null
  author?: string
  _count?: {
    steps: number
  }
}

type AuthUser = {
  id: string
  email: string
}

type Favorite = {
  projectId: string
  project?: {
    id: string
  }
}

const categories = [
  { name: 'Visi projekti', icon: FolderSearch },
  { name: 'Koks un amatniecība', icon: Hammer },
  { name: 'DIY un māja', icon: House },
  { name: 'Dārzs un daba', icon: Sprout },
  { name: 'Elektronika', icon: Cpu },
  { name: 'Radošie darbi', icon: Palette },
  { name: 'Citi projekti', icon: Folder },
]

function getAuthor(project: Project) {
  return (
    project.user?.displayName?.trim() ||
    'Do It Lab lietotājs'
  )
}

// Veidojam attēla adresi caur jauno attēlu API.
function getProjectCoverUrl(project: Project) {
  if (!project.imagePath) return null

  return `${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`
}

// Atsevišķs komponents katra projekta titulattēlam.
function CatalogProjectImage({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false)

  const imageUrl = getProjectCoverUrl(project)

  if (!imageUrl || failed) {
    return (
      <div className="catalog-image-placeholder">
        <Leaf size={36} />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={project.title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default function ProjectCatalogPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Visi projekti')

  // Favorīti no datubāzes.
  const [favorites, setFavorites] = useState<string[]>([])
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [savingFavoriteIds, setSavingFavoriteIds] = useState<string[]>([])

  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Ielādējam publiskos projektus.
  useEffect(() => {
    const controller = new AbortController()

    async function loadProjects() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/projects`, {
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Neizdevās ielādēt publiskos projektus.',
          )
        }

        if (!Array.isArray(data.projects)) {
          throw new Error('Saņemts nederīgs projektu saraksts.')
        }

        setProjects(data.projects)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Radās neparedzēta kļūda.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadProjects()

    return () => controller.abort()
  }, [])

  // Pārbaudām lietotāja sesiju un ielādējam viņa favorītus.
  useEffect(() => {
    const controller = new AbortController()

    async function loadUserAndFavorites() {
      setAuthChecking(true)

      try {
        const authResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        // Apmeklētājs nav ielogojies.
        if (authResponse.status === 401) {
          setAuthUser(null)
          setFavorites([])
          return
        }

        const authData = await authResponse.json()

        if (!authResponse.ok || !authData.user) {
          throw new Error(
            authData.message || 'Neizdevās pārbaudīt lietotāja sesiju.',
          )
        }

        setAuthUser(authData.user)

        // Ielādējam konkrētā lietotāja favorītus.
        const favoritesResponse = await fetch(`${API_URL}/favorites`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (favoritesResponse.status === 401) {
          setAuthUser(null)
          setFavorites([])
          return
        }

        const favoritesData = await favoritesResponse.json()

        if (!favoritesResponse.ok) {
          throw new Error(
            favoritesData.message || 'Neizdevās ielādēt favorītus.',
          )
        }

        const favoriteItems: Favorite[] = Array.isArray(
          favoritesData.favorites,
        )
          ? favoritesData.favorites
          : []

        const favoriteIds = favoriteItems
          .map((favorite) => {
            return favorite.projectId || favorite.project?.id
          })
          .filter((projectId): projectId is string => {
            return typeof projectId === 'string'
          })

        setFavorites(favoriteIds)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setNotice(
          err instanceof Error
            ? err.message
            : 'Neizdevās ielādēt lietotāja favorītus.',
        )
        setNoticeIsError(true)
      } finally {
        if (!controller.signal.aborted) {
          setAuthChecking(false)
        }
      }
    }

    void loadUserAndFavorites()

    return () => controller.abort()
  }, [])

  // Projektu meklēšana un filtrēšana pēc kategorijas.
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projects.filter((project) => {
      const categoryName = project.category?.name ?? ''

      const matchesCategory =
        activeCategory === 'Visi projekti' ||
        categoryName === activeCategory

      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query) ||
        getAuthor(project).toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [projects, search, activeCategory])

  // Pievienojam vai noņemam projektu no datubāzes favorītiem.
  async function toggleFavorite(projectId: string) {
    if (savingFavoriteIds.includes(projectId)) {
      return
    }

    setNotice('')
    setNoticeIsError(false)

    // Viesim parādām reģistrācijas/pieteikšanās logu.
    if (!authUser) {
      if (authChecking) {
        setNotice('Pārbaudām lietotāja sesiju. Mēģini vēlreiz.')
        return
      }

      setShowAuthModal(true)
      return
    }

    const isFavorite = favorites.includes(projectId)

    setSavingFavoriteIds((current) => [...current, projectId])

    try {
      const response = await fetch(
        `${API_URL}/favorites/${encodeURIComponent(projectId)}`,
        {
          method: isFavorite ? 'DELETE' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const data = await response.json()

      // Sesijas derīguma termiņš var būt beidzies.
      if (response.status === 401) {
        setAuthUser(null)
        setFavorites([])
        setShowAuthModal(true)
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Neizdevās mainīt favorītu statusu.',
        )
      }

      const saved = Boolean(data.isSaved)

      setFavorites((current) => {
        if (saved) {
          return current.includes(projectId)
            ? current
            : [...current, projectId]
        }

        return current.filter((id) => id !== projectId)
      })

      setNotice(
        data.message ||
          (saved
            ? 'Projekts pievienots favorītiem.'
            : 'Projekts noņemts no favorītiem.'),
      )

      setNoticeIsError(false)
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : 'Neizdevās sazināties ar serveri.',
      )
      setNoticeIsError(true)
    } finally {
      setSavingFavoriteIds((current) =>
        current.filter((id) => id !== projectId),
      )
    }
  }

  function openRegister() {
    navigate(
      `/register?returnTo=${encodeURIComponent('/projects')}`,
    )
  }

  function openLogin() {
    navigate(
      `/login?returnTo=${encodeURIComponent('/projects')}`,
    )
  }

  return (
    <>
      <main className="catalog-main">
        <header className="catalog-topbar">
          <label className="catalog-search">
            <Search size={20} aria-hidden="true" />

            <input
              type="search"
              placeholder="Meklēt projektus..."
              aria-label="Meklēt projektus"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                aria-label="Notīrīt meklēšanu"
                onClick={() => setSearch('')}
              >
                <X size={18} />
              </button>
            )}
          </label>
        </header>

        <section className="catalog-heading">
          <span className="catalog-eyebrow">
            PROJEKTU KATALOGS
          </span>

          <h1>Atklāj un iedvesmojies</h1>

          <p>
            Apskati citu lietotāju publicētos projektus, smelies idejas
            un saglabā sev interesējošos projektus.
          </p>
        </section>

        <section className="catalog-category-section">
          <div
            className="catalog-category-list"
            aria-label="Projektu kategorijas"
          >
            {categories.map((category) => (
              <button
                key={category.name}
                className={`catalog-category-button ${
                  activeCategory === category.name ? 'selected' : ''
                }`}
                onClick={() => setActiveCategory(category.name)}
                aria-pressed={activeCategory === category.name}
              >
                <category.icon size={19} />
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          <div className="catalog-results-heading">
            <div>
              <span className="catalog-eyebrow">
                IDEJAS KOPIENAI
              </span>

              <h2>
                {search || activeCategory !== 'Visi projekti'
                  ? 'Atrasti projekti'
                  : 'Publiskie projekti'}
              </h2>
            </div>

            <span className="catalog-results-count">
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'projekts' : 'projekti'}
            </span>
          </div>
        </section>

        {notice && (
          <div
            className={`catalog-notice ${
              noticeIsError ? 'catalog-notice-error' : ''
            }`}
            role={noticeIsError ? 'alert' : 'status'}
          >
            <span>{notice}</span>

            <button
              onClick={() => setNotice('')}
              aria-label="Aizvērt paziņojumu"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="catalog-message catalog-error" role="alert">
            <p>{error}</p>

            <button onClick={() => window.location.reload()}>
              Mēģināt vēlreiz
            </button>
          </div>
        )}

        {loading ? (
          <div className="catalog-message">
            <span className="catalog-spinner" />
            <p>Ielādē publiskos projektus...</p>
          </div>
        ) : !error && filteredProjects.length === 0 ? (
          <div className="catalog-empty">
            <FolderSearch size={42} />

            <h3>
              {projects.length === 0
                ? 'Pagaidām nav publicētu projektu'
                : 'Projektus neizdevās atrast'}
            </h3>

            <p>
              {projects.length === 0
                ? 'Kad lietotāji publicēs savus projektus, tie būs redzami šeit.'
                : 'Pamēģini citu meklēšanas vārdu vai kategoriju.'}
            </p>

            {(search || activeCategory !== 'Visi projekti') && (
              <button
                className="catalog-reset-button"
                onClick={() => {
                  setSearch('')
                  setActiveCategory('Visi projekti')
                }}
              >
                Rādīt visus projektus
              </button>
            )}
          </div>
        ) : (
          <section className="catalog-project-grid">
            {filteredProjects.map((project) => {
              const isFavorite = favorites.includes(project.id)
              const isSaving = savingFavoriteIds.includes(project.id)

              return (
                <article
                  className="catalog-project-card"
                  key={project.id}
                >
                  <div className="catalog-project-image">
                    <CatalogProjectImage project={project} />

                    <button
                      type="button"
                      className={`catalog-favorite-button ${
                        isFavorite ? 'is-favorite' : ''
                      }`}
                      aria-label={
                        isFavorite
                          ? 'Noņemt no favorītiem'
                          : 'Pievienot favorītiem'
                      }
                      aria-pressed={isFavorite}
                      disabled={isSaving || authChecking}
                      onClick={() => void toggleFavorite(project.id)}
                    >
                      <Heart
                        size={23}
                        fill={isFavorite ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div className="catalog-project-info">
                    <span className="catalog-project-category">
                      {project.category?.name ?? 'Bez kategorijas'}
                    </span>

                    <h3>{project.title}</h3>

                    <p className="catalog-project-description">
                      {project.description}
                    </p>

                    <div className="catalog-project-meta">
                      <span title="Projekta autors">
                        <UserRound size={17} />
                        {getAuthor(project)}
                      </span>

                      <span title="Izveidošanas datums">
                        <CalendarDays size={17} />
                        {new Date(project.createdAt).toLocaleDateString(
                          'lv-LV',
                        )}
                      </span>
                    </div>

                    <button
                      className="catalog-view-button"
                      onClick={() =>
                        navigate(`/projects/${project.id}`)
                      }
                    >
                      Apskatīt projektu
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        <footer className="catalog-footer">
          Do It Lab — idejām, kas pelnījušas kļūt īstas.
        </footer>
      </main>

      {/* Reģistrācijas un pieteikšanās logs viesiem */}
      {showAuthModal && (
        <div
          className="catalog-auth-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuthModal(false)
            }
          }}
        >
          <section
            className="catalog-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-auth-title"
          >
            <button
              type="button"
              className="catalog-auth-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Aizvērt logu"
            >
              <X size={20} />
            </button>

            <div className="catalog-auth-icon">
              <Heart size={26} />
            </div>

            <h2 id="catalog-auth-title">
              Saglabā projektus, kas tevi iedvesmo!
            </h2>

            <p>
              Izveido Do It Lab kontu vai piesakies, lai saglabātu
              interesējošos projektus savā izlasē.
            </p>

            <div className="catalog-auth-actions">
              <button
                type="button"
                className="catalog-auth-register"
                onClick={openRegister}
              >
                Reģistrēties
              </button>

              <button
                type="button"
                className="catalog-auth-login"
                onClick={openLogin}
              >
                Jau ir konts? Pieteikties
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
