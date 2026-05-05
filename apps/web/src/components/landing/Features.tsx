import "../../styles/components/Features.css";

const FEATURES = [
  {
    title: "AI Meeting Memory",
    description: "Decisions and action items captured automatically. Never lose track of what was discussed or who is responsible for what.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: "Spatial Presence",
    description: "See your team as avatars in a shared office. Recreate the organic 'desk-by' chats that build company culture.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
      </svg>
    )
  },
  {
    title: "Instant Catch Up",
    description: "Ask questions about past meetings in plain language. 'What did Sarah say about the budget?' Instant answers, zero digging.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  }
];

export function Features() {
  return (
    <section id="product" className="features">
      <div className="section-container">
        <div className="features__header">
          <span className="badge">Features</span>
          <h2>Everything you need for remote collaboration</h2>
        </div>
        
        <div className="features__grid">
          {FEATURES.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-card__icon">
                {feature.icon}
              </div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
