import { useState, useEffect } from 'react';
import { SignInButton } from "@clerk/react";
import "../../styles/components/Navbar.css";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`rm-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="rm-navbar__inner">
        <div className="rm-navbar__logo">
          <div className="rm-navbar__logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>RoomMind</span>
        </div>

        <nav className="rm-navbar__nav">
          <a href="#product" className="rm-navbar__link">Product</a>
          <a href="#pricing" className="rm-navbar__link">Pricing</a>
          <a href="#about" className="rm-navbar__link">About</a>
        </nav>

        <div className="rm-navbar__actions">
          <SignInButton mode="modal">
            <button className="rm-navbar__signin">Sign In</button>
          </SignInButton>
          <SignInButton mode="modal">
            <button className="rm-navbar__cta">Get Started</button>
          </SignInButton>
        </div>

        <button className="rm-navbar__hamburger">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
