import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {

  House,

  Folder,

  FolderSearch,

  CirclePlus,

  Bookmark,

  Heart,

  UserRound,

  Leaf,

  Search,

  X,

  CalendarDays,

  Layers3,

  ArrowUpRight,

  Eye,

  EyeOff,

  Sprout,

  CheckCircle2,

} from 'lucide-react'



import Logo from '../components/Logo'

import './MyProjectsPage.css'



const API_URL = 'http://localhost:5000/api'




type Project = {

  id: string

  title: string

  description: string

  imagePath: string | null

  isPublished: boolean

  createdAt: string

  updatedAt?: string

  category?: {

    id?: string

    name: string

  } | null

  _count?: {

    steps: number

  }

}



type ProjectFilter = 'all' | 'published' | 'private'



function formatDate(date: string) {

  return new Date(date).toLocaleDateString('lv-LV', {

    day: 'numeric',

    month: 'short',

    year: 'numeric',

  })

}



function MyProjectsPage() {

  const navigate = useNavigate()



  const [projects, setProjects] = useState<Project[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [notice, setNotice] = useState('')

  const [updatingId, setUpdatingId] = useState<string | null>(null)



  const [search, setSearch] = useState('')

  const [activeFilter, setActiveFilter] =

    useState<ProjectFilter>('all')



  const loadProjects = useCallback(async () => {

    setLoading(true)

    setError('')



    try {

      const response = await fetch(`${API_URL}/projects/mine`, {

        method: 'GET',

        credentials: 'include',

      })



      if (response.status === 401) {

        navigate('/login', { replace: true })

        return

      }



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          data.message || 'Neizdevās ielādēt tavus projektus.',

        )

      }



      setProjects(data.projects ?? [])

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Radās neparedzēta kļūda.',

      )

    } finally {

      setLoading(false)

    }

  }, [navigate])



  useEffect(() => {

    void loadProjects()

  }, [loadProjects])



  const publishedCount = projects.filter(

    (project) => project.isPublished,

  ).length



  const privateCount = projects.filter(

    (project) => !project.isPublished,

  ).length



  const totalSteps = projects.reduce(

    (total, project) => total + (project._count?.steps ?? 0),

    0,

  )



  const filteredProjects = useMemo(() => {

    const query = search.trim().toLowerCase()



    return projects.filter((project) => {

      const matchesFilter =

        activeFilter === 'all' ||

        (activeFilter === 'published' && project.isPublished) ||

        (activeFilter === 'private' && !project.isPublished)



      const matchesSearch =

        !query ||

        project.title.toLowerCase().includes(query) ||

        project.description.toLowerCase().includes(query) ||

        (project.category?.name ?? '').toLowerCase().includes(query)



      return matchesFilter && matchesSearch

    })

  }, [projects, search, activeFilter])



  async function toggleVisibility(project: Project) {

    const nextVisibility = !project.isPublished



    const confirmed = window.confirm(

      nextVisibility

        ? `Vai vēlies publicēt projektu "${project.title}"?`

        : `Vai vēlies padarīt projektu "${project.title}" privātu?`,

    )



    if (!confirmed) return



    setUpdatingId(project.id)

    setError('')

    setNotice('')



    try {

      const response = await fetch(

        `${API_URL}/projects/${project.id}/visibility`,

        {

          method: 'PATCH',

          credentials: 'include',

          headers: {

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            isPublished: nextVisibility,

          }),

        },

      )



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          data.message || 'Neizdevās mainīt projekta redzamību.',

        )

      }



      setProjects((current) =>

        current.map((item) =>

          item.id === project.id

            ? { ...item, isPublished: nextVisibility }

            : item,

        ),

      )



      setNotice(

        nextVisibility

          ? 'Projekts veiksmīgi publicēts!'

          : 'Projekts tagad ir privāts.',

      )

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Radās neparedzēta kļūda.',

      )

    } finally {

      setUpdatingId(null)

    }

  }



  function handleProfile() {

    setNotice('Profila lapu pievienosim nākamajā izstrādes solī.')

  }



  function openProject(projectId: string) {

    navigate(`/projects/${projectId}/manage`)

  }



  return (

    <div className="workspace-shell">

      <aside className="workspace-sidebar">

        <div className="workspace-logo">

          <Logo />

        </div>



        <nav

          className="workspace-navigation"

          aria-label="Lietotāja navigācija"

        >

          <button

            className="workspace-nav-link"

            onClick={() => navigate('/dashboard')}

          >

            <House />

            <span>Sākums</span>

          </button>



          <button

            className="workspace-nav-link"

            onClick={() => navigate('/projects')}

          >

            <FolderSearch />

            <span>Projektu katalogs</span>

          </button>



          <button

            className="workspace-nav-link"

            onClick={() => navigate('/projects/new')}

          >

            <CirclePlus />

            <span>Izveidot projektu</span>

          </button>



          <button

            className="workspace-nav-link active"

            onClick={() => navigate('/projects/mine')}

          >

            <Bookmark />

            <span>Mani projekti</span>

          </button>



          <button

            className="workspace-nav-link"

            onClick={() => navigate('/projects/saved')}

          >

            <Heart />

            <span>Saglabātie</span>

          </button>



          <button

            className="workspace-nav-link"

            onClick={handleProfile}

          >

            <UserRound />

            <span>Profils</span>

          </button>

        </nav>



        <div className="workspace-sidebar-bottom">

          <div className="workspace-sidebar-decoration">

            <Sprout size={27} strokeWidth={1.4} />

            <p>

              RADI.

              <br />

              MĀCIES.

              <br />

              DALIES.

            </p>

          </div>



          <button

            className="workspace-home-button"

            onClick={() => navigate('/dashboard')}

          >

            <House size={18} />

            Atpakaļ uz sākumu

          </button>

        </div>

      </aside>



      <main className="workspace-main">

        <header className="workspace-topbar">

          <div className="workspace-breadcrumb">

            <button onClick={() => navigate('/dashboard')}>

              Sākums

            </button>

            <span>/</span>

            <strong>Mani projekti</strong>

          </div>





        </header>



        <div className="workspace-content">

          <section className="workspace-hero">

            <div className="workspace-hero-copy">

              <span className="workspace-eyebrow">

                TAVA RADOŠĀ TELPA

              </span>



              <h1>Mani projekti</h1>



              <p>

                Šeit sākas tavu ideju ceļš. Pārvaldi savus projektus,

                dokumentē to tapšanu un dalies ar paveikto.

              </p>



              <button

                className="workspace-hero-button"

                onClick={() => navigate('/projects/new')}

              >

                <CirclePlus size={19} />

                Izveidot jaunu projektu

              </button>

            </div>



            <div className="workspace-hero-art" aria-hidden="true">

              <div className="workspace-art-circle workspace-art-circle-one" />

              <div className="workspace-art-circle workspace-art-circle-two" />

              <div className="workspace-art-paper">

                <span />

                <span />

                <span />

                <div className="workspace-art-leaf">

                  <Leaf size={64} strokeWidth={1.2} />

                </div>

              </div>

              <div className="workspace-art-plant">

                <Sprout size={83} strokeWidth={1.1} />

              </div>

            </div>

          </section>



          <section className="workspace-stats">

            <article className="workspace-stat-card">

              <div className="workspace-stat-icon icon-all">

                <Layers3 size={21} />

              </div>

              <div>

                <span>Visi projekti</span>

                <strong>{projects.length}</strong>

              </div>

            </article>



            <article className="workspace-stat-card">

              <div className="workspace-stat-icon icon-published">

                <Eye size={21} />

              </div>

              <div>

                <span>Publicēti</span>

                <strong>{publishedCount}</strong>

              </div>

            </article>



            <article className="workspace-stat-card">

              <div className="workspace-stat-icon icon-private">

                <EyeOff size={21} />

              </div>

              <div>

                <span>Privāti</span>

                <strong>{privateCount}</strong>

              </div>

            </article>



            <article className="workspace-stat-card">

              <div className="workspace-stat-icon icon-steps">

                <CheckCircle2 size={21} />

              </div>

              <div>

                <span>Projekta soļi</span>

                <strong>{totalSteps}</strong>

              </div>

            </article>

          </section>



          {notice && (

            <div className="workspace-notice" role="status">

              <CheckCircle2 size={18} />

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

            <div className="workspace-error" role="alert">

              <span>{error}</span>

              <button onClick={() => void loadProjects()}>

                Mēģināt vēlreiz

              </button>

            </div>

          )}



          <section className="workspace-projects-section">

            <div className="workspace-section-heading">

              <div>

                <span className="workspace-eyebrow">

                  TAVA DARBNĪCA

                </span>

                <h2>Projektu pārskats</h2>

                <p>

                  Izvēlies projektu, lai atvērtu tā pārvaldības lapu.

                </p>

              </div>



              <div className="workspace-search">

                <Search size={18} />

                <input

                  type="search"

                  placeholder="Meklēt manus projektus..."

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                  aria-label="Meklēt manus projektus"

                />

                {search && (

                  <button

                    onClick={() => setSearch('')}

                    aria-label="Notīrīt meklēšanu"

                  >

                    <X size={16} />

                  </button>

                )}

              </div>

            </div>



            <div className="workspace-filters">

              <button

                className={activeFilter === 'all' ? 'selected' : ''}

                onClick={() => setActiveFilter('all')}

              >

                Visi projekti

                <span>{projects.length}</span>

              </button>



              <button

                className={

                  activeFilter === 'published' ? 'selected' : ''

                }

                onClick={() => setActiveFilter('published')}

              >

                Publicēti

                <span>{publishedCount}</span>

              </button>



              <button

                className={

                  activeFilter === 'private' ? 'selected' : ''

                }

                onClick={() => setActiveFilter('private')}

              >

                Privāti

                <span>{privateCount}</span>

              </button>

            </div>



            {loading ? (

              <div className="workspace-state">

                <span className="workspace-spinner" />

                <p>Ielādējam tavus projektus...</p>

              </div>

            ) : projects.length === 0 ? (

              <div className="workspace-empty">

                <div className="workspace-empty-icon">

                  <Sprout size={38} />

                </div>

                <h3>Tava darbnīca vēl ir tukša</h3>

                <p>

                  Izveido savu pirmo projektu un sāc dokumentēt

                  tā tapšanas procesu.

                </p>

                <button

                  className="workspace-hero-button"

                  onClick={() => navigate('/projects/new')}

                >

                  <CirclePlus size={18} />

                  Izveidot pirmo projektu

                </button>

              </div>

            ) : filteredProjects.length === 0 ? (

              <div className="workspace-empty workspace-filter-empty">

                <Search size={35} />

                <h3>Projektus neizdevās atrast</h3>

                <p>

                  Pamēģini citu meklēšanas vārdu vai izvēlies citu filtru.

                </p>

                <button

                  className="workspace-clear-button"

                  onClick={() => {

                    setSearch('')

                    setActiveFilter('all')

                  }}

                >

                  Rādīt visus projektus

                </button>

              </div>

            ) : (

              <div className="workspace-project-grid">

                {filteredProjects.map((project) => {


                  const isUpdating = updatingId === project.id



                  return (

                    <article

                      className="workspace-project-card"

                      key={project.id}

                    >

                      <div className="workspace-project-image">

                        {project.imagePath ? (
                          <img
                            src={`${API_URL}/images/projects/${encodeURIComponent(project.id)}/cover`}
                            alt={project.title}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                              const placeholder = event.currentTarget.parentElement?.querySelector(
                                '.workspace-project-placeholder',
                              ) as HTMLElement | null
                              if (placeholder) placeholder.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="workspace-project-placeholder"
                          style={{ display: project.imagePath ? 'none' : 'flex' }}
                        >
                          <div className="workspace-placeholder-decoration">
                            <Leaf size={53} strokeWidth={1.2} />
                          </div>
                          <span>Do It Lab darbnīca</span>
                        </div>



                        <span

                          className={`workspace-status ${

                            project.isPublished

                              ? 'status-published'

                              : 'status-private'

                          }`}

                        >

                          {project.isPublished

                            ? '● Publicēts'

                            : '● Privāts'}

                        </span>

                      </div>



                      <div className="workspace-project-body">

                        <span className="workspace-project-category">

                          {project.category?.name ?? 'Bez kategorijas'}

                        </span>



                        <h3>{project.title}</h3>



                        <p className="workspace-project-description">

                          {project.description}

                        </p>



                        <div className="workspace-project-meta">

                          <span>

                            <Layers3 size={15} />

                            {project._count?.steps ?? 0} soļi

                          </span>



                          <span>

                            <CalendarDays size={15} />

                            {formatDate(project.createdAt)}

                          </span>

                        </div>



                        <div className="workspace-project-actions">

                          <button

                            type="button"

                            className="workspace-open-button"

                            onClick={() => openProject(project.id)}

                          >

                            Pārvaldīt projektu

                            <ArrowUpRight size={17} />

                          </button>



                          <button

                            type="button"

                            className={`workspace-visibility-button ${

                              project.isPublished

                                ? 'visibility-private'

                                : 'visibility-public'

                            }`}

                            disabled={isUpdating}

                            onClick={() =>

                              void toggleVisibility(project)

                            }

                            title={

                              project.isPublished

                                ? 'Padarīt privātu'

                                : 'Publicēt projektu'

                            }

                          >

                            {isUpdating ? (

                              '...'

                            ) : project.isPublished ? (

                              <EyeOff size={18} />

                            ) : (

                              <Eye size={18} />

                            )}

                          </button>

                        </div>

                      </div>

                    </article>

                  )

                })}

              </div>

            )}

          </section>



          <footer className="workspace-footer">

            Do It Lab — idejām, kas pelnījušas kļūt īstas.

          </footer>

        </div>

      </main>

    </div>

  )

}



export default MyProjectsPage