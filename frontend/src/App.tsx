
import { useEffect, useState, type ReactNode } from 'react'
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom'

import {
  ArrowRight,
  Leaf,
} from 'lucide-react'

import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'
import MyProjectsPage from './pages/MyProjectsPage'
import ProjectCatalogPage from './pages/ProjectCatalogPage'
import ProjectDetailsPage from './pages/ProjectDetailsPage'
import SavedProjectsPage from './pages/SavedProjectsPage'
import ProjectManagementPage from './pages/ProjectManagementPage'

import Logo from './components/Logo'
import './App.css'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ProfilePage from './pages/ProfilePage'
import PublicProjectCatalogPage from './pages/PublicProjectCatalogPage'
import AppLayout from './components/AppLayout'

const API_URL = 'http://localhost:5000/api'

type PublicProject = {
  id: string
  title: string
  description: string
  imagePath: string | null
  createdAt: string
  category: {
    id: string
    name: string
  } | null
  user: {
    id: string
    displayName: string | null
  }
}

// =====================================================
// AIZSARGĀTIE MARŠRUTI
// =====================================================

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()

  const [status, setStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated' | 'error'
  >('checking')

  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function checkSession() {
      setStatus('checking')

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        })

        if (response.status === 401) {
          if (active) {
            setStatus('unauthenticated')
          }
          return
        }

        const data = await response.json()

        if (!response.ok || !data.user) {
          throw new Error(
            data.message || 'Neizdevās pārbaudīt lietotāja sesiju.',
          )
        }

        if (active) {
          setStatus('authenticated')
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setStatus('error')
        }
      }
    }

    void checkSession()

    return () => {
      active = false
      controller.abort()
    }
  }, [retryKey])

  if (status === 'checking') {
    return (
      <div className="public-projects-message">
        <p>Pārbaudām lietotāja piekļuvi...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    )
  }

  if (status === 'error') {
    return (
      <div className="public-projects-message">
        <h3>Neizdevās pārbaudīt lietotāja sesiju</h3>

        <p>
          Pārbaudi, vai backend serveris darbojas, un mēģini vēlreiz.
        </p>

        <button
          className="button button-secondary"
          type="button"
          onClick={() => setRetryKey((current) => current + 1)}
        >
          Mēģināt vēlreiz
        </button>

        <Link to="/" className="login-link">
          Atgriezties sākumlapā
        </Link>
      </div>
    )
  }

  return <>{children}</>
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  )
}

// =====================================================
// PROJEKTA ATTĒLA ADRESE
// =====================================================

function getProjectCoverUrl(project: PublicProject) {
  if (!project.imagePath) return null

  return `${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`
}

// =====================================================
// AUTORA NOSAUKUMS
// =====================================================

function getAuthor(project: PublicProject) {
  return project.user?.displayName?.trim() || 'Do It Lab lietotājs'
}

// =====================================================
// BULTIŅAS IKONA
// =====================================================

function ArrowIcon() {
  return <ArrowRight size={19} aria-hidden="true" />
}

// =====================================================
// PUBLISKĀ PROJEKTA KARTĪTE
// =====================================================


