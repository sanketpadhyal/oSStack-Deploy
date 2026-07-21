import logo from '../assets/logo.png'

const flowSteps = [
  'Login with GitHub',
  'Choose a frontend repository',
  'Start a deployment',
  'Receive a deployment ID immediately',
  'Join the private Socket.IO deployment room',
  'Watch clone, install, build, and upload events',
  'Open the live URL when the deployment completes',
]

const productRules = [
  'The deployment request returns quickly instead of waiting for the full build.',
  'Every deployment has a unique ID and a stored event history.',
  'Socket.IO handles live progress while REST handles actions and saved data.',
  'GitHub tokens and secrets stay on the backend and never reach the browser.',
  'A failed deployment keeps its logs and never replaces the last working version.',
  'Static files are stored by internal project and deployment IDs, not public slugs.',
]

function BlogPage() {
  return (
    <article className="blog-page">
      <div className="blog-backdrop" aria-hidden="true" />

      <header className="blog-hero">
        <div className="blog-hero__brand">
          <img src={logo} alt="" aria-hidden="true" />
          <span>oSStack blog</span>
        </div>

        <h1>How oSStack turns a GitHub repository into a live frontend deployment.</h1>
        <p>
          oSStack is an open-source deployment platform focused on one clean promise: choose a frontend repository,
          start a deploy, watch the build happen in real time, and receive a live URL when the production files are ready.
        </p>
      </header>

      <section className="blog-section">
        <h2>Your code, your deploy.</h2>
        <p>
          The product is designed for developers who want the simple deployment experience of a modern hosting platform
          without hiding the deployment lifecycle. The first version focuses on static React and Vite applications that
          produce a clean <code>dist/</code> folder after running a production build.
        </p>
        <p>
          The interface should feel simple, but the system underneath has clear responsibilities: authenticate with
          GitHub, validate repository access, create deployment records, build source code in an isolated environment,
          upload static output, and stream every important event back to the frontend.
        </p>
      </section>

      <section className="blog-section">
        <h2>One request starts the work. The timeline tells the story.</h2>
        <ol className="blog-flow">
          {flowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>
          The most important detail is that the initial deployment request does not stay open until the build finishes.
          The backend creates a deployment record, returns a deployment ID, and then continues the heavy work in the
          background. That ID becomes the handle for live updates, stored history, logs, errors, and the final URL.
        </p>
      </section>

      <section className="blog-section">
        <h2>REST starts the deployment. Socket.IO reports what happens after.</h2>
        <p>
          oSStack separates commands from live events. The REST API authenticates the user, fetches repositories, starts
          deployments, returns deployment IDs, and loads saved project history. Socket.IO is used for the fast-moving
          parts: queued, cloning, installing, building, uploading, completed, and failed events.
        </p>
        <p>
          Each Socket.IO event should also be saved in the database. That way, refreshing the page does not erase the
          deployment story. A user can return to a project and still see when the repository was cloned, when dependencies
          were installed, where the build failed, or which live URL was produced.
        </p>
      </section>

      <section className="blog-section">
        <h2>Clone, install, build, upload, activate.</h2>
        <p>
          After the deployment ID exists, the backend clones the selected repository into a temporary build directory.
          For private repositories, the backend uses the authenticated GitHub token securely on the server. Then it
          detects the package manager from lockfiles such as <code>package-lock.json</code>, <code>pnpm-lock.yaml</code>,
          or <code>yarn.lock</code>.
        </p>
        <p>
          Once dependencies are installed, the backend runs the production build command. For a Vite app, that usually
          means <code>npm run build</code>. The expected output is a static <code>dist/</code> directory containing
          <code>index.html</code> and bundled assets. Those files are uploaded to object storage using internal project
          and deployment IDs, keeping public slugs friendly while storage paths remain stable and unique.
        </p>
      </section>

      <section className="blog-section">
        <h2>A new deploy should never break the last good deploy.</h2>
        <ul className="blog-rules">
          {productRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p>
          This is the difference between a demo pipeline and a dependable deployment product. If a build fails, oSStack
          should mark it as failed, keep the logs, send the error through the realtime room, and continue serving the
          previous successful deployment. A project only points to a new active deployment after the build and upload
          complete successfully.
        </p>
      </section>

      <section className="blog-section blog-section--final">
        <h2>Start narrow. Make static frontend deployment feel excellent.</h2>
        <p>
          The first version does not need arbitrary Docker apps, persistent Node servers, databases, or background
          workers. The right starting point is focused: GitHub repository in, production <code>dist/</code> out, live URL
          ready. Once that pipeline is reliable, oSStack can grow into broader deployment types.
        </p>
      </section>
    </article>
  )
}

export default BlogPage
