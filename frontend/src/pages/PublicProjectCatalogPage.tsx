
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  X,
  Home,
  Users,
  Lightbulb,
  Sprout,
  Hammer,
  Cpu,
  Palette,
  Folder,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Leaf,
  PencilRuler,
  UserRound,
  CalendarDays,
  Layers,
  type LucideIcon,
} from 'lucide-react'

import Logo from '../components/Logo'
import './PublicProjectCatalogPage.css'

const API_URL = 'http://localhost:5000/api'

// =====================================================
// DATU TIPI
// =====================================================

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
    displayName: string | null
  }
}

type Pagination = {
  currentPage: number
  pageSize: number
  totalProjects: number
  totalPages: number
}

type CatalogResponse = {
  projects: PublicProject[]
  pagination: Pagination
}

// =====================================================
// KATEGORIJU IKONAS
// =====================================================

function getCategoryIcon(name: string): LucideIcon {
  const value = name.toLocaleLowerCase('lv-LV')

  if (value.includes('koks') || value.includes('amatniec')) {
    return Hammer
  }

  if (value.includes('diy') || value.includes('māj')) {
    return Home
  }

  if (value.includes('dārz') || value.includes('daba')) {
    return Sprout
  }

  if (value.includes('elektr')) {
    return Cpu
  }

  if (value.includes('radoš')) {
    return Palette
  }

  return Folder
}

// =====================================================
// PROJEKTA ATTĒLA ADRESE
// =====================================================

function getProjectCoverUrl(project: PublicProject) {
  if (!project.imagePath) {
    return null
  }

  return `${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`
}

// =====================================================
// PROJEKTA AUTORA NOSAUKUMS
// =====================================================

function getProjectAuthor(project: PublicProject) {
  return project.user?.displayName?.trim() || 'Do It Lab lietotājs'
}

// =====================================================
// DATUMA FORMATĒŠANA
// =====================================================

function formatProjectDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('lv-LV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsedDate)
}

// =====================================================
// PROJEKTA ATTĒLS
// =====================================================

function ProjectCover({ project }: { project: PublicProject }) {
  const [imageError, setImageError] = useState(false)

  const imageUrl = getProjectCoverUrl(project)

  if (!imageUrl || imageError) {
    return (
      <div className="public-catalog-image-placeholder">
        <ImageOff size={32} strokeWidth={1.5} />
        <span>Attēls nav pievienots</span>
      </div>
    )
  }

  return (
    <img
      className="public-catalog-project-image"
      src={imageUrl}
      alt={project.title}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  )
}

// =====================================================
// PROJEKTA KARTĪTE
// =====================================================

function ProjectCard({ project }: { project: PublicProject }) {
  return (
    <article className="public-catalog-project-card">
      <div className="public-catalog-project-image">
        <ProjectCover project={project} />

        {project.category && (
          <span className="public-catalog-project-category">
            {project.category.name}
          </span>
        )}
      </div>

      <div className="public-catalog-project-info">
        <h3>{project.title}</h3>

        <div className="public-catalog-project-meta">
          <span>
            <UserRound size={15} />
            {getProjectAuthor(project)}
          </span>

          <span>
            <CalendarDays size={15} />
            {formatProjectDate(project.createdAt)}
          </span>
        </div>
      </div>
    </article>
  )
}

// =====================================================
// LAPU NUMURI
// =====================================================

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'dots' as const, totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      'dots' as const,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    'dots' as const,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'dots' as const,
    totalPages,
  ]
}

// =====================================================
// GALVENĀ PUBLIKĀ KATALOGA LAPA
// =====================================================

