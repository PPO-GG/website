export const SITE = {
  name: 'PPO',
  domain: 'ppo.gg',
  email: 'hello@ppo.gg',
} as const

/** Lines the hero cycles through. Slow on purpose: each one is held long enough to read twice. */
export const TAGLINES: readonly string[] = [
  'Building the future, one system at a time.',
  'Software that is powerful, beautiful and fast.',
  'Advanced engineering. Zero friction.',
  'We make complex things simple to run.',
]

export interface Service {
  id: string
  title: string
  summary: string
  points: string[]
}

export const SERVICES: readonly Service[] = [
  {
    id: 'web-applications',
    title: 'Custom Web Applications',
    summary: 'Production-grade web apps, from first prototype to a platform your team relies on every day.',
    points: ['Product design and architecture', 'Real-time and collaborative features', 'Accessible, responsive front ends', 'Delivery in short, reviewable iterations'],
  },
  {
    id: 'platform-engineering',
    title: 'Platform & Systems Engineering',
    summary: 'APIs, services and cloud infrastructure built to scale and to stay maintainable.',
    points: ['API and service design', 'Cloud architecture and deployment', 'CI/CD and observability', 'Integration with existing systems'],
  },
  {
    id: 'design',
    title: 'Interface & Brand Design',
    summary: 'Interfaces that are clear, fast to learn and unmistakably yours.',
    points: ['UX research and flows', 'Design systems and component libraries', 'Brand and visual identity', 'Prototyping and usability testing'],
  },
  {
    id: 'modernization',
    title: 'Modernization & Performance',
    summary: 'Move legacy software forward without stopping the business that depends on it.',
    points: ['Code and architecture review', 'Incremental migration plans', 'Performance and cost optimization', 'Test coverage and refactoring'],
  },
  {
    id: 'automation',
    title: 'Automation & Applied AI',
    summary: 'Remove repetitive work and put modern AI to use where it measurably helps.',
    points: ['Workflow and process automation', 'AI-assisted tools and agents', 'Data pipelines and reporting', 'Evaluation and safe rollout'],
  },
  {
    id: 'advisory',
    title: 'Technical Advisory',
    summary: 'Senior technical leadership for teams that need direction, not just hands.',
    points: ['Fractional CTO engagements', 'Technology and vendor selection', 'Security and reliability reviews', 'Hiring and team coaching'],
  },
]

export const PROCESS: readonly { title: string; text: string }[] = [
  { title: 'Discover', text: 'We learn your goals, constraints and users before proposing anything.' },
  { title: 'Design', text: 'Architecture and interface are planned together, then reviewed with you.' },
  { title: 'Build', text: 'Short iterations with working software at every step.' },
  { title: 'Operate', text: 'We launch, monitor and keep improving what we ship.' },
]
