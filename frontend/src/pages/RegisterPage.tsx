
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'
import './AuthPages.css'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (password.length < 8) {
      setError('Parolei jābūt vismaz 8 rakstzīmes garai.')
      return
    }

    if (new TextEncoder().encode(password).length > 128) {
      setError('Parole ir pārāk gara.')
      return
    }

    if (password !== confirmPassword) {
      setError('Paroles nesakrīt. Pārbaudi abus laukus.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message ||
            'Reģistrācija neizdevās. Pārbaudi datus un mēģini vēlreiz.',
        )
        return
      }

      navigate('/verify-email', {
        state: { email: normalizedEmail },
      })
    } catch {
      setError(
        'Neizdevās sazināties ar serveri. Pārbaudi, vai backend darbojas.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-icon">✳</span>
          <span>Do It <strong>Lab</strong></span>
        </Link>

        <div className="auth-visual-copy">
          <span className="eyebrow">Radi. Mācies. Dalies.</span>
          <h1>
            Katra lielā ideja
            <br />
            sākas ar <em>pirmo soli.</em>
          </h1>
          <p>
            Pievienojies radošai kopienai, dokumentē savu
            projektu tapšanu un iedvesmojies no citiem.
          </p>
        </div>

        <img
          className="auth-visual-image"
          src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85"
          alt="Mājīga un radoša darba vieta ar augiem"
        />

        

        <span className="auth-visual-footer">
          Idejām, kas pelnījušas kļūt īstas.
        </span>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-brand">
              <span className="auth-brand-icon">✳</span>
              <span>Do It <strong>Lab</strong></span>
            </Link>
          </div>

          <div className="auth-heading">
            <span className="eyebrow">Pievienojies kopienai</span>
            <h2>Izveido savu kontu</h2>
            <p>
              Sāc dalīties ar savām idejām un projektiem.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-email">E-pasta adrese</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="tavs@epasts.lv"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />

            <label htmlFor="register-password">Parole</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="Vismaz 8 rakstzīmes"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading}
            />

            <label htmlFor="register-confirm-password">
              Atkārto paroli
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Ievadi paroli vēlreiz"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
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
              disabled={loading}
            >
              {loading ? 'Veidojam kontu...' : 'Izveidot kontu'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>

            <p className="auth-terms">
              Reģistrējoties tu piekrīti platformas lietošanas
              noteikumiem un privātuma politikai.
            </p>
          </form>

          <div className="auth-switch">
            Tev jau ir konts?
            <Link to="/login"> Pieteikties</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
