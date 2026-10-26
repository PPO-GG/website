export const SITE = {
  name: 'PPO',
  domain: 'ppo.gg',
  email: 'hello@ppo.gg',
  /** Shown in the status strip above the header. */
  banner: 'OPEN SOURCE // UNCLASSIFIED',
} as const

/** Lines the hero cycles through. Slow on purpose: each one is held long enough to read twice. */
export const TAGLINES: readonly string[] = [
  'Building the future, one system at a time.',
  'Signal from noise.',
  'Open data in. Decisions out.',
  'Software that is powerful, beautiful and fast.',
  'Advanced engineering. Zero friction.',
]

export interface Service {
  title: string
  summary: string
  points: string[]
}

export const SERVICES: readonly Service[] = [
  {
    title: 'Custom Web Applications',
    summary: 'Production-grade web apps, from first prototype to a platform your team relies on every day.',
    points: ['Product design and architecture', 'Real-time and collaborative features', 'Accessible, responsive front ends', 'Delivery in short, reviewable iterations'],
  },
  {
    title: 'Platform & Systems Engineering',
    summary: 'APIs, services and cloud infrastructure built to scale and to stay maintainable.',
    points: ['API and service design', 'Cloud architecture and deployment', 'CI/CD and observability', 'Integration with existing systems'],
  },
  {
    title: 'Interface & Brand Design',
    summary: 'Interfaces that are clear, fast to learn and unmistakably yours.',
    points: ['UX research and flows', 'Design systems and component libraries', 'Brand and visual identity', 'Prototyping and usability testing'],
  },
  {
    title: 'Modernization & Performance',
    summary: 'Move legacy software forward without stopping the business that depends on it.',
    points: ['Code and architecture review', 'Incremental migration plans', 'Performance and cost optimization', 'Test coverage and refactoring'],
  },
  {
    title: 'Intelligence & OSINT Platforms',
    summary: 'Tooling that turns open-source data into analysis: collect, correlate and brief faster.',
    points: ['Collection and data-fusion pipelines', 'Entity extraction and link analysis', 'Geospatial and timeline dashboards', 'AI-assisted triage with human review'],
  },
  {
    title: 'Technical Advisory',
    summary: 'Senior technical leadership for teams that need direction, not just hands.',
    points: ['Fractional CTO engagements', 'Technology and vendor selection', 'Security and reliability reviews', 'Workflow automation and coaching'],
  },
]

export const PROCESS: readonly { title: string; text: string }[] = [
  { title: 'Discover', text: 'We learn your goals, constraints and users before proposing anything.' },
  { title: 'Design', text: 'Architecture and interface are planned together, then reviewed with you.' },
  { title: 'Build', text: 'Short iterations with working software at every step.' },
  { title: 'Operate', text: 'We launch, monitor and keep improving what we ship.' },
]
