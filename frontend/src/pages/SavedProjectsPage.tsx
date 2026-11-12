import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  FolderHeart,
  Heart,
  Leaf,
  UserRound,
  X,
} from 'lucide-react'

import './ProjectCatalogPage.css'
import './SavedProjectsPage.css'

const API_URL = 'http://localhost:5000/api'

type SavedProject = {
  id: string
  title: string
  description: string
  imagePath: string | null
  createdAt: string
  category?: {
    id?: string
    name: string
  } | null
  user?: {
    id?: string
    email?: string | null
  } | null
  _count?: {
    steps?: number
  }
}

type FavoriteItem = {
  id: string
  projectId: string
  createdAt: string
  project?: SavedProject | null
}

function getAuthor(project: SavedProject) {
  const email = project.user?.email?.trim()

  return email
    ? email.split('@')[0] || 'Do It Lab lietotājs'
    : 'Do It Lab lietotājs'
}

// Titulbildi ielādējam caur drošo backend maršrutu.
function SavedProjectCover({ project }: { project: SavedProject }) {
  const [imageFailed, setImageFailed] = useState(false)

  const imageUrl = project.imagePath
    ? `${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`
    : null

  if (!imageUrl || imageFailed) {
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
      crossOrigin="use-credentials"
      onError={() => setImageFailed(true)}
    />
  )
}

export default function SavedProjectsPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<SavedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [removingIds, setRemovingIds] = useState<string[]>([])
  const [notice, setNotice] = useState('')

  // Ielādējam pašreizējā lietotāja saglabātos projektus.
  useEffect(() => {
    const controller = new AbortController()

    async function loadFavorites() {
      setLoading(true)
      setError('')
      setAuthRequired(false)

      try {
        const response = await fetch(`${API_URL}/favorites`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (response.status === 401) {
          setAuthRequired(true)
          setProjects([])
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Neizdevās ielādēt saglabātos projektus.',
          )
        }

        const favorites: FavoriteItem[] = Array.isArray(data.favorites)
          ? data.favorites
          : []

        const savedProjects = favorites
          .map((favorite) => favorite.project)
          .filter(
            (project): project is SavedProject =>
              Boolean(project && project.id),
          )

        setProjects(savedProjects)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Neizdevās sazināties ar serveri.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadFavorites()

    return () => controller.abort()
  }, [])

  // Noņem projektu no favorītiem.
  async function removeFavorite(projectId: string) {
    if (removingIds.includes(projectId)) return

    setNotice('')
    setRemovingIds((current) => [...current, projectId])

    try {
      const response = await fetch(
        `${API_URL}/favorites/${encodeURIComponent(projectId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setAuthRequired(true)
        setProjects([])
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Neizdevās noņemt projektu no favorītiem.',
        )
      }

      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      )
      setNotice('Projekts noņemts no saglabātajiem.')
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : 'Neizdevās sazināties ar serveri.',
      )
    } finally {
      setRemovingIds((current) =>
        current.filter((id) => id !== projectId),
      )
    }
  }

  function goToLogin() {
    navigate(`/login?returnTo=${encodeURIComponent('/projects/saved')}`)
  }

  function goToRegister() {
    navigate(`/register?returnTo=${encodeURIComponent('/projects/saved')}`)
  }

  return (
    <main className="catalog-main saved-projects-main">
      <section className="saved-page-heading">
        <span className="catalog-eyebrow">TAVA PERSONĪGĀ IZLASE</span>

        <div className="saved-page-title-row">
          <div>
            <h1>Mani saglabātie projekti</h1>
            <p>
              Visi projekti, kurus esi saglabājis un vēlies apskatīt
              vēlreiz.
            </p>
          </div>

          <div className="saved-page-count" aria-label={`${projects.length} saglabāti projekti`}>
            <Heart size={19} />
            <span>{projects.length}</span>
          </div>
        </div>
      </section>

      {notice && (
        <div className="catalog-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Aizvērt paziņojumu"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="catalog-message">
          <span className="catalog-spinner" />
          <p>Ielādē tavus saglabātos projektus...</p>
        </div>
      ) : authRequired ? (
        <div className="catalog-empty saved-page-empty">
          <Heart size={42} />
          <h3>Lai apskatītu saglabātos projektus, piesakies!</h3>
          <p>
            Tavi saglabātie projekti ir piesaistīti lietotāja kontam.
            Piesakies, lai tiem piekļūtu.
          </p>

          <div className="saved-page-auth-actions">
            <button
              type="button"
              className="catalog-view-button"
              onClick={goToLogin}
            >
              Pieteikties
            </button>
            <button
              type="button"
              className="catalog-reset-button"
              onClick={goToRegister}
            >
              Reģistrēties
            </button>
          </div>
        </div>
      ) : error ? (
        <div className="catalog-message catalog-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Mēģināt vēlreiz
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="catalog-empty saved-page-empty">
          <FolderHeart size={46} />
          <h3>Pagaidām šeit nekā nav</h3>
          <p>
            Kad projektu katalogā atradīsi ko interesantu, nospied
            sirsniņu, lai saglabātu projektu šeit.
          </p>
          <button
            type="button"
            className="catalog-reset-button"
            onClick={() => navigate('/projects')}
          >
            <Heart size={17} />
            Apskatīt projektu katalogu
          </button>
        </div>
      ) : (
        <>
          <div className="saved-page-results-heading">
            <div>
              <span className="catalog-eyebrow">TAVA IZLASE</span>
              <h2>Saglabātie projekti</h2>
            </div>
            <span className="catalog-results-count">
              {projects.length}{' '}
              {projects.length === 1 ? 'projekts' : 'projekti'}
            </span>
          </div>

          <section className="catalog-project-grid">
            {projects.map((project) => {
              const isRemoving = removingIds.includes(project.id)

              return (
                <article className="catalog-project-card" key={project.id}>
                  <div className="catalog-project-image">
                    <Link
                      to={`/projects/${project.id}`}
                      className="saved-project-image-link"
                      aria-label={`Apskatīt projektu: ${project.title}`}
                    >
                      <SavedProjectCover project={project} />
                    </Link>

                    <button
                      type="button"
                      className="catalog-favorite-button is-favorite"
                      aria-label="Noņemt no saglabātajiem"
                      disabled={isRemoving}
                      onClick={() => void removeFavorite(project.id)}
                    >
                      <Heart size={23} fill="currentColor" />
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
                        {new Date(project.createdAt).toLocaleDateString('lv-LV')}
                      </span>
                    </div>

                    <Link
                      className="catalog-view-button saved-project-view-link"
                      to={`/projects/${project.id}`}
                    >
                      Apskatīt projektu
                    </Link>
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}

      <footer className="catalog-footer">
        Do It Lab — idejām, kas pelnījušas kļūt īstas.
      </footer>
    </main>
  )
}
