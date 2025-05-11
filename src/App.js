import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './Header';
import PlayerTracker from './PlayerTracker';
import CompareServer from './CompareServer';
import CompareAlliance from './CompareAlliance';

function App() {
  return (
    <Router>
      <Header />
      <div className="App">
        <Routes>
          <Route path="/" element={<PlayerTracker />} />
          <Route path="/compare-server" element={<CompareServer />} />
          <Route path="/compare-alliance" element={<CompareAlliance />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;