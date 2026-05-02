import { SignInButton } from "@clerk/react";  


export function LandingPage() {
  return (
    <div className="landing-page">
      <div>
        <h1>Aiverse</h1>
        <p>Build and explore workspaces with your team.</p>
      </div>
      <SignInButton mode="modal">
        <button className="cta-btn" type="button">
          Get Started
        </button>
      </SignInButton>
    </div>
  );
}
