import React, { useState, useEffect, useRef, useMemo } from 'react';
import playerData from './playerData';
import { ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import './CompareAlliance.css';

// Persist slots across unmounts
let _savedAllianceSlots = [];
function usePersistentAllianceSlots() {
  const [slots, setSlots] = useState(() => _savedAllianceSlots);
  useEffect(() => { _savedAllianceSlots = slots; }, [slots]);
  return [slots, setSlots];
}

// Global histogram settings (shared with CompareServer)
const BIN_SIZE = 10_000_000;
const allPowers = playerData.map(p => p.power);
const globalMin = Math.floor(Math.min(...allPowers) / BIN_SIZE) * BIN_SIZE;
const globalMax = Math.ceil(Math.max(...allPowers) / BIN_SIZE) * BIN_SIZE;

// Power-rate norm by alliance
const allianceRates = (() => {
  const p = 2;
  const sums = {};
  playerData.forEach(({ alliance, power }) => {
    sums[alliance] = (sums[alliance] || 0) + Math.pow(power, p);
  });
  const norms = Object.fromEntries(
    Object.entries(sums).map(([al, sumP]) => [al, Math.pow(sumP, 1 / p)])
  );
  const maxNorm = Math.max(...Object.values(norms));
  return Object.fromEntries(
    Object.entries(norms).map(([al, val]) => [al, Math.round((val / maxNorm) * 10000) / 100])
  );
})();

// Unique sorted alliance list
const alliances = Array.from(new Set(playerData.map(p => p.alliance))).sort();

function AllianceSlot({ id, alliance, onRemove, onChangeAlliance, alliances, dragHandlers }) {
  const [inputValue, setInputValue] = useState(alliance || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = inputValue
    ? alliances.filter(a => a.startsWith(inputValue))
    : [];

  // members and totals
  const members = useMemo(() => {
  if (alliances.includes(alliance)) {
    return playerData.filter(p => p.alliance === alliance);
  }
  return [];
}, [alliance]);
  const totalPowerRaw = members.reduce((sum, p) => sum + p.power, 0);
  const totalPowerG = Math.round((totalPowerRaw / 1e9) * 100) / 100;

  // top-3 players
  const topPlayers = useMemo(
    () => members.sort((a, b) => b.power - a.power).slice(0, 3),
    [members]
  );

  // histogram data
  const histData = useMemo(() => {
    const counts = {};
    members.forEach(p => {
      const bin = Math.floor(p.power / BIN_SIZE) * BIN_SIZE;
      counts[bin] = (counts[bin] || 0) + 1;
    });
    const data = [];
    for (let b = globalMin; b <= globalMax; b += BIN_SIZE) {
      data.push({ bin: b, count: counts[b] || 0 });
    }
    return data;
  }, [members]);

  const confirm = v => {
    setInputValue(v);
    if (alliances.includes(v)) onChangeAlliance(id, v);
    setShowSuggestions(false);
  };

  return (
    <div className="alliance-slot" ref={wrapperRef} {...dragHandlers}>
      <button className="remove-slot-button" onClick={() => onRemove(id)}>×</button>

      {alliances.includes(alliance) && (
        <div className="alliance-octagon">{alliance}</div>
      )}

      <input
        className="alliance-select"
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
          setShowSuggestions(e.target.value.length > 0);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={e => e.key === 'Enter' && confirm(inputValue)}
        placeholder="Select alliance"
      />

      {showSuggestions && (
        <ul className="alliance-dropdown">
          {filtered.map(a => (
            <li key={a} onMouseDown={() => confirm(a)}>{a}</li>
          ))}
        </ul>
      )}

      {alliances.includes(alliance) && (
        <>
          <div className="alliance-info">
            <p><strong>Power rate:</strong> <span className="power-rate-value">{allianceRates[alliance]}</span></p>
            <p><strong>Total Power:</strong> <span className="total-power-value">{totalPowerG} G</span></p>
            <p><strong>Members:</strong> <span className="total-power-value">{members.length}</span></p>
          </div>
          <div style={{ marginTop: -136, marginLeft: 400, width: 480, height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData} margin={{ top: 0, right: 20, left: 20, bottom: -4 }}>
                <XAxis
                  dataKey="bin"
                  type="number"
                  domain={[globalMin, globalMax]}
                  tickFormatter={v => `${v / 1e6}M`}
                  axisLine={{ stroke: '#50ebfcff', strokeWidth: 3 }}
                  tickLine={{ stroke: '#50ebfcff', strokeWidth: 1 }}
                  tick={{ fontSize: 12, fill: '#ffffff' }}
                  height={20}
                  interval={0}
                  tickMargin={1}
                />
                <Bar dataKey="count" fill="#50ebfcff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="alliance-stars" style={{ position: 'absolute', top: -15, left: 1000 }}>
            <h4>Alliance Stars</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topPlayers.map((p, i) => (
                <li key={p.player} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <img
                    src={`/avatars/avatar${i + 1}.svg`}
                    alt={p.player}
                    style={{ width: 36, height: 36, borderRadius: '50%', marginRight: 8 }}
                  />
                  <div className="player-line">
                    <span className="star-alliance">[{p.alliance}]</span>
                    <span className="star-name" style={{ margin: '0 6px' }}>{p.player}</span>
                    <span className="star-power">{p.power.toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function CompareAlliance() {
  const [slots, setSlots] = usePersistentAllianceSlots();
  const [alliancesList] = useState(() => alliances);
  const dragItem = useRef();
  const dragOverItem = useRef();

  const addSlot = () => { if (slots.length < 8) setSlots([...slots, { id: Date.now(), alliance: null }]); };
  const removeSlot = id => setSlots(prev => prev.filter(s => s.id !== id));
  const onChangeAlliance = (id, al) => setSlots(prev => prev.map(s => s.id === id ? { ...s, alliance: al } : s));

  const handleDragStart = (e, idx) => { dragItem.current = idx; e.currentTarget.classList.add('dragging'); };
  const handleDragEnter = (e, idx) => { dragOverItem.current = idx; };
  const handleDragOver = e => e.preventDefault();
  const handleDragEnd = e => {
    const items = [...slots];
    const [dragged] = items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = dragOverItem.current = null;
    e.currentTarget.classList.remove('dragging');
    setSlots(items);
  };

  return (
    <div className="compare-alliance-container">
      {slots.map((slot, i) => (
        <AllianceSlot
          key={slot.id}
          id={slot.id}
          alliance={slot.alliance}
          alliances={alliancesList}
          onRemove={removeSlot}
          onChangeAlliance={onChangeAlliance}
          dragHandlers={{
            draggable: true,
            onDragStart: e => handleDragStart(e, i),
            onDragEnter: e => handleDragEnter(e, i),
            onDragOver: handleDragOver,
            onDragEnd: handleDragEnd,
          }}
        />
      ))}
      {slots.length < 8 && <div className="add-slot-button" onClick={addSlot}>+</div>}
    </div>
  );
}