import { useEffect, useState } from 'react'
import { profile, type GitHubRepository } from './data/profile'

function ArrowIcon() {
  return <span aria-hidden="true" className="arrow">↗</span>
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.65-1.24-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.43-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.54.23 2.68.11 2.96.72.78 1.15 1.77 1.15 2.99 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.02.75 2.06V22c0 .29.2.63.76.52A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  )
}

function LanguageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3c2.4 2.4 3.5 5.4 3.5 9s-1.1 6.6-3.5 9c-2.4-2.4-3.5-5.4-3.5-9S9.6 5.4 12 3Z" />
    </svg>
  )
}

const translations = {
  en: {
    navigation: 'Main navigation',
    projects: 'Projects',
    social: 'Social links',
    mobileProjects: 'PUBLIC PROJECTS',
    projectsHeading: 'Public projects',
    loading: 'Loading GitHub repositories…',
    loadError: 'Could not load repositories.',
    viewGithub: 'View GitHub profile',
    noProjects: 'No public repositories to show.',
    repositoryFallback: 'Public GitHub repository.',
    languagesAndTopics: 'Languages and topics',
    publicData: 'Public data from',
    switchLanguage: 'Switch language to Spanish',
    screenshot: 'Screenshot of',
    stars: 'stars',
  },
  es: {
    navigation: 'Navegación principal',
    projects: 'Proyectos',
    social: 'Redes sociales',
    mobileProjects: 'PROYECTOS PÚBLICOS',
    projectsHeading: 'Proyectos públicos',
    loading: 'Cargando repositorios de GitHub…',
    loadError: 'No se pudieron cargar los repositorios.',
    viewGithub: 'Ver perfil en GitHub',
    noProjects: 'No hay repositorios públicos para mostrar.',
    repositoryFallback: 'Repositorio público en GitHub.',
    languagesAndTopics: 'Lenguaje y temas',
    publicData: 'Datos públicos de',
    switchLanguage: 'Cambiar idioma a inglés',
    screenshot: 'Captura de',
    stars: 'estrellas',
  },
} as const

async function findRepositoryImage(
  repository: GitHubRepository,
  signal: AbortSignal,
): Promise<string | undefined> {
  try {
    const readmeUrl = `https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/README.md`
    const response = await fetch(readmeUrl, { signal })
    if (!response.ok) return undefined

    const readme = await response.text()
    const imageSources = [
      ...Array.from(readme.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]),
      ...Array.from(readme.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g), (match) => match[1]),
    ]
    const imageSource = imageSources.find((source) =>
      /\.(?:png|jpe?g|gif|webp)(?:[?#].*)?$/i.test(source),
    )
    if (!imageSource) return undefined
    if (/^https?:\/\//i.test(imageSource)) return imageSource

    const path = imageSource.replace(/^\.?\//, '')
    return new URL(
      path,
      `https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/`,
    ).toString()
  } catch {
    return undefined
  }
}

function App() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const copy = translations[language]

  useEffect(() => {
    let frame = 0
    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`)
        document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`)
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'en'
      ? 'Alberto Mareca — Senior Mobile Developer'
      : 'Alberto Mareca — Desarrollador móvil senior'
  }, [language])

  useEffect(() => {
    const cards = document.querySelectorAll('.project-card')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    )

    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [repositories])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRepositories() {
      try {
        const response = await fetch(profile.repositoriesApi, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`GitHub API: ${response.status}`)

        const data: GitHubRepository[] = await response.json()
        const ownRepositories = data.filter((repository) => !repository.fork)
        const repositoriesWithImages = await Promise.all(
          ownRepositories.map(async (repository) => ({
            ...repository,
            image: await findRepositoryImage(repository, controller.signal),
          })),
        )
        setRepositories(repositoriesWithImages)
      } catch {
        if (!controller.signal.aborted) setError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadRepositories()
    return () => controller.abort()
  }, [])

  return (
    <div className="site-shell">
      <div className="starfield" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />
      <div className="layout">
        <header className="sidebar">
          <div className="intro">
            <p className="eyebrow">{profile.location[language]}</p>
            <h1>{profile.name}</h1>
            <h2>{profile.role}</h2>
            <p className="tagline">{profile.tagline[language]}</p>
          </div>

          <nav className="section-nav" aria-label={copy.navigation}>
            <a className="nav-link active" href="#projects">
              <span className="nav-rule" />
              <span>{copy.projects}</span>
            </a>
          </nav>

          <div className="social-links" aria-label={copy.social}>
            <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub">
              <GitHubIcon />
            </a>
          </div>
        </header>

        <main className="content">
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            aria-label={copy.switchLanguage}
            title={copy.switchLanguage}
          >
            <LanguageIcon />
            <span>{language === 'en' ? 'ES' : 'EN'}</span>
          </button>

          <section className="content-section projects-section" id="projects">
            <p className="mobile-kicker">{copy.mobileProjects}</p>
            <div className="section-heading">
              <h2>{copy.projectsHeading}</h2>
              <span className="repo-count">{repositories.length.toString().padStart(2, '0')}</span>
            </div>

            {loading && <p className="status-message">{copy.loading}</p>}
            {!loading && error && (
              <p className="status-message">
                {copy.loadError}{' '}
                <a className="text-link" href={profile.github} target="_blank" rel="noreferrer">
                  {copy.viewGithub} <ArrowIcon />
                </a>
              </p>
            )}
            {!loading && !error && repositories.length === 0 && (
              <p className="status-message">{copy.noProjects}</p>
            )}

            {!loading && !error && repositories.length > 0 && (
              <div className="section-list">
                {repositories.map((repository) => {
                  const tags = [
                    repository.language,
                    ...repository.topics,
                  ].filter((tag): tag is string => Boolean(tag)).slice(0, 4)

                  return (
                    <a
                      className="project-card interactive-card"
                      href={repository.html_url}
                      key={repository.id}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {repository.image ? (
                        <span className="project-visual">
                          <img
                            src={repository.image}
                            alt={`${copy.screenshot} ${repository.name}`}
                            loading="lazy"
                          />
                        </span>
                      ) : (
                        <span className="project-mark" aria-hidden="true">
                          {repository.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="card-copy">
                        <h3>{repository.name} <ArrowIcon /></h3>
                        <p>{repository.description || copy.repositoryFallback}</p>
                        <div className="project-meta">
                          {repository.stargazers_count > 0 && (
                            <span className="stars" aria-label={`${repository.stargazers_count} ${copy.stars}`}>
                              ★ {repository.stargazers_count}
                            </span>
                          )}
                          {tags.length > 0 && (
                            <ul className="tags" aria-label={copy.languagesAndTopics}>
                              {tags.map((tag) => <li key={tag}>{tag}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </section>

          <footer className="footer">
            <p>
              {copy.publicData} <a href={profile.github} target="_blank" rel="noreferrer">@{profile.username} <ArrowIcon /></a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
