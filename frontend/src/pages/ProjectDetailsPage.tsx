import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  Image as ImageIcon,
  Images,
  Leaf,
  LockKeyhole,
  ListOrdered,
  Package,
  Settings,
  LogOut,
  UserRound,
  X,
} from 'lucide-react'

import Logo from '../components/Logo'
import './ProjectDetailsPage.css'
import './ProjectDetailsPage.gallery.css'

const API_URL = 'http://localhost:5000/api'

type StepMaterial = {
  id: string
  quantityNeeded: number | string
  material: {
    id: string
    name: string
    unit: string
  }
}

type ProjectStep = {
  id: string
  title: string
  description: string
  stepNumber: number
  imagePath?: string | null
  materialsUsed: StepMaterial[]
}

type ProjectGalleryImage = {
  id: string
  imagePath: string
  caption: string | null
  sortOrder: number
}

type Project = {
  id: string
  title: string
  description: string
  imagePath: string | null
  isPublished: boolean
  isGalleryPublic: boolean
  galleryImages: ProjectGalleryImage[]
  createdAt: string
  category: {
    id: string
    name: string
  } | null
  user: {
    id: string
    displayName?: string | null
  }
  steps: ProjectStep[]
  _count: {
    steps: number
  }
}

type AuthUser = {
  id: string
  email: string
  displayName?: string | null
  avatarPath?: string | null
}