export default function PublicProjectCatalogPage() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoriesError, setCategoriesError] = useState(false)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [retryKey, setRetryKey] = useState(0)

  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    pageSize: 12,
    totalProjects: 0,
    totalPages: 0,
  })

  // ---------------------------------------------------
  // MEKLĒŠANAS TEKSTA AIZTURĒŠANA
  // Meklējam pēc īsa brīža, kad lietotājs beidz rakstīt.
  // ---------------------------------------------------

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const value = search.trim()

      if (value !== appliedSearch) {
        setCurrentPage(1)
        setAppliedSearch(value)
      }
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [search, appliedSearch])

  // ---------------------------------------------------
  // KATEGORIJU IELĀDE
  // ---------------------------------------------------

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Neizdevās ielādēt kategorijas.')
        }

        const data = await response.json()

        if (!Array.isArray(data.categories)) {
          throw new Error('Saņemts nederīgs kategoriju saraksts.')
        }

        setCategories(data.categories)
        setCategoriesError(false)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setCategoriesError(true)
      }
    }

    void loadCategories()

    return () => controller.abort()
  }, [])

  // ---------------------------------------------------
  // PROJEKTU IELĀDE
  // Ielādējam tikai izvēlētās lapas 12 projektus.
  // ---------------------------------------------------

  useEffect(() => {
    const controller = new AbortController()

    async function loadProjects() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        params.set('page', String(currentPage))

        if (activeCategory) {
          params.set('categoryId', activeCategory)
        }

        if (appliedSearch) {
          params.set('search', appliedSearch)
        }

        const response = await fetch(
          `${API_URL}/projects/public-catalog?${params.toString()}`,
          {
            signal: controller.signal,
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Neizdevās ielādēt projektus.',
          )
        }

        if (
          !Array.isArray(data.projects) ||
          !data.pagination
        ) {
          throw new Error('Saņemti nederīgi projektu dati.')
        }

        setProjects(data.projects)
        setPagination(data.pagination)
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

    void loadProjects()

    return () => controller.abort()
  }, [currentPage, activeCategory, appliedSearch, retryKey])

  // ---------------------------------------------------
  // KATEGORIJAS IZVĒLE
  // ---------------------------------------------------

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId)
    setCurrentPage(1)
  }

  // ---------------------------------------------------
  // MEKLĒŠANAS NOTĪRĪŠANA
  // ---------------------------------------------------

  function clearSearch() {
    setSearch('')
    setAppliedSearch('')
    setCurrentPage(1)
  }

  // ---------------------------------------------------
  // ATGRIEŠANĀS PIE VISIEM PROJEKTIEM
  // ---------------------------------------------------

  function resetFilters() {
    setSearch('')
    setAppliedSearch('')
    setActiveCategory('')
    setCurrentPage(1)
  }

  // ---------------------------------------------------
  // LAPOŠANA
  // ---------------------------------------------------

  function changePage(page: number) {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === currentPage
    ) {
      return
    }

    setCurrentPage(page)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const visiblePages = getVisiblePages(
    currentPage,
    pagination.totalPages,
  )

  const firstProjectNumber =
    pagination.totalProjects === 0
      ? 0
      : (currentPage - 1) * pagination.pageSize + 1

  const lastProjectNumber = Math.min(
    currentPage * pagination.pageSize,
    pagination.totalProjects,
  )

  // ---------------------------------------------------
  // LAPAS HTML
  // ---------------------------------------------------

  return (
    <div className="public-catalog-page">

      {/* GALVENE */}

      <header className="public-catalog-header">
        <div className="public-catalog-header-inner">
          <div className="public-catalog-brand">
            <Logo />

            <span className="public-catalog-tagline">
              Hobiju projekti un idejas
            </span>
          </div>

          <div className="public-catalog-header-actions">
            <Link
              to="/"
              className="public-catalog-back-button"
            >
              <Home size={19} />
              <span>Atpakaļ uz sākumu</span>
            </Link>

            <Link
              to="/register"
              className="public-catalog-register-button"
            >
              <Users size={19} />
              <span>Reģistrēties</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="public-catalog-main">

        {/* IEVADA BANERIS */}

        <section className="public-catalog-hero">
          <div className="public-catalog-hero-content">
            <span className="public-catalog-eyebrow">
              Projektu katalogs
            </span>

            <h1>Atklāj kopienas projektus</h1>

            <p>
              Iepazīsti dažādu hobiju un DIY projektu idejas,
              apskati, ko rada Do It Lab lietotāji,
              un gūsti iedvesmu saviem nākamajiem projektiem.
            </p>
          </div>

          <div className="public-catalog-hero-art" aria-hidden="true">
            <div className="public-catalog-hero-plant">
              <Sprout size={112} strokeWidth={1.1} />
            </div>

            <div className="public-catalog-hero-tools">
              <PencilRuler size={68} strokeWidth={1.2} />
            </div>

            <div className="public-catalog-hero-sign">
              <Leaf size={24} />
              <span>Do It Lab</span>
            </div>
          </div>
        </section>

        {/* MEKLĒŠANA UN PROJEKTU SKAITS */}

        <section className="public-catalog-tools">
          <form
            className="public-catalog-search"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              setAppliedSearch(search.trim())
              setCurrentPage(1)
            }}
          >
            <Search size={22} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Meklēt projektus pēc nosaukuma vai atslēgvārda..."
              aria-label="Meklēt projektus"
            />

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Notīrīt meklēšanu"
                className="public-catalog-search-clear"
              >
                <X size={18} />
              </button>
            )}
          </form>

          <div className="public-catalog-total">
            <Layers size={21} />
            <span>
              Kopā publicēti projekti: {pagination.totalProjects}
            </span>
          </div>
        </section>

        {/* KATEGORIJU FILTRI */}

        <section
          className="public-catalog-categories"
          aria-label="Projektu kategorijas"
        >
          <button
            type="button"
            className={`public-catalog-category-button ${
              activeCategory === '' ? 'active' : ''
            }`}
            onClick={() => selectCategory('')}
          >
            <LayoutGrid size={18} />
            Visi projekti
          </button>

          {categories.map((category) => {
            const CategoryIcon = getCategoryIcon(category.name)

            return (
              <button
                type="button"
                key={category.id}
                className={`public-catalog-category-button ${
                  activeCategory === category.id ? 'active' : ''
                }`}
                onClick={() => selectCategory(category.id)}
              >
                <CategoryIcon size={18} />
                {category.name}
              </button>
            )
          })}
        </section>

        {categoriesError && (
          <p className="public-catalog-small-error">
            Neizdevās ielādēt kategoriju sarakstu.
          </p>
        )}

        {/* PROJEKTU SARAKSTS */}

        <section className="public-catalog-results">
          <div className="public-catalog-results-heading">
            <h2>Publicētie projekti</h2>

            {!loading && !error && pagination.totalProjects > 0 && (
              <span>
                {firstProjectNumber}–{lastProjectNumber} no{' '}
                {pagination.totalProjects}
              </span>
            )}
          </div>

          {loading ? (
            <div className="public-catalog-message">
              <div className="public-catalog-spinner" />
              <p>Ielādējam publicētos projektus...</p>
            </div>
          ) : error ? (
            <div className="public-catalog-message public-catalog-error">
              <h3>Projektus pašlaik neizdevās ielādēt</h3>
              <p>{error}</p>

              <button
                type="button"
                className="public-catalog-reset-button"
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Mēģināt vēlreiz
              </button>
            </div>
          ) : projects.length > 0 ? (
            <>
              <div className="public-catalog-project-grid">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                  />
                ))}
              </div>

              {/* LAPU PĀRSLĒGŠANA */}

              {pagination.totalPages > 1 && (
                <nav
                  className="public-catalog-pagination"
                  aria-label="Projektu kataloga lapas"
                >
                  <button
                    type="button"
                    className="public-catalog-page-arrow"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={19} />
                    Iepriekšējā
                  </button>

                  <div className="public-catalog-page-numbers">
                    {visiblePages.map((page, index) =>
                      page === 'dots' ? (
                        <span
                          className="public-catalog-page-dots"
                          key={`dots-${index}`}
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          type="button"
                          key={page}
                          className={`public-catalog-page-number ${
                            currentPage === page ? 'active' : ''
                          }`}
                          onClick={() => changePage(page)}
                          aria-current={
                            currentPage === page ? 'page' : undefined
                          }
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    className="public-catalog-page-arrow"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Nākamā
                    <ChevronRight size={19} />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="public-catalog-message public-catalog-empty">
              <Leaf size={38} strokeWidth={1.3} />

              <h3>
                {appliedSearch || activeCategory
                  ? 'Projektus neizdevās atrast'
                  : 'Pagaidām nav publicētu projektu'}
              </h3>

              <p>
                {appliedSearch || activeCategory
                  ? 'Izvēlētajiem meklēšanas vai kategorijas kritērijiem nav atbilstošu projektu.'
                  : 'Kad Do It Lab lietotāji publicēs savus projektus, tie būs redzami šeit.'}
              </p>

              {(appliedSearch || activeCategory) && (
                <button
                  type="button"
                  className="public-catalog-reset-button"
                  onClick={resetFilters}
                >
                  Rādīt visus projektus
                </button>
              )}
            </div>
          )}
        </section>

        {/* PAR DO IT LAB */}

        <section className="public-catalog-about">
          <div className="public-catalog-about-illustration">
            <PencilRuler size={76} strokeWidth={1.2} />
            <Sprout size={40} strokeWidth={1.3} />
          </div>

          <div className="public-catalog-about-copy">
            <h2>Kas ir Do It Lab?</h2>

            <p>
              Tā ir hobiju un radošo projektu platforma,
              kur ikviens var dokumentēt savas idejas,
              dalīties ar pieredzi un iedvesmot citus.
            </p>
          </div>

          <div className="public-catalog-about-features">
            <div>
              <span className="public-catalog-feature-icon">
                <Sprout size={25} />
              </span>
              <p>Dažādas<br />hobiju jomas</p>
            </div>

            <div>
              <span className="public-catalog-feature-icon">
                <Users size={25} />
              </span>
              <p>Aktīva<br />kopiena</p>
            </div>

            <div>
              <span className="public-catalog-feature-icon">
                <Lightbulb size={25} />
              </span>
              <p>Idejas un<br />iedvesma</p>
            </div>
          </div>
        </section>

        {/* REĢISTRĀCIJAS AICINĀJUMS */}

        <section className="public-catalog-cta">
          <div className="public-catalog-cta-mark">
            <Leaf size={54} strokeWidth={1.2} />
          </div>

          <div className="public-catalog-cta-copy">
            <h2>Arī tev ir ideja, kuru vēlies īstenot?</h2>

            <p>
              Pievienojies Do It Lab kopienai, veido savus projektus,
              seko progresam un dalies ar rezultātu!
            </p>
          </div>

          <Link
            to="/register"
            className="public-catalog-cta-button"
          >
            <Users size={20} />
            Reģistrēties Do It Lab
          </Link>
        </section>

      </main>

      {/* KĀJENE */}

      <footer className="public-catalog-footer">
        <Logo />
        <p>Idejām, kas pelnījušas kļūt īstas.</p>
        <span>© 2026 Do It Lab</span>
      </footer>
    </div>
  )
}
