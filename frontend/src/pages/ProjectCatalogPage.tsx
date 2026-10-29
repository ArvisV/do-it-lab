
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import {
  House,
  FolderSearch,
  CirclePlus,
  Bookmark,
  Heart,
  UserRound,
  Leaf,
  Sprout,
  Cpu,
  Palette,
  Hammer,
  SlidersHorizontal,
  CalendarDays,
  Search,
  X,
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

const categories = [
  { name: 'Visi projekti', icon: FolderSearch },
  { name: 'Koks un amatniecība', icon: Hammer },
  { name: 'DIY un māja', icon: House },
  { name: 'Dārzs un daba', icon: Leaf },
  { name: 'Elektronika', icon: Cpu },
  { name: 'Radošie darbi', icon: Palette },
]

function getAuthor(project: Project) {
  return (
    project.user?.displayName ||
    project.user?.name ||
    project.author ||
    project.user?.email?.split('@')[0] ||
    'Do It Lab lietotājs'
  )
}

function getImageUrl(imagePath?: string | null) {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath

  return `http://localhost:5000/${imagePath.replace(/^\/+/, '')}`
}

export default function ProjectCatalogPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Visi projekti')
  const [favorites, setFavorites] = useState<string[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadProjects() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/projects`)

        if (!response.ok) {
          throw new Error('Neizdevās ielādēt publiskos projektus.')
        }

        const data = await response.json()

        if (active) {
          setProjects(data.projects ?? [])
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Radās neparedzēta kļūda.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProjects()

    return () => {
      active = false
    }
  }, [])

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

  function toggleFavorite(projectId: string) {
    setFavorites((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    )

    setNotice(
      favorites.includes(projectId)
        ? 'Projekts noņemts no pagaidu favorītu atzīmēm.'
        : 'Projekts atzīmēts kā favorīts. Šī atzīme vēl netiek saglabāta datubāzē.',
    )
  }

  function handleProfile() {
    setNotice('Profila lapu pievienosim nākamajā izstrādes solī.')
  }

  return (
    <div className="catalog-shell">
      <aside className="catalog-sidebar">
        <div className="catalog-logo">
          <Logo />
        </div>

        <nav className="catalog-nav" aria-label="Lietotāja navigācija">
          <button
            className="catalog-nav-link"
            onClick={() => navigate('/dashboard')}
          >
            <House className="catalog-nav-icon" />
            <span>Sākums</span>
          </button>

          <button
            className="catalog-nav-link active"
            onClick={() => navigate('/projects')}
          >
            <FolderSearch className="catalog-nav-icon" />
            <span>Projektu katalogs</span>
          </button>

          <button
            className="catalog-nav-link"
            onClick={() => navigate('/projects/new')}
          >
            <CirclePlus className="catalog-nav-icon" />
            <span>Izveidot projektu</span>
          </button>

          <button
            className="catalog-nav-link"
            onClick={() => navigate('/projects/mine')}
          >
            <Bookmark className="catalog-nav-icon" />
            <span>Mani projekti</span>
          </button>

          <button
            className="catalog-nav-link"
            onClick={() => navigate('/projects/saved')}
          >
            <Heart className="catalog-nav-icon" />
            <span>Saglabātie</span>
          </button>

          <button className="catalog-nav-link" onClick={handleProfile}>
            <UserRound className="catalog-nav-icon" />
            <span>Profils</span>
          </button>
        </nav>

        <div className="catalog-sidebar-bottom">
          <div className="catalog-sidebar-motto">
            RADI.
            <br />
            MĀCIES.
            <br />
            DALIES.
          </div>

          <button
            className="catalog-logout-button"
            onClick={() => navigate('/dashboard')}
          >
            <House size={19} />
            Atpakaļ uz sākumu
          </button>
        </div>
      </aside>

      <main className="catalog-main">
        <header className="catalog-topbar">
          <button
            className="catalog-back-button"
            onClick={() => navigate('/dashboard')}
          >
            <House size={18} />
            Sākums
          </button>

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
          <span className="catalog-eyebrow">PROJEKTU KATALOGS</span>
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
              <span className="catalog-eyebrow">IDEJAS KOPIENAI</span>
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
          <div className="catalog-notice" role="status">
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
              const imageUrl = getImageUrl(project.imagePath)
              const isFavorite = favorites.includes(project.id)

              return (
                <article className="catalog-project-card" key={project.id}>
                  <div className="catalog-project-image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={project.title} loading="lazy" />
                    ) : (
                      <div className="catalog-image-placeholder">
                        <Leaf size={36} />
                      </div>
                    )}

                    <button
                      className={`catalog-favorite-button ${
                        isFavorite ? 'is-favorite' : ''
                      }`}
                      aria-label={
                        isFavorite
                          ? 'Noņemt no favorītiem'
                          : 'Pievienot favorītiem'
                      }
                      aria-pressed={isFavorite}
                      onClick={() => toggleFavorite(project.id)}
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
                        setNotice(
                          'Detalizēto projekta apskates lapu izveidosim nākamajā solī.',
                        )
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
    </div>
  )
}
