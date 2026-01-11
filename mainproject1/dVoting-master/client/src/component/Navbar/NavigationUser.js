import React, { useState, useEffect } from "react";
import { NavLink, useHistory } from "react-router-dom";

import "./Navbar.css";

export default function NavigationUser() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.body.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  
  const handleLogout = () => {
    // With login removed, we don't need to remove loggedInUser from localStorage
    history.push("/");
  };
  
  return (
    <nav>
      <NavLink to="/user" className="header">
        <i className="fas fa-users"></i> User Dashboard
      </NavLink>
      <ul
        className="navbar-links"
        style={{ width: "35%", transform: open ? "translateX(0px)" : "" }}
      >
        <li>
          <NavLink to="/userhome" activeClassName="nav-active">
            <i className="fas fa-home" /> User Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/Verification" activeClassName="nav-active">
            <i className="fas fa-user-shield" /> Admin Panel
          </NavLink>
        </li>
        <li>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </li>
      </ul>
      <button onClick={toggleTheme} className="theme-toggle">
        {dark ? "Light" : "Dark"}
      </button>
      <i onClick={() => setOpen(!open)} className="fas fa-bars burger-menu"></i>
    </nav>
  );
}