
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ProfilePage.css'

const API_URL = 'http://localhost:5000/api'

export default function ProfilePage() {
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Neizdevās ielādēt profilu.')
        }

        const data = await response.json()
        setDisplayName(data.user?.displayName || data.displayName || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Radās kļūda.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    const name = displayName.trim()

    if (name.length < 2 || name.length > 50) {
      setError('Vārdam jābūt no 2 līdz 50 rakstzīmēm.')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Neizdevās saglabāt profilu.')
      }

      setDisplayName(data.user?.displayName || data.displayName || name)
      setMessage('Profila vārds veiksmīgi saglabāts!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Radās kļūda.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="profile-page">Ielādē profilu...</div>
  }

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <button
          type="button"
          className="profile-back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Atpakaļ
        </button>

        <h1>Profila iestatījumi</h1>
        <p>Pārvaldi savu publisko profila informāciju.</p>
      </div>

      <form className="profile-form" onSubmit={handleSave}>
        <div className="profile-initial">
          {displayName.trim().charAt(0).toUpperCase() || '?'}
        </div>

        <div className="profile-form-field">
          <label htmlFor="displayName">Publiskais vārds</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Ievadi savu vārdu"
            minLength={2}
            maxLength={50}
            required
          />
          <small>
            Šis vārds būs redzams pie taviem publicētajiem projektiem.
            Tavs e-pasts citiem lietotājiem netiks rādīts.
          </small>
        </div>

        {message && <div className="profile-success">{message}</div>}
        {error && <div className="profile-error">{error}</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saglabā...' : 'Saglabāt izmaiņas'}
        </button>
      </form>
    </div>
  )
}
