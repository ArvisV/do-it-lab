
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import '../App.css'
import './AuthPages.css'

const API_URL = 'http://localhost:5000/api'

export default function VerifyEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const initialEmail = location.state?.email ?? ''

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1800)

      return () => window.clearTimeout(timer)
    }
  }, [success, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(code)) {
      setError('Ievadi sešu ciparu apstiprināšanas kodu.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'E-pasta apstiprināšana neizdevās.')
        return
      }

      setSuccess(true)
    } catch {
      setError(
        'Neizdevās sazināties ar serveri. Pārbaudi backend darbību.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-form-side">
          <div className="auth-form-container">
            <div className="auth-mobile-brand">
              <Logo />
            </div>

            <div className="auth-heading">
              <span className="eyebrow">Konts apstiprināts</span>
              <h2>E-pasts veiksmīgi apstiprināts!</h2>
              <p>
                Tavs Do It Lab konts ir gatavs lietošanai.
                Pāradresējam tevi uz tavu dashboard...
              </p>
            </div>

            <div className="auth-success">
              <span aria-hidden="true">✓</span>
              <strong>Reģistrācija pabeigta!</strong>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Logo light />

        <div className="auth-visual-copy">
          <span className="eyebrow">Vēl tikai viens solis</span>
          <h1>
            Apstiprini savu
            <br />
            <em>e-pasta adresi.</em>
          </h1>
          <p>
            Pārbaudi savu e-pastu un ievadi saņemto kodu,
            lai pabeigtu reģistrāciju.
          </p>
        </div>

        <img
          className="auth-visual-image"
          src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85"
          alt="Radoša darba vieta"
        />

        <span className="auth-visual-footer">
          Idejām, kas pelnījušas kļūt īstas.
        </span>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <Logo />
          </div>

          <div className="auth-heading">
            <span className="eyebrow">E-pasta pārbaude</span>
            <h2>Ievadi apstiprināšanas kodu</h2>
            <p>
              Uz e-pastu <strong>{email}</strong> nosūtījām
              sešu ciparu kodu.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="verification-code">
              Apstiprināšanas kods
            </label>

            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength={6}
              required
              disabled={loading}
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Pārbaudām kodu...' : 'Apstiprināt e-pastu'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            Nepareizs e-pasts?
            <Link to="/register"> Atgriezties reģistrācijā</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
