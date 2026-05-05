import { SignInButton } from "@clerk/react";
import "../../styles/components/CallToAction.css";

export function CallToAction() {
  return (
    <section className="cta-section">
      <h2 className="cta-section__title">Ready to bring your team home?</h2>
      <p className="cta-section__subtitle">
        Join 500+ remote-first companies building more connected and informed teams with RoomMind.
      </p>
      <SignInButton mode="modal">
        <button className="cta-section__btn">Get Started for Free</button>
      </SignInButton>
    </section>
  );
}
