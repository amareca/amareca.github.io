export const profile = {
  username: 'amareca',
  name: 'Alberto Mareca',
  role: 'Senior Mobile Developer',
  tagline: {
    en: 'Mobile and cross-platform development.',
    es: 'Desarrollo móvil y multiplataforma',
  },
  location: {
    en: 'Zaragoza, Spain',
    es: 'Zaragoza, España',
  },
  github: 'https://github.com/amareca',
  repositoriesApi:
    'https://api.github.com/users/amareca/repos?type=owner&sort=updated&per_page=100',
}

export type GitHubRepository = {
  id: number
  name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  topics: string[]
  fork: boolean
  full_name: string
  default_branch: string
  image?: string
}
