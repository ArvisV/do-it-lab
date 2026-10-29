
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './CreateProjectPage.css'

const API_URL = 'http://localhost:5000/api'

export default function CreateProjectPage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Neizdevās izveidot projektu.')
      }

      navigate('/dashboard', {
        state: {
          notice: 'Projekts veiksmīgi izveidots!',
        },
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neizdevās sazināties ar serveri.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="create-project-page">
      <div className="create-project-container">
        <Link to="/dashboard" className="create-project-back">
          ← Atpakaļ uz paneli
        </Link>

        <div className="create-project-heading">
          <span className="create-project-eyebrow">Tava ideja sākas šeit</span>
          <h1>Izveido projektu</h1>
          <p>
            Apraksti savu ideju. Vēlāk varēsi pievienot projekta posmus,
            nepieciešamos materiālus un attēlus.
          </p>
        </div>

        <form className="create-project-form" onSubmit={handleSubmit}>
          <label htmlFor="project-title">Projekta nosaukums</label>
          <input
            id="project-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Piemēram, koka plaukts istabas augiem"
            maxLength={120}
            required
          />

          <label htmlFor="project-description">Projekta apraksts</label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Pastāsti, ko vēlies izveidot un kāda ir projekta ideja..."
            rows={6}
            maxLength={5000}
            required
          />

          {error && (
            <p className="create-project-error" role="alert">
              {error}
            </p>
          )}

          <div className="create-project-actions">
            <Link to="/dashboard" className="create-project-cancel">
              Atcelt
            </Link>
            <button type="submit" disabled={saving}>
              {saving ? 'Saglabā...' : 'Izveidot projektu'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