function ProjectCard({ project }: { project: PublicProject }) {
  const imageUrl = getProjectCoverUrl(project)
  const [imageError, setImageError] = useState(false)

  return (
    <Link
      to="/public-projects"
      className="project-card-link"
      aria-label="Apskatīt publisko projektu katalogu"
    >
      <article className="project-card">
        <div className="project-image-link">
          {imageUrl && !imageError ? (
            <img
              className="project-image"
              src={imageUrl}
              alt={project.title}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="project-image-placeholder">
              <Leaf size={38} />
              <span>Attēls vēl nav pievienots</span>
            </div>
          )}

          <span className="image-arrow" aria-hidden="true">
            <ArrowIcon />
          </span>
        </div>

        <div className="project-card-content">
          <span className="project-category">
            {project.category?.name ?? 'Bez kategorijas'}
          </span>

          <h3>{project.title}</h3>

          <p className="public-project-description">
            {project.description}
          </p>

          <div className="project-card-footer">
            <div className="author">
              <span className="author-avatar">
                {getAuthor(project).charAt(0).toUpperCase()}
              </span>

              <span>{getAuthor(project)}</span>
            </div>

            <span className="public-project-date">
              {new Date(project.createdAt).toLocaleDateString('lv-LV')}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}


// =====================================================
// PUBLISKĀ SĀKUMLAPA
// =====================================================

function HomePage() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadProjects() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/projects`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Neizdevās ielādēt publiskos projektus.')
        }

        const data = await response.json()

        if (!Array.isArray(data.projects)) {
          throw new Error('Saņemts nederīgs projektu saraksts.')
        }

        if (active) {
          setProjects(data.projects)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Neizdevās sazināties ar serveri.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProjects()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  // Sakārtojam projektus pēc jaunākā datuma.
  // Sākumlapā parādām tikai trīs jaunākos.
  const latestProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, 3)

  return (
    <div className="site-shell" id="sakums">
      {/* GALVENE */}

      <header className="site-header">
        <div className="header-inner">
          <Logo />

          <nav className="main-nav" aria-label="Galvenā navigācija">
            <a className="nav-link" href="#par-mums">
              Par mums
            </a>
          </nav>

          <div className="header-actions">
            <Link className="login-link" to="/login">
              Pieteikties
            </Link>

            <Link
              className="button button-primary header-register"
              to="/register"
            >
              Reģistrēties <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* GALVENAIS SĀKUMLAPAS BLOKS */}

        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-line" />
              Tava ideja. Tavs projekts.
            </span>

            <h1>
              Idejas kļūst
              <br />
              par <span>projektiem.</span>
            </h1>

            <p className="hero-description">
              Vieta, kur hobiji pārtop īstos darbos.
              Dalies savā pieredzē, mācies no citiem
              un parādi, kā top tavas idejas.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/public-projects">
                Apskatīt projektus <ArrowIcon />
              </Link>

              <Link
                className="button button-secondary"
                to="/register"
              >
                Pievienoties kopienai
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-photo-frame">
              <img
                src="https://www.marapon.com/cdn/shop/articles/diy_3a8f7fae-5c6c-48e1-bd47-5abd6298a295.png?v=1772627057&width=1500"
                alt="Radoša darba vieta ar hobiju piederumiem"
                className="hero-photo"
              />
            </div>

            <div className="hero-photo-caption">
              <span className="caption-dot" />
              <span>Radīts paša rokām</span>
            </div>
          </div>
        </section>

        {/* JAUNĀKIE PUBLISKIE PROJEKTI */}

        <section className="projects-section" id="projekti">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                Iedvesmojies un radi
              </span>

              <h2>
                Idejas, kas kļūst īstas<span>.</span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="public-projects-message">
              <p>Ielādējam jaunākos projektus...</p>
            </div>
          ) : error ? (
            <div className="public-projects-message" role="alert">
              <h3>Projektus pašlaik neizdevās ielādēt</h3>
              <p>{error}</p>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Mēģināt vēlreiz
              </button>
            </div>
          ) : latestProjects.length > 0 ? (
            <div className="project-grid">
              {latestProjects.map((project) => (
                <ProjectCard
                  project={project}
                  key={project.id}
                />
              ))}
            </div>
          ) : (
            <div className="public-projects-message">
              <Leaf size={38} />

              <h3>Pagaidām nav publicētu projektu</h3>

              <p>
                Kad lietotāji publicēs savus projektus,
                tie būs redzami šeit.
              </p>

              <Link
                className="button button-secondary"
                to="/register"
              >
                Pievienojies Do It Lab
              </Link>
            </div>
          )}

          {!loading && !error && projects.length > 3 && (
            <div className="public-projects-more">
              <Link
                className="button button-secondary"
                to="/public-projects"
              >
                Apskatīt visus projektus <ArrowIcon />
              </Link>
            </div>
          )}
        </section>

        {/* PAR MUMS */}

        <section className="about-strip" id="par-mums">
          <p>
            Do It Lab ir vieta, kur dalīties ar saviem hobiju projektiem,
            dokumentēt to tapšanu un iedvesmoties no citiem.
          </p>
        </section>
      </main>

      {/* KĀJENE */}

      <footer className="site-footer">
        <Logo />
        <p>Idejām, kas pelnījušas kļūt īstas.</p>
        <span className="footer-copyright">© 2026 Do It Lab</span>
      </footer>
    </div>
  )
}

// =====================================================
// LIETOTNES MARŠRUTI
// =====================================================

function App() {
  return (
    <Routes>

      {/* Publiskās lapas */}

      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Jaunais publiskais projektu katalogs */}
      <Route
        path="/public-projects"
        element={<PublicProjectCatalogPage />}
      />

      {/* Reģistrēto lietotāju katalogs un projektu detaļas */}
      <Route
        path="/projects"
        element={
          <ProtectedLayout>
            <ProjectCatalogPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/:id"
        element={
          <ProtectedLayout>
            <ProjectDetailsPage />
          </ProtectedLayout>
        }
      />

      {/* Tikai pieslēgtiem lietotājiem */}

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedLayout>
            <ProfilePage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/new"
        element={
          <ProtectedLayout>
            <CreateProjectPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/mine"
        element={
          <ProtectedLayout>
            <MyProjectsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/saved"
        element={
          <ProtectedLayout>
            <SavedProjectsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/:id/manage"
        element={
          <ProtectedLayout>
            <ProjectManagementPage />
          </ProtectedLayout>
        }
      />

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Nezināmi maršruti */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
