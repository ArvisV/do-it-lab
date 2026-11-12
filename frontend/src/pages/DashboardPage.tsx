
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf,
  Sprout,
  Cpu,
  Palette,
  Hammer,
  House,
  Folder,
  type LucideIcon,
} from 'lucide-react'

import './DashboardPage.css'

const API_URL = 'http://localhost:5000/api'

type User = {
  id: string
  email: string
  displayName?: string | null
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
  user?: {
  id?: string
  email?: string | null
  displayName?: string | null
} | null
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
  const displayName = project.user?.displayName?.trim()

  if (displayName) {
    return displayName
  }

  const email = project.user?.email?.trim()

  if (email) {
    return email.split('@')[0] || 'Do It Lab lietotājs'
  }

  return 'Do It Lab lietotājs'
}

function getProjectImageUrl(project: PublicProject) {
  if (!project.imagePath) return null

  return `${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`
}

function DashboardProjectImage({
  project,
}: {
  project: PublicProject
}) {
  const [imageError, setImageError] = useState(false)

  const imageUrl = getProjectImageUrl(project)

  useEffect(() => {
    setImageError(false)
  }, [imageUrl])

  if (!imageUrl || imageError) {
    return (
      <div className="dashboard-project-placeholder">
        <Leaf size={36} />
        <span>
          {project.imagePath
            ? 'Attēlu neizdevās ielādēt'
            : 'Projekta attēls vēl nav pievienots'}
        </span>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={project.title}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState<PublicProject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState('')

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

  // Projektu filtrēšana pēc izvēlētās kategorijas.
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const categoryName = project.category?.name ?? ''

      return (
        activeCategory === 'Visas kategorijas' ||
        categoryName === activeCategory
      )
    })
  }, [projects, activeCategory])

  const displayName =
    user?.displayName?.trim() ||
    user?.email.split('@')[0] ||
    'lietotāj'

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
    <div className="dashboard-content" id="sakums">
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
              {activeCategory !== 'Visas kategorijas'
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
            {filteredProjects.slice(0, 8).map((project) => {
              const authorName = getAuthor(project)

              return (
                <article
                  className="dashboard-project-card"
                  key={project.id}
                >
                  <div className="dashboard-project-image">
                    <DashboardProjectImage project={project} />
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
                          {authorName.charAt(0).toUpperCase()}
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
                : 'Šajā kategorijā projektu nav'}
            </h3>

            <p>
              {projects.length === 0
                ? 'Kad lietotāji publicēs projektus, tie būs redzami šeit.'
                : 'Izvēlies citu kategoriju, lai apskatītu citus projektus.'}
            </p>

            {activeCategory !== 'Visas kategorijas' && (
              <button
                className="dashboard-secondary-button"
                onClick={() =>
                  setActiveCategory('Visas kategorijas')
                }
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
    </div>
  )
}