function formatQuantity(value: number | string) {
  return new Intl.NumberFormat('lv-LV', {
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function getAuthorName(project: Project) {
  return project.user?.displayName?.trim() || 'Do It Lab lietotājs'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('lv-LV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function PublicProjectImage({
  projectId,
  hasImage,
  title,
}: {
  projectId: string
  hasImage: boolean
  title: string
}) {
  const [failed, setFailed] = useState(false)

  const imageUrl = hasImage
    ? `${API_URL}/images/projects/${encodeURIComponent(projectId)}/cover`
    : null

  useEffect(() => {
    setFailed(false)
  }, [imageUrl])

  return (
    <div className="public-detail-hero-image">
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={title}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="public-detail-image-placeholder">
          <Leaf size={58} strokeWidth={1.3} />
          <span>
            {hasImage
              ? 'Attēlu neizdevās ielādēt'
              : 'Projekta attēls vēl nav pievienots'}
          </span>
        </div>
      )}
    </div>
  )
}

function PublicStepImage({
  stepId,
  hasImage,
  title,
}: {
  stepId: string
  hasImage: boolean
  title: string
}) {
  const [failed, setFailed] = useState(false)

  const imageUrl = hasImage
    ? `${API_URL}/images/steps/${encodeURIComponent(stepId)}`
    : null

  useEffect(() => {
    setFailed(false)
  }, [imageUrl])

  return imageUrl && !failed ? (
    <img
      className="public-detail-step-image"
      src={imageUrl}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="public-detail-step-placeholder">
      <ImageIcon size={22} />
      <span>
        {hasImage
          ? 'Attēlu neizdevās ielādēt'
          : 'Šim solim attēls vēl nav pievienots'}
      </span>
    </div>
  )
}

function getUserDisplayName(user: AuthUser | null) {
  return user?.displayName?.trim() || 'Do It Lab lietotājs'
}

function GalleryImageThumbnail({
  image,
  onOpen,
}: {
  image: ProjectGalleryImage
  onOpen: () => void
}) {
  const [failed, setFailed] = useState(false)
  const imageUrl = `${API_URL}/images/gallery/${encodeURIComponent(image.id)}`

  return (
    <button
      type="button"
      className="public-detail-gallery-item"
      onClick={onOpen}
      disabled={failed}
      aria-label={`Atvērt galerijas attēlu${image.caption ? `: ${image.caption}` : ''}`}
    >
      {failed ? (
        <div className="public-detail-gallery-placeholder">
          <ImageIcon size={28} />
          <span>Attēlu neizdevās ielādēt</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={image.caption || 'Projekta galerijas attēls'}
          crossOrigin="use-credentials"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}

      {image.caption && (
        <span className="public-detail-gallery-caption">
          {image.caption}
        </span>
      )}
    </button>
  )
}

function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [favoriteSaving, setFavoriteSaving] = useState(false)
  const [favoriteMessage, setFavoriteMessage] = useState('')
  const [favoriteError, setFavoriteError] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<ProjectGalleryImage | null>(null)

  // Aizveram palielināto galerijas attēlu ar Escape taustiņu.
  useEffect(() => {
    if (!selectedGalleryImage) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedGalleryImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [selectedGalleryImage])

  // Ielādējam publisko projektu.
  useEffect(() => {
    if (!id) {
      setError('Nav norādīts projekta ID.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadProject() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_URL}/projects/${encodeURIComponent(id!)}`,
          {
            signal: controller.signal,
            credentials: 'include',
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Neizdevās ielādēt projektu.')
        }

        if (!data.project) {
          throw new Error('Projekts netika atrasts.')
        }

        setProject(data.project)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

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

    void loadProject()

    return () => controller.abort()
  }, [id])

  // Pārbaudām lietotāja sesiju un favorīta statusu.
  useEffect(() => {
    if (!id) {
      setAuthChecking(false)
      return
    }

    const controller = new AbortController()

    async function checkAuthenticationAndFavorite() {
      setAuthChecking(true)
      setAuthUser(null)
      setIsSaved(false)
      setFavoriteError('')
      setFavoriteMessage('')

      try {
        const authResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        // Lietotājs nav ielogojies.
        if (authResponse.status === 401) {
          setAuthUser(null)
          return
        }

        const authData = await authResponse.json()

        if (!authResponse.ok || !authData.user) {
          throw new Error(
            authData.message ||
              'Neizdevās pārbaudīt lietotāja sesiju.',
          )
        }

        setAuthUser(authData.user)

        // Pārbaudām, vai projekts jau atrodas favorītos.
        const favoriteResponse = await fetch(
          `${API_URL}/favorites/${encodeURIComponent(id)}/status`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        )

        if (favoriteResponse.status === 401) {
          setAuthUser(null)
          setIsSaved(false)
          return
        }

        const favoriteData = await favoriteResponse.json()

        if (!favoriteResponse.ok) {
          throw new Error(
            favoriteData.message ||
              'Neizdevās pārbaudīt favorīta statusu.',
          )
        }

        setIsSaved(Boolean(favoriteData.isSaved))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setFavoriteError(
          err instanceof Error
            ? err.message
            : 'Neizdevās pārbaudīt favorītu statusu.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setAuthChecking(false)
        }
      }
    }

    void checkAuthenticationAndFavorite()

    return () => controller.abort()
  }, [id])

  // Pievieno vai noņem projektu no favorītiem.
  async function toggleSaved() {
    if (!id || favoriteSaving || authChecking) return

    setFavoriteMessage('')
    setFavoriteError('')

    // Ja lietotājs nav ielogojies, parādām reģistrācijas/pieteikšanās logu.
    if (!authUser) {
      setShowAuthModal(true)
      return
    }

    setFavoriteSaving(true)

    try {
      const response = await fetch(
        `${API_URL}/favorites/${encodeURIComponent(id)}`,
        {
          method: isSaved ? 'DELETE' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const data = await response.json()

      // Sesija var būt beigusies.
      if (response.status === 401) {
        setAuthUser(null)
        setIsSaved(false)
        setShowAuthModal(true)
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Neizdevās atjaunināt favorītus.',
        )
      }

      setIsSaved(Boolean(data.isSaved))

      setFavoriteMessage(
        data.message ||
          (data.isSaved
            ? 'Projekts saglabāts.'
            : 'Projekts noņemts no izlases.'),
      )
    } catch (err) {
      setFavoriteError(
        err instanceof Error
          ? err.message
          : 'Neizdevās sazināties ar serveri.',
      )
    } finally {
      setFavoriteSaving(false)
    }
  }

  // Izrakstīšanās no lietotāja konta.
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

  // Ielādes ekrāns.
  if (loading) {
    return (
      <div className="public-detail-state">
        <div className="public-detail-state-icon">
          <Leaf size={34} />
        </div>
        <h2>Ielādējam projektu...</h2>
        <p>Lūdzu, uzgaidi.</p>
      </div>
    )
  }

  // Kļūdas paziņojums.
  if (error || !project) {
    return (
      <div className="public-detail-state">
        <div className="public-detail-state-icon">
          <Leaf size={34} />
        </div>

        <h2>Projektu neizdevās atvērt</h2>

        <p>
          {error ||
            'Projekts nav atrasts vai nav publiski pieejams.'}
        </p>

        <Link
          to="/projects"
          className="public-detail-back-button"
        >
          <ArrowLeft size={18} />
          Atgriezties projektu katalogā
        </Link>
      </div>
    )
  }

  const authorName = getAuthorName(project)
  const profileName = getUserDisplayName(authUser)
  const profileInitial = profileName.charAt(0).toUpperCase() || 'L'
  const galleryImages = project.galleryImages ?? []

  const returnPath = `/projects/${project.id}`

  const registerPath = `/register?returnTo=${encodeURIComponent(returnPath)}`
  const loginPath = `/login?returnTo=${encodeURIComponent(returnPath)}`

  return (
    <div className="public-detail-page">
      <header className="public-detail-header">
        <div className="public-detail-header-inner">
          <Logo />

          <div className="public-detail-header-actions">
            <Link
              to="/projects"
              className="public-detail-back-link"
            >
              <ArrowLeft size={18} />
              <span>Projektu katalogs</span>
            </Link>

            <div className="public-detail-profile-wrapper">
              <button
                type="button"
                className="public-detail-user-button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                title="Atvērt profila izvēlni"
              >
                <span className="public-detail-user-avatar">
                  {profileInitial}
                </span>
                <span className="public-detail-user-name">
                  {profileName}
                </span>
                <ChevronDown size={16} />
              </button>

              {profileMenuOpen && (
                <div className="public-detail-profile-dropdown">
                  <div className="public-detail-profile-dropdown-info">
                    <span className="public-detail-profile-dropdown-avatar">
                      {profileInitial}
                    </span>
                    <div className="public-detail-profile-dropdown-text">
                      <strong>{profileName}</strong>
                      <span>Do It Lab dalībnieks</span>
                    </div>
                  </div>

                  <div className="public-detail-profile-dropdown-divider" />

                  <button
                    type="button"
                    className="public-detail-profile-dropdown-item"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/profile')
                    }}
                  >
                    <Settings size={17} />
                    Profila iestatījumi
                  </button>

                  <button
                    type="button"
                    className="public-detail-profile-dropdown-item logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={17} />
                    Izrakstīties
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="public-detail-main">
        <div className="public-detail-breadcrumb">
          <Link to="/dashboard">Sākums</Link>
          <span>/</span>
          <Link to="/projects">Projektu katalogs</Link>
          <span>/</span>
          <span>{project.title}</span>
        </div>

        {/* PROJEKTA TITULATTĒLS */}
        <PublicProjectImage
          projectId={project.id}
          hasImage={Boolean(project.imagePath)}
          title={project.title}
        />

        <section className="public-detail-heading">
          <div className="public-detail-heading-text">
            <span className="public-detail-category">
              <FolderOpen size={15} />
              {project.category?.name ?? 'Bez kategorijas'}
            </span>

            <h1>{project.title}</h1>

            <div className="public-detail-meta">
              <span>
                <UserRound size={16} />
                {authorName}
              </span>

              <span>
                <CalendarDays size={16} />
                {formatDate(project.createdAt)}
              </span>
            </div>
          </div>

          <div className="public-detail-heading-actions">
            <button
              type="button"
              className={`public-detail-gallery-button ${
                project.isGalleryPublic ? 'is-public' : 'is-private'
              }`}
              disabled={!project.isGalleryPublic}
              onClick={() => {
                document
                  .getElementById('public-project-gallery')
                  ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
              }}
              title={
                project.isGalleryPublic
                  ? 'Apskatīt projekta galeriju'
                  : 'Šī projekta galerija ir privāta'
              }
            >
              {project.isGalleryPublic ? (
                <Images size={18} />
              ) : (
                <LockKeyhole size={17} />
              )}
              {project.isGalleryPublic
                ? `Galerija (${galleryImages.length})`
                : 'Galerija privāta'}
            </button>

            <button
              type="button"
              className={`public-detail-save-button ${
                isSaved ? 'is-saved' : ''
              }`}
              onClick={toggleSaved}
              aria-pressed={isSaved}
              disabled={authChecking || favoriteSaving}
            >
              <Bookmark
                size={18}
                fill={isSaved ? 'currentColor' : 'none'}
              />
              {authChecking
                ? 'Pārbauda...'
                : favoriteSaving
                  ? 'Saglabā...'
                  : isSaved
                    ? 'Saglabāts'
                    : 'Saglabāt projektu'}
            </button>
          </div>
        </section>

        {(favoriteMessage || favoriteError) && (
          <div
            className={`public-detail-favorite-feedback ${
              favoriteError ? 'is-error' : ''
            }`}
            role={favoriteError ? 'alert' : 'status'}
          >
            {favoriteError || favoriteMessage}
          </div>
        )}

        <div className="public-detail-layout">
          <div className="public-detail-content">
            <section className="public-detail-card">
              <div className="public-detail-section-title">
                <span className="public-detail-section-icon">
                  <Leaf size={19} />
                </span>

                <h2>Par projektu</h2>
              </div>

              <p className="public-detail-description">
                {project.description}
              </p>
            </section>

            {/* PROJEKTA SOĻI */}
            <section className="public-detail-steps-section">
              <div className="public-detail-steps-heading">
                <div>
                  <span className="public-detail-eyebrow">
                    Projekta tapšanas process
                  </span>

                  <h2>Projekta soļi</h2>
                </div>

                <span className="public-detail-step-count">
                  {project.steps.length} soļi
                </span>
              </div>

              {project.steps.length > 0 ? (
                <div className="public-detail-steps">
                  {project.steps.map((step) => {
                    const stepMaterials = step.materialsUsed ?? []

                    return (
                      <article
                        className="public-detail-step"
                        key={step.id}
                      >
                        <div className="public-detail-step-number">
                          {String(step.stepNumber).padStart(2, '0')}
                        </div>

                        <div className="public-detail-step-body">
                          <h3>{step.title}</h3>

                          <p>{step.description}</p>

                          {/* SOĻA ATTĒLS */}
                          <PublicStepImage
                            stepId={step.id}
                            hasImage={Boolean(step.imagePath)}
                            title={step.title}
                          />

                          {/* ŠIM SOLIM NEPIECIEŠAMIE MATERIĀLI */}
                          {stepMaterials.length > 0 && (
                            <div className="public-detail-materials">
                              <Package size={17} />

                              <div>
                                <strong>
                                  Nepieciešamie materiāli
                                </strong>

                                <ul
                                  style={{
                                    margin: '9px 0 0',
                                    paddingLeft: '18px',
                                  }}
                                >
                                  {stepMaterials.map((assignment) => (
                                    <li
                                      key={assignment.id}
                                      style={{
                                        marginBottom: '5px',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      <span>
                                        {assignment.material.name}
                                      </span>

                                      {' — '}

                                      <strong>
                                        {formatQuantity(
                                          assignment.quantityNeeded,
                                        )}{' '}
                                        {assignment.material.unit}
                                      </strong>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="public-detail-empty-steps">
                  <ListOrdered size={34} />

                  <h3>Projekta soļi vēl nav pievienoti</h3>

                  <p>
                    Projekta autors vēl nav aprakstījis tā tapšanas
                    procesu.
                  </p>
                </div>
              )}
            </section>

            {/* PUBLIKĀ PROJEKTA GALERIJA */}
            {project.isGalleryPublic && (
              <section
                className="public-detail-gallery-section"
                id="public-project-gallery"
              >
                <div className="public-detail-gallery-heading">
                  <div>
                    <span className="public-detail-eyebrow">
                      Projekta papildu attēli
                    </span>
                    <h2>Projekta galerija</h2>
                  </div>
                  <span className="public-detail-step-count">
                    {galleryImages.length} attēli
                  </span>
                </div>

                {galleryImages.length > 0 ? (
                  <div className="public-detail-gallery-grid">
                    {galleryImages.map((image) => (
                      <GalleryImageThumbnail
                        key={image.id}
                        image={image}
                        onOpen={() => setSelectedGalleryImage(image)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="public-detail-gallery-empty">
                    <Images size={35} />
                    <h3>Galerija vēl ir tukša</h3>
                    <p>
                      Projekta autors vēl nav pievienojis galerijas attēlus.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* LABĀ SĀNU INFORMĀCIJA */}
          <aside className="public-detail-sidebar">
            <section className="public-detail-info-card">
              <div className="public-detail-section-title">
                <span className="public-detail-section-icon">
                  <CheckCircle2 size={19} />
                </span>

                <h2>Projekta informācija</h2>
              </div>

              <div className="public-detail-status">
                <span className="public-detail-status-dot" />

                <div>
                  <strong>Publicēts</strong>
                  <span>Pieejams Do It Lab kopienai</span>
                </div>
              </div>

              <div className="public-detail-info-row">
                <span>Projekta kategorija</span>

                <strong>
                  {project.category?.name ?? 'Bez kategorijas'}
                </strong>
              </div>

              <div className="public-detail-info-row">
                <span>Projekta soļi</span>
                <strong>{project.steps.length}</strong>
              </div>

              <div className="public-detail-info-row">
                <span>Izveidots</span>
                <strong>{formatDate(project.createdAt)}</strong>
              </div>
            </section>

            <section className="public-detail-author-card">
              <span className="public-detail-author-eyebrow">
                Projekta autors
              </span>

              <div className="public-detail-author">
                <div className="public-detail-author-avatar">
                  {authorName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{authorName}</strong>
                  <span>Do It Lab kopienas dalībnieks</span>
                </div>
              </div>

              <p>
                Iepazīsti projekta tapšanas procesu un iedvesmojies
                nākamajai savai idejai!
              </p>
            </section>
          </aside>
        </div>
      </main>

      {/* PALIELINĀTAIS GALERIJAS ATTĒLS */}
      {selectedGalleryImage && (
        <div
          className="public-detail-lightbox-overlay"
          onClick={() => setSelectedGalleryImage(null)}
          role="presentation"
        >
          <section
            className="public-detail-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Galerijas attēls"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="public-detail-lightbox-close"
              onClick={() => setSelectedGalleryImage(null)}
              aria-label="Aizvērt attēlu"
            >
              <X size={24} />
            </button>

            <img
              src={`${API_URL}/images/gallery/${encodeURIComponent(
                selectedGalleryImage.id,
              )}`}
              alt={
                selectedGalleryImage.caption ||
                'Projekta galerijas attēls'
              }
              crossOrigin="use-credentials"
            />

            {selectedGalleryImage.caption && (
              <p>{selectedGalleryImage.caption}</p>
            )}
          </section>
        </div>
      )}

      {/* REĢISTRĀCIJAS UN PIETEIKŠANĀS LOGS VIESIM */}
      {showAuthModal && (
        <div
          className="public-detail-auth-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuthModal(false)
            }
          }}
        >
          <section
            className="public-detail-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-detail-auth-title"
          >
            <button
              type="button"
              className="public-detail-auth-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Aizvērt logu"
            >
              <X size={20} />
            </button>

            <div className="public-detail-auth-icon">
              <Bookmark size={26} />
            </div>

            <h2 id="public-detail-auth-title">
              Saglabā projektus, kas tevi iedvesmo!
            </h2>

            <p>
              Izveido Do It Lab kontu vai piesakies, lai saglabātu
              šo projektu savā izlasē un vēlāk tam ērti piekļūtu.
            </p>

            <div className="public-detail-auth-actions">
              <Link
                to={registerPath}
                className="public-detail-auth-register"
              >
                Reģistrēties
              </Link>

              <Link
                to={loginPath}
                className="public-detail-auth-login"
              >
                Jau ir konts? Pieteikties
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default ProjectDetailsPage