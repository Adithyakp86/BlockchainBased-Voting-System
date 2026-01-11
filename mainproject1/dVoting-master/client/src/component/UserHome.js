import React, { useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import NavigationUser from "./Navbar/NavigationUser";

function UserHome(props) {
  const history = useHistory();
  const hideNavbar = props.hideNavbar || false;
  
  // Check if user is logged in with our new system
  useEffect(() => {
    // With the login requirement removed, we don't need to check for login status
    // All users can access voting features directly
  }, []);
  
  const handleLogout = () => {
    // With login removed, we don't need to remove loggedInUser from localStorage
    history.push("/");
  };
  
  return (
    <>
      {!hideNavbar && <NavigationUser />}
      <div className="container-main">
        {/* Election Header */}
        <div className="container-item center-items success">
          <div style={{textAlign: 'center'}}>
            <i className="fas fa-vote-yea" style={{fontSize: '3rem', color: 'var(--success-text)', marginBottom: '1rem'}}></i>
            <h1 style={{color: 'var(--success-text)', marginBottom: '0.5rem'}}>Blockchain Voting System</h1>
            <p style={{color: 'var(--success-text)', fontSize: '1.2rem', marginBottom: '1.5rem'}}>Secure & Transparent Elections</p>
            <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
              <Link to="/elections" className="btn btn-primary" style={{textDecoration: 'none'}}>
                <i className="fas fa-list"></i>
                View All Elections
              </Link>
              <Link to="/registrations" className="btn btn-success" style={{textDecoration: 'none'}}>
                <i className="fas fa-user-plus"></i>
                Register for Elections
              </Link>
              <Link to="/user?voting" className="btn btn-info" style={{textDecoration: 'none'}}>
                <i className="fas fa-vote-yea"></i>
                Cast Your Vote
              </Link>
              <Link to="/results" className="btn btn-warning" style={{textDecoration: 'none'}}>
                <i className="fas fa-poll"></i>
                View Results
              </Link>
              <Link to="/user" className="btn btn-danger" style={{textDecoration: 'none'}}>
                <i className="fas fa-users"></i>
                User Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-dark" style={{textDecoration: 'none', border: 'none', cursor: 'pointer'}}>
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quick Rules */}
        <div className="container-item attention">
          <h3 style={{color: 'var(--attention-text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <i className="fas fa-exclamation-triangle"></i>
            Important Voting Rules
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <i className="fas fa-user-check" style={{color: 'var(--attention-text)'}}></i>
              <span style={{color: 'var(--attention-text)'}}>Register first to vote</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <i className="fas fa-shield-alt" style={{color: 'var(--attention-text)'}}></i>
              <span style={{color: 'var(--attention-text)'}}>One vote per person</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <i className="fas fa-lock" style={{color: 'var(--attention-text)'}}></i>
              <span style={{color: 'var(--attention-text)'}}>Vote cannot be changed</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <i className="fas fa-clock" style={{color: 'var(--attention-text)'}}></i>
              <span style={{color: 'var(--attention-text)'}}>Vote before election ends</span>
            </div>
          </div>
        </div>
        
        {/* How to Participate */}
        <div className="container-item info">
          <h3 style={{color: 'var(--info-text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <i className="fas fa-question-circle"></i>
            How to Participate
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem'}}>
            <div>
              <h4 style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>1. View Elections</h4>
              <p style={{color: 'var(--text-muted)'}}>Click "View All Elections" to see available elections</p>
            </div>
            <div>
              <h4 style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>2. Register</h4>
              <p style={{color: 'var(--text-muted)'}}>Register for the election you want to participate in</p>
            </div>
            <div>
              <h4 style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>3. Get Verified</h4>
              <p style={{color: 'var(--text-muted)'}}>Wait for admin verification of your registration</p>
            </div>
            <div>
              <h4 style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>4. Vote</h4>
              <p style={{color: 'var(--text-muted)'}}>Cast your vote once verification is complete</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserHome;