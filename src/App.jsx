const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Join', href: '#join' },
  { label: 'Contact', href: '#contact' },
  { label: 'Standards', href: '#standards' },
  { label: 'Roadmap', href: '#roadmap' },
];

const workSteps = [
  {
    title: 'Scan',
    text: 'BrandTrace is being designed to help consumers identify products and brands quickly from trusted product records.',
  },
  {
    title: 'Trace',
    text: 'Ownership details, acquisition history, and parent-company relationships will be documented with source links where available.',
  },
  {
    title: 'Decide',
    text: 'Consumers can use factual information to make their own choices, including personal watchlists for products they want to follow.',
  },
];

const principles = [
  'Clearly separate verified information, pending review, community submissions, and opinion.',
  'Use reliable public sources and preserve source references for ownership claims.',
  'Avoid unsupported accusations, exaggerated claims, and partisan framing.',
  'Give transparent organizations and locally or family-owned businesses room to be recognized.',
];

const roadmapItems = [
  'Public website foundation and project documentation',
  'Source review workflow and verification standards',
  'Early product and ownership data model',
  'Community contribution and correction intake',
  'Mobile scanning experience and personal watchlists',
];

function Header() {
  return (
    <header className="site-header">
      <nav className="nav container" aria-label="Primary navigation">
        <a className="brand" href="#home" aria-label="BrandTrace home">
          <span className="brand-mark">BT</span>
          <span>BrandTrace</span>
        </a>
        <div className="nav-links">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function App() {
  return (
    <>
      <Header />
      <main>
        <section id="home" className="hero section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Consumer transparency through source-based ownership information</p>
              <h1>Scan. Trace. Decide.</h1>
              <p className="hero-text">
                BrandTrace helps consumers understand who owns the products they purchase. We document ownership information, verify sources, and let consumers decide for themselves.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#join">Join the Project</a>
                <a className="button secondary" href="#standards">View Standards</a>
              </div>
            </div>
            <div className="hero-card" aria-label="BrandTrace principles">
              <span className="status-pill">In development</span>
              <h2>Built for trust, not pressure.</h2>
              <p>
                BrandTrace is not a political platform, corporate attack platform, or boycott app. It is a factual transparency tool for people who want better context.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="section light-section">
          <div className="container two-column">
            <SectionHeader eyebrow="About" title="A clear view of product ownership.">
              BrandTrace exists to make ownership relationships easier to understand without telling people what to think.
            </SectionHeader>
            <div className="content-card">
              <h3>Our mission</h3>
              <p>
                Developed by Ember Fire Media, BrandTrace aims to become a trusted source for product ownership information, acquisition context, and transparent source records.
              </p>
              <p>
                The platform is designed for neutral consumer education: document the information, verify the sources, and give people the confidence to make informed choices.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <SectionHeader eyebrow="How BrandTrace Works" title="A simple path from product to context." />
            <div className="card-grid three">
              {workSteps.map((step) => (
                <article className="content-card step-card" key={step.title}>
                  <span className="step-number">{step.title}</span>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="standards" className="section light-section">
          <div className="container two-column">
            <SectionHeader eyebrow="Verification Standards" title="Facts first. Sources visible. Claims reviewed.">
              BrandTrace is being built around careful verification practices so ownership data remains useful, fair, and accountable.
            </SectionHeader>
            <ul className="principle-list">
              {principles.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section spotlight-section">
          <div className="container spotlight-card">
            <div>
              <p className="eyebrow">Transparency Spotlight</p>
              <h2>Recognition for organizations that embrace openness.</h2>
            </div>
            <p>
              BrandTrace is not only about tracing large corporate ownership. The project also aims to recognize transparent businesses, locally owned companies, family-owned brands, and organizations that voluntarily make ownership easier to understand.
            </p>
          </div>
        </section>

        <section id="join" className="section light-section">
          <div className="container two-column">
            <SectionHeader eyebrow="Join the Project" title="Help build a more transparent product landscape.">
              Researchers, designers, developers, business owners, and careful community reviewers can help BrandTrace grow responsibly.
            </SectionHeader>
            <div className="content-card">
              <h3>Early contributors are welcome</h3>
              <p>
                The current priority is a trustworthy foundation: verification rules, research workflows, product records, and clear public communication.
              </p>
              <a className="text-link" href="mailto:hello@brandtrace.fyi">hello@brandtrace.fyi</a>
            </div>
          </div>
        </section>

        <section id="roadmap" className="section">
          <div className="container two-column">
            <SectionHeader eyebrow="Roadmap" title="Build carefully before scaling.">
              BrandTrace will grow in phases, prioritizing trust and documentation before advanced product features.
            </SectionHeader>
            <ol className="roadmap-list">
              {roadmapItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <div className="container contact-card">
            <p className="eyebrow">Contact</p>
            <h2>Questions, corrections, or partnership ideas?</h2>
            <p>
              Reach the BrandTrace team for source submissions, verification questions, transparent business recognition, or early project collaboration.
            </p>
            <a className="button primary" href="mailto:hello@brandtrace.fyi">Contact BrandTrace</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <p>Developed by Ember Fire Media</p>
          <p>BrandTrace.fyi</p>
          <p>Scan. Trace. Decide.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
