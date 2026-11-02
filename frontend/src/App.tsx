
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  Leaf,
  UserRound,
} from 'lucide-react'

import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'
import MyProjectsPage from './pages/MyProjectsPage'
import ProjectCatalogPage from './pages/ProjectCatalogPage'

import Logo from './components/Logo'
import './App.css'

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
    email: string
  }
}

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null

  if (imagePath.startsWith('http')) {
    return imagePath
  }

  return `http://localhost:5000/${imagePath.replace(/^\/+/, '')}`
}

function getAuthor(project: PublicProject) {
  return project.user?.email?.split('@')[0] || 'Do It Lab lietotājs'
}

function ArrowIcon() {
  return <ArrowRight size={19} aria-hidden="true" />
}

function ProjectCard({
  project,
}: {
  project: PublicProject
}) {
  const imageUrl = getImageUrl(project.imagePath)

  return (
    <article className="project-card">
      <div
        className="project-image-link"
        aria-label={`Projekts: ${project.title}`}
      >
        {imageUrl ? (
          <img
            className="project-image"
            src={imageUrl}
            alt={project.title}
            loading="lazy"
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
  )
}

function HomePage() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        if (!Array.isArray(data.projects)) {
          throw new Error('Saņemts nederīgs projektu saraksts.')
        }

        if (active) {
          setProjects(data.projects)
        }
      } catch (err) {
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
    }
  }, [])

  return (
    <div className="site-shell" id="sakums">
      <header className="site-header">
        <div className="header-inner">
          <Logo />

          <nav className="main-nav" aria-label="Galvenā navigācija">
            <a className="nav-link" href="#par-mums">
              Par mums
            </a>
          </nav>

          <div className="header-actions">
            <a className="login-link" href="/login">
              Pieteikties
            </a>

            <a
              className="button button-primary header-register"
              href="/register"
            >
              Reģistrēties <ArrowIcon />
            </a>
          </div>
        </div>
      </header>

      <main>
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
              <a className="button button-primary" href="#projekti">
                Apskatīt projektus <ArrowIcon />
              </a>

              <a
                className="button button-secondary"
                href="/register"
              >
                Pievienoties kopienai
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-photo-frame">
              <img
                src="https://www.marapon.com/cdn/shop/articles/diy_3a8f7fae-5c6c-48e1-bd47-5abd6298a295.png?v=1772627057&width=1500"
                alt="Radoša darba vieta ar augiem un galda lampu"
                className="hero-photo"
              />
            </div>

            <div className="hero-photo-caption">
              <span className="caption-dot" />
              <span>Radīts paša rokām</span>
            </div>
          </div>
        </section>

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
                onClick={() => window.location.reload()}
              >
                Mēģināt vēlreiz
              </button>
            </div>
          ) : projects.length > 0 ? (
            <div className="project-grid">
              {projects.slice(0, 4).map((project) => (
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

              <a
                className="button button-secondary"
                href="/register"
              >
                Pievienojies Do It Lab
              </a>
            </div>
          )}

          {projects.length > 4 && (
            <div className="public-projects-more">
              <a
                className="button button-secondary"
                href="/projects"
              >
                Apskatīt visus projektus <ArrowIcon />
              </a>
            </div>
          )}
        </section>

        <section className="about-strip" id="par-mums">
          <p>
            Do It Lab ir vieta, kur dalīties ar saviem hobiju projektiem,
            dokumentēt to tapšanu un iedvesmoties no citiem.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <Logo />
        <p>Idejām, kas pelnījušas kļūt īstas.</p>
        <span className="footer-copyright">© 2026 Do It Lab</span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects/new" element={<CreateProjectPage />} />
      <Route path="/projects/mine" element={<MyProjectsPage />} />
      <Route path="/projects" element={<ProjectCatalogPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
