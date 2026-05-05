import { SignInButton } from "@clerk/react";
import "../../styles/components/Hero.css";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__content">
        <span className="badge">New: AI Spatial Memory</span>
        <h1 className="hero__title">Work Together, Wherever.</h1>
        <p className="hero__subtitle">
          The 2D virtual office that remembers everything so your team doesn't have to. 
          Bridge the gap between remote and physical presence.
        </p>
        <div className="hero__actions">
          <SignInButton mode="modal">
            <button className="hero__primary-btn">Get Started for Free</button>
          </SignInButton>
          <button className="hero__secondary-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.83331 3.33334L15.8333 10L5.83331 16.6667V3.33334Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Watch Demo
          </button>
        </div>
      </div>
      
      <div className="hero__preview">
        {/* Using a placeholder for now, user can replace with actual product screenshot */}
        <img 
          src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=2070" 
          alt="RoomMind Platform Preview" 
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px 40px',
          borderRadius: '12px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          RoomMind Spatial Office
        </div>
      </div>
    </section>
  );
}
