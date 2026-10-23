import { Routes, Route, Navigate } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import './App.css'

const projects = [
  {
    title: 'Koka plaukts istabas augiem',
    category: 'Koks un amatniecība',
    author: 'Anna',
    status: 'Pabeigts',
    statusType: 'completed',
    image:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85',
    likes: 24,
  },
  {
    title: 'Automātiska augu laistīšana',
    category: 'Elektronika',
    author: 'Jānis',
    status: 'Procesā',
    statusType: 'progress',
    image:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85',
    likes: 31,
  },
  {
    title: 'Mazs zaļais dārzs mājās',
    category: 'Dārzs un daba',
    author: 'Līga',
    status: 'Plānots',
    statusType: 'planned',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=85',
    likes: 18,
  },
  {
    title: 'Roku darbs mājīgākai mājai',
    category: 'DIY un māja',
    author: 'Zane',
    status: 'Pabeigts',
    statusType: 'completed',
    image:
      'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=85',
    likes: 42,
  },
]


function Logo() {
  return (
    <a className="brand" href="#sakums" aria-label="Do It Lab sākumlapa">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" fill="none">
          <path
            d="M22 36V17"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M21 25C10 25 7 17 9 8C18 9 25 14 21 25Z"
            fill="currentColor"
          />
          <path
            d="M23 31C34 31 38 23 35 14C26 15 19 21 23 31Z"
            fill="currentColor"
          />
          <path
            d="M12 36H32"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="6" r="2.5" fill="#DDA75B" />
        </svg>
      </span>
      <span className="brand-name">
        Do It <strong>Lab</strong>
      </span>
    </a>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12H19M12 5L19 12L12 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProjectCard({
  project,
}: {
  project: (typeof projects)[number]
}) {
  return (
    <article className="project-card">
      <a
        className="project-image-link"
        href="#projekti"
        aria-label={`Apskatīt projektu: ${project.title}`}
      >
        <img
          className="project-image"
          src={project.image}
          alt={project.title}
          loading="lazy"
        />
        <span className={`status-badge ${project.statusType}`}>
          <span className="status-dot" />
          {project.status}
        </span>
        <span className="image-arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </a>

      <div className="project-card-content">
        <span className="project-category">{project.category}</span>
        <h3>{project.title}</h3>

        <div className="project-card-footer">
          <div className="author">
            <span className="author-avatar">
              {project.author.charAt(0)}
            </span>
            <span>{project.author}</span>
          </div>

          <span className="project-likes" aria-label={`${project.likes} atzīmes`}>
            <span aria-hidden="true">♡</span> {project.likes}
          </span>
        </div>
      </div>
    </article>
  )
}

function HomePage() {
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

              <a className="button button-secondary" href="/register">
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
              <span className="eyebrow">Iedvesmojies un radi</span>
              <h2>
                Idejas, kas kļūst īstas<span>.</span>
              </h2>
            </div>
          </div>

          <div className="project-grid">
            {projects.map((project) => (
              <ProjectCard project={project} key={project.title} />
            ))}
          </div>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
