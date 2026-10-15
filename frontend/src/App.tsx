
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

const categories = [
  { icon: '✳', name: 'DIY un māja', count: '28 projekti' },
  { icon: '⌘', name: 'Elektronika', count: '18 projekti' },
  { icon: '♧', name: 'Dārzs un daba', count: '24 projekti' },
  { icon: '✿', name: 'Roku darbi', count: '16 projekti' },
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

function App() {
  return (
    <div className="site-shell" id="sakums">
      <header className="site-header">
        <div className="header-inner">
          <Logo />

          <nav className="main-nav" aria-label="Galvenā navigācija">
            <a className="nav-link active" href="#sakums">
              Sākums
            </a>
            <a className="nav-link" href="#projekti">
              Projekti
            </a>
            <a className="nav-link" href="#kategorijas">
              Kategorijas
            </a>
            <a className="nav-link" href="#par-mums">
              Par mums
            </a>
          </nav>

          <div className="header-actions">
            <a className="login-link" href="#pieteiksanas">
              Pieteikties
            </a>
            <a className="button button-primary header-register" href="#registracija">
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
              Vieta, kur hobiji pārtop īstos darbos. Dalies savā
              pieredzē, mācies no citiem un parādi, kā top tavas idejas.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#projekti">
                Atklāt projektus <ArrowIcon />
              </a>
              <a className="button button-secondary" href="#registracija">
                Pievienoties kopienai
              </a>
            </div>

            <div className="hero-note">
              <div className="mini-avatars" aria-hidden="true">
                <span>A</span>
                <span>J</span>
                <span>L</span>
              </div>
              <p>
                <strong>Idejas aug kopā.</strong>
                <br />
                Iedvesmojies no citu pieredzes.
              </p>
            </div>

            <span className="hero-decoration decoration-star" aria-hidden="true">
              ✳
            </span>
          </div>

          <div className="hero-visual">
            <div className="hero-photo-frame">
              <img
                src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1400&q=90"
                alt="Radoša darba vieta ar augiem un dabīgiem materiāliem"
                className="hero-photo"
              />
            </div>

            <div className="floating-note">
              <span className="floating-note-icon">✳</span>
              <div>
                <strong>Radi ar prieku</strong>
                <span>Sāc ar mazu ideju</span>
              </div>
            </div>

            <div className="hero-photo-caption">
              <span className="caption-dot" />
              <span>Radīts paša rokām</span>
            </div>

            <span className="hero-decoration decoration-spark" aria-hidden="true">
              ✧
            </span>
          </div>
        </section>

        <section className="benefits-strip" id="par-mums">
          <div className="benefit-item">
            <span className="benefit-icon">✳</span>
            <div>
              <h3>Dalies ar saviem darbiem</h3>
              <p>Parādi ne tikai rezultātu, bet arī procesu.</p>
            </div>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">⌘</span>
            <div>
              <h3>Mācies no citiem</h3>
              <p>Atklāj jaunas idejas un paņēmienus.</p>
            </div>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">♧</span>
            <div>
              <h3>Attīsti savas prasmes</h3>
              <p>Katrs projekts ir solis uz priekšu.</p>
            </div>
          </div>
        </section>

        <section className="categories-section" id="kategorijas">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Atrodi savu virzienu</span>
              <h2>Kas tevi aizrauj?</h2>
            </div>
            <p>
              No pirmajiem mēģinājumiem līdz
              <br className="desktop-break" /> projektiem, ar kuriem lepoties.
            </p>
          </div>

          <div className="category-list">
            {categories.map((category) => (
              <a
                className="category-card"
                href="#projekti"
                key={category.name}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-count">{category.count}</span>
                <span className="category-arrow">
                  <ArrowIcon />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="projects-section" id="projekti">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Iedvesmojies un radi</span>
              <h2>Idejas, kas kļūst īstas<span>.</span></h2>
            </div>
            <a className="text-link" href="#projekti">
              Visi projekti <ArrowIcon />
            </a>
          </div>

          <div className="project-grid">
            {projects.map((project) => (
              <ProjectCard project={project} key={project.title} />
            ))}
          </div>
        </section>

        <section className="community-banner" id="registracija">
          <div className="community-decoration" aria-hidden="true">
            ✳
          </div>
          <div className="community-copy">
            <span className="eyebrow">Tava ideja ir sākums</span>
            <h2>
              Tev ir ideja?
              <br />
              <span>Parādi, ko vari radīt.</span>
            </h2>
            <p>
              Pievienojies cilvēkiem, kuriem patīk izmēģināt,
              mācīties un radīt ko jaunu.
            </p>
            <a className="button button-light" href="#registracija">
              Sākt savu projektu <ArrowIcon />
            </a>
          </div>

          <div className="community-visual">
            <img
              src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85"
              alt="Piezīmes un radošas idejas darba vietā"
              loading="lazy"
            />
            <span className="community-sticker">Radi. Mācies. Dalies.</span>
          </div>
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

export default App
