
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import '../App.css'
import './AuthPages.css'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Pieteikšanās neizdevās. Pārbaudi datus.')
        return
      }

      navigate('/dashboard')
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
        <div className="auth-brand">
          <Logo light />
        </div>

        <div className="auth-visual-copy">
          <span className="eyebrow">Radi. Mācies. Dalies.</span>
          <h1>
            Tavas idejas
            <br />
            turpina augt <em>šeit.</em>
          </h1>
          <p>
            Atgriezies savā radošajā telpā, turpini projektus
            un iedvesmojies no citu cilvēku idejām.
          </p>
        </div>

        <img
          className="auth-visual-image"
          src="https://www.marapon.com/cdn/shop/articles/diy_3a8f7fae-5c6c-48e1-bd47-5abd6298a295.png?v=1772627057&width=1500"
          alt="Radoša darba vieta ar rokdarbu piederumiem"
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
            <span className="eyebrow">Laipni lūgts atpakaļ!</span>
            <h2>Pieslēdzies savam kontam</h2>
            <p>
              Ievadi savus datus, lai turpinātu darbu pie savām idejām.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">E-pasta adrese</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="tavs@epasts.lv"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />

            <label htmlFor="login-password">Parole</label>
            <div className="login-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ievadi savu paroli"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Paslēpt paroli' : 'Parādīt paroli'}
              >
                {showPassword ? 'Paslēpt' : 'Parādīt'}
              </button>
            </div>

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
              {loading ? 'Pieslēdzas...' : 'Pieteikties'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            Tev vēl nav konta?
            <Link to="/register"> Reģistrēties</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
