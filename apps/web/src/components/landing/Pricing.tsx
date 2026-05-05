import "../../styles/components/Pricing.css";

const PLANS = [
  {
    type: "Growth",
    title: "Small Teams",
    price: "$15",
    period: "/user/month",
    features: [
      "All AI features included",
      "Standard 2D Canvas Zones",
      "30-day meeting memory"
    ],
    cta: "Start Free Trial",
    variant: "primary"
  },
  {
    type: "Scale",
    title: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited meeting memory",
      "SSO & Advanced Security",
      "Dedicated Success Manager",
      "Custom Canvas Layouts"
    ],
    cta: "Contact Sales",
    variant: "secondary",
    popular: true
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="pricing">
      <div className="section-container">
        <div className="text-center">
          <span className="badge">Pricing</span>
          <h2 className="pricing-card__title" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-4)' }}>
            Pricing Built for Growth
          </h2>
          <p style={{ color: 'var(--color-text-light)', maxWidth: '500px', margin: '0 auto var(--space-12)' }}>
            Choose the plan that fits your team's size and ambition.
          </p>
        </div>

        <div className="pricing__grid">
          {PLANS.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''}`}>
              {plan.popular && <div className="pricing-card__popular-badge">POPULAR</div>}
              
              <div className="pricing-card__type">{plan.type}</div>
              <h3 className="pricing-card__title">{plan.title}</h3>
              <div className="pricing-card__price">
                {plan.price}<span>{plan.period}</span>
              </div>
              
              <ul className="pricing-card__features">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="pricing-card__feature">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button className={`pricing-card__cta ${plan.variant === 'primary' ? 'pricing-card__cta--primary' : 'pricing-card__cta--secondary'}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
