import {
  CloudUpload,
  GitBranch,
  Globe2,
  History,
  LockKeyhole,
  PackageCheck,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
  Upload,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import logo from '../assets/logo.png'
import profile from '../assets/profile.webp'

const features: Array<{ title: string; text: string; Icon: LucideIcon }> = [
  {
    title: 'GitHub first',
    text: 'Choose a frontend repository, branch, and slug without exposing tokens to the browser.',
    Icon: GitBranch,
  },
  {
    title: 'Realtime deploys',
    text: 'Follow clone, install, build, upload, and completion events as they happen.',
    Icon: Radio,
  },
  {
    title: 'Static output',
    text: 'Optimized for React and Vite apps that ship a clean production dist folder.',
    Icon: PackageCheck,
  },
  {
    title: 'Deployment history',
    text: 'Every status event and build log is saved, so users can refresh and still see what happened.',
    Icon: History,
  },
  {
    title: 'Safe rollouts',
    text: 'A failed deployment never replaces the active live version, keeping the last successful app online.',
    Icon: ShieldCheck,
  },
  {
    title: 'Storage-ready URLs',
    text: 'Production files are uploaded with internal project and deployment IDs, then served through friendly public slugs.',
    Icon: CloudUpload,
  },
]

const deployStages: Array<{ label: string; Icon: LucideIcon }> = [
  { label: 'Authenticate user', Icon: LockKeyhole },
  { label: 'Create deployment ID', Icon: Zap },
  { label: 'Join Socket.IO room', Icon: Radio },
  { label: 'Clone repository', Icon: GitBranch },
  { label: 'Install dependencies', Icon: PackageCheck },
  { label: 'Run production build', Icon: Terminal },
  { label: 'Upload dist files', Icon: Upload },
  { label: 'Activate live URL', Icon: Globe2 },
]

const safeguards: Array<{ title: string; text: string; Icon: LucideIcon }> = [
  {
    title: 'Fast REST response',
    text: 'The deploy request returns immediately with a deployment ID while the build continues in the background.',
    Icon: Zap,
  },
  {
    title: 'Private room updates',
    text: 'Only authorized clients can subscribe to a deployment room and receive logs or final URLs.',
    Icon: LockKeyhole,
  },
  {
    title: 'Previous deploy stays live',
    text: 'New builds only replace the active deployment after they complete successfully.',
    Icon: Server,
  },
]

function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-backdrop" aria-hidden="true" />

        <div className="hero-copy">
          <div className="hero-badge">
            <img src={logo} alt="" aria-hidden="true" />
            <span>Open-source deploy platform</span>
          </div>

          <h1 id="hero-title">Your code, your deploy</h1>
          <p className="hero-description">
            Deploy frontend apps from GitHub, stream every build step, and publish a live URL the moment it is ready.
          </p>

          <div className="hero-actions" aria-label="Deployment actions">
            <a className="hero-button hero-button--primary" href="/authentication">
              <CloudUpload aria-hidden="true" strokeWidth={2.7} />
              Start deploying
            </a>
          </div>
        </div>

        <figure className="hero-poster" aria-label="oSStack deployment poster">
          <img src={profile} alt="oSStack deployment preview" />
        </figure>
      </section>

      <section className="landing-band" id="resources" aria-label="Deployment flow">
        <div>
          <h2>One request starts the deploy. Socket events tell the story.</h2>
        </div>
      </section>

      <section className="feature-grid" aria-label="oSStack features">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <span className="card-icon">
              <feature.Icon aria-hidden="true" strokeWidth={2.5} />
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="pipeline-section" aria-label="Full deployment pipeline">
        <div className="section-heading">
          <h2>From repository selection to live URL.</h2>
          <p>
            oSStack turns a GitHub repository into a versioned static deployment, with every stage saved for refresh-safe history.
          </p>
        </div>

        <div className="pipeline-list">
          {deployStages.map((stage, index) => (
            <div className="pipeline-item" key={stage.label}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <stage.Icon aria-hidden="true" strokeWidth={2.5} />
              <p>{stage.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="safeguard-section" aria-label="Deployment safeguards">
        <div className="section-heading">
          <h2>Built for reliable deploys, not lucky deploys.</h2>
        </div>

        <div className="safeguard-grid">
          {safeguards.map((item) => (
            <article className="safeguard-card" key={item.title}>
              <span className="card-icon">
                <item.Icon aria-hidden="true" strokeWidth={2.5} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta" aria-label="Start deploying">
        <img src={logo} alt="" aria-hidden="true" />
        <h2>Deploy your next Vite app with a live build timeline.</h2>
        <a className="hero-button hero-button--primary" href="/authentication">
          <GitBranch aria-hidden="true" strokeWidth={2.7} />
          Authenticate with GitHub
        </a>
      </section>

      <footer className="site-footer">
        <div>
          <img src={logo} alt="" aria-hidden="true" />
          <span>oSStack</span>
        </div>
        <p>Your code, your deploy.</p>
      </footer>
    </div>
  )
}

export default LandingPage
