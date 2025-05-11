import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <img src="/lwt_logo.jpeg" alt="Last War Tracker Logo" className="logo-img" />
        </div>
        <nav className="nav-links">
          <NavLink to="/" className="nav-link">Player Tracker</NavLink>
          <NavLink to="/compare-server" className="nav-link">Compare Server</NavLink>
          <NavLink to="/compare-alliance" className="nav-link">Compare Alliance</NavLink>
        </nav>
      </div>
      <div className="header-right">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            className="quick-search"
            placeholder="Quick search players/alliances..."
            style={{
              padding: '10px 36px 10px 12px',
              fontSize: '14px',
              width: '280px',
              borderRadius: '10px',
              border: '1px solid grey',
              backgroundColor: '#121417',
              color: 'grey',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '12px',
              color: 'grey',
              pointerEvents: 'none',
              fontSize: '16px',
            }}
          >
            🔍
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;