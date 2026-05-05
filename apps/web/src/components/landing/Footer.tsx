import "../../styles/components/Footer.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">RoomMind</div>
          <p className="footer__copyright">
            © {currentYear} RoomMind. Crafted for human connection.
          </p>
        </div>

        <nav className="footer__links">
          <a href="#product" className="footer__link">Product</a>
          <a href="#pricing" className="footer__link">Pricing</a>
          <a href="#about" className="footer__link">About</a>
          <a href="#" className="footer__link">Privacy</a>
          <a href="#" className="footer__link">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
