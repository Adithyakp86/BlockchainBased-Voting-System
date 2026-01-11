import React from "react";

import "./Footer.css";

const Footer = () => (
  <>
    <div className="footer-block"></div>
    <div className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <h3 className="footer-title">dVoting</h3>
          <p className="footer-description">
            A decentralized voting system built on Ethereum blockchain technology. 
            Secure, transparent, and tamper-proof elections for the modern world.
          </p>
          <div className="footer-links">
            <a href="https://github.com/Adithyakp86" className="footer-link" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-github"></i>
              GitHub
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">
            Made with <i className="fas fa-heart"></i> by{" "}
            <span className="profile">
              Group 7
            </span>
            . Powered by Ethereum & React.
          </p>
        </div>
      </div>
    </div>
  </>
);

export default Footer;
