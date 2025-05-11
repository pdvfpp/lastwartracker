import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import playerData from './playerData';
import './Header.css';

function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClick = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Sorted list of unique alliances
  const alliances = useMemo(
    () => Array.from(new Set(playerData.map(p => p.alliance))).sort(),
    []
  );

  // Suggestions: alliance (exact prefix), then players
  const suggestions = useMemo(() => {
    if (searchTerm.length < 3) return [];
    const term = searchTerm.toLowerCase();
    const allianceMatches = alliances
      .filter(a => a.toLowerCase().startsWith(term))
      .map(a => ({ type: 'alliance', name: a, label: `${a} (alliance)` }));
    const playerMatches = playerData
      .map(p => p.player)
      .filter(n => n.toLowerCase().startsWith(term))
      .map(n => ({ type: 'player', name: n, label: n }));
    return [...allianceMatches, ...playerMatches];
  }, [searchTerm, alliances]);

  // Navigate on explicit Enter or suggestion click, or auto‐clear when <3 chars
  const applySearch = value => {
    if (value.length >= 3) {
      navigate(`/?search=${encodeURIComponent(value)}`);
    } else {
      navigate(`/`);
    }
    setShowSuggestions(false);
  };

  return (
    <header className="header" ref={wrapperRef}>
      <div className="header-left">
        <div className="logo">
          <img src="/lwt_logo.jpeg" alt="Logo" className="logo-img" />
        </div>
        <nav className="nav-links">
          <NavLink to="/" className="nav-link">Player Tracker</NavLink>
          <NavLink to="/compare-server" className="nav-link">Compare Server</NavLink>
          <NavLink to="/compare-alliance" className="nav-link">Compare Alliance</NavLink>
        </nav>
      </div>

      <div className="header-right" style={{ position: 'relative' }}>
        <input
          type="text"
          className="quick-search"
          placeholder="Search player or alliance"
          value={searchTerm}
          onChange={e => {
            const v = e.target.value;
            setSearchTerm(v);
            setShowSuggestions(v.length >= 3);
            if (v.length < 3) applySearch('');  // auto-clear filters
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchTerm.length >= 3) {
              applySearch(searchTerm);
            }
          }}
          style={{
            padding: '10px 36px 10px 12px',
            width: 280,
            borderRadius: 10,
            border: '1px solid grey',
            backgroundColor: '#121417',
            color: 'grey',
            outline: 'none',
          }}
        />
        <span style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'grey',
          pointerEvents: 'none',
          fontSize: 16,
        }}>🔍</span>

        {showSuggestions && suggestions.length > 0 && (
          <ul style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#1f2833',
            color: '#c5c6c7',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #444',
            borderRadius: 4,
            zIndex: 1000,
          }}>
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={() => {
                  setSearchTerm(s.name);
                  applySearch(s.name);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #333',
                }}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

export default Header;