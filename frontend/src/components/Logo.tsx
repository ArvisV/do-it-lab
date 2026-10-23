
import './Logo.css'

type LogoProps = {
  light?: boolean
}

function Logo({ light = false }: LogoProps) {
  return (
    <a
      className={`brand${light ? ' brand-light' : ''}`}
      href="/"
      aria-label="Do It Lab sākumlapa"
    >
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

export default Logo
