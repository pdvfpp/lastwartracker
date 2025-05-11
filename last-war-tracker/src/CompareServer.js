import React, { useState, useEffect, useRef, useMemo } from 'react';
import playerData from './playerData';
import { ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import './CompareServer.css';

// Module-level saved state to persist slots across remounts
let _savedSlots = [];
function usePersistentSlots() {
  const [slots, setSlots] = useState(() => _savedSlots);
  useEffect(() => {
    _savedSlots = slots;
  }, [slots]);
  return [slots, setSlots];
}

// Global histogram settings
const BIN_SIZE = 10_000_000;
const allPowers = playerData.map(p => p.power);
const globalMin = Math.floor(Math.min(...allPowers) / BIN_SIZE) * BIN_SIZE;
const globalMax = Math.ceil(Math.max(...allPowers) / BIN_SIZE) * BIN_SIZE;

// Compute power-rate index per server (0–100) via L2 norm
const serverRates = (() => {
  const p = 2;
  const sums = {};
  playerData.forEach(({ server, power }) => {
    sums[server] = (sums[server] || 0) + Math.pow(power, p);
  });
  const norms = Object.fromEntries(
    Object.entries(sums).map(([srv, sumP]) => [srv, Math.pow(sumP, 1 / p)])
  );
  const maxNorm = Math.max(...Object.values(norms));
  return Object.fromEntries(
    Object.entries(norms).map(([srv, val]) => [srv, Math.round((val / maxNorm) * 10000) / 100])
  );
})();

function ServerSlot({ id, server, onRemove, onChangeServer, servers, dragHandlers }) {
  const [inputValue, setInputValue] = useState(server != null ? String(server) : '');
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
    ? servers.filter(s => s.toString().startsWith(inputValue))
    : [];

  const totalPowerRaw =
    servers.includes(server)
      ? playerData.filter(p => p.server === server).reduce((sum, p) => sum + p.power, 0)
      : 0;
  const totalPowerG = Math.round((totalPowerRaw / 1e9) * 100) / 100;

  const topPlayers = useMemo(() => {
    if (!servers.includes(server)) return [];
    return playerData
      .filter(p => p.server === server)
      .sort((a, b) => b.power - a.power)
      .slice(0, 3);
  }, [server]);

  const histData = useMemo(() => {
    const counts = {};
    playerData
      .filter(p => p.server === server)
      .forEach(p => {
        const bin = Math.floor(p.power / BIN_SIZE) * BIN_SIZE;
        counts[bin] = (counts[bin] || 0) + 1;
      });
    const data = [];
    for (let b = globalMin; b <= globalMax; b += BIN_SIZE) {
      data.push({ bin: b, count: counts[b] || 0 });
    }
    return data;
  }, [server]);

  const confirm = val => {
    setInputValue(val);
    const num = Number(val);
    if (servers.includes(num)) onChangeServer(id, num);
    setShowSuggestions(false);
  };

  return (
    <div className="server-slot" ref={wrapperRef} {...dragHandlers}>
      <button className="remove-slot-button" onClick={() => onRemove(id)}>×</button>
      {servers.includes(server) && <div className="server-octagon">{server}</div>}
      <input
        className="server-select"
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); setShowSuggestions(e.target.value.length >= 1); }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={e => e.key === 'Enter' && confirm(inputValue)}
        placeholder="Select server"
      />
      {showSuggestions && (
        <ul className="server-dropdown">
          {filtered.slice(0, 20).map(s => (
            <li key={s} onMouseDown={() => confirm(String(s))}>{s}</li>
          ))}
        </ul>
      )}

      {servers.includes(server) && (
        <>
          <div className="server-info">
            <p><strong>Power rate:</strong> <span className="power-rate-value">{serverRates[server]}</span></p>
            <p><strong>Total Power:</strong> <span className="total-power-value">{totalPowerG} G</span></p>
          </div>
          <div style={{ marginTop: -95, marginLeft: 400, width: 480, height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData} margin={{ top: 0, right: 20, left: 20, bottom: -4 }}>
                <XAxis
                  dataKey="bin"
                  type="number"
                  domain={[globalMin, globalMax]}
                  tickFormatter={val => `${val / 1e6}M`}
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
          <div className="server-stars" style={{ position: 'absolute', top: -15, left: 1000 }}>
            <h4>Server Stars</h4>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
              {topPlayers.map((player, i) => {
                const avatarIdx = i + 1; // avatar1, avatar2, avatar3
                return (
                  <li key={player.player} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <img
                      src={`/avatars/avatar${avatarIdx}.svg`}
                      alt={player.player}
                      style={{ width: 36, height: 36, borderRadius: '50%', marginRight: 8 }}
                    />
                    <div className="player-line">
                      <span className="star-alliance">[{player.alliance}]</span>
                      <span className="star-name" style={{ margin: '0 6px' }}>{player.player}</span>
                      <span className="star-power">{player.power.toLocaleString()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function CompareServer() {
  const [slots, setSlots] = usePersistentSlots();
  const servers = Array.from(new Set(playerData.map(p => p.server))).sort((a, b) => a - b);
  const dragItem = useRef();
  const dragOverItem = useRef();

  const addSlot = () => { if (slots.length < 8) setSlots([...slots, { id: Date.now(), server: null }]); };
  const removeSlot = id => setSlots(prev => prev.filter(s => s.id !== id));
  const onChangeServer = (id, srv) => setSlots(prev => prev.map(s => (s.id === id ? { ...s, server: srv } : s)));

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
    <div className="compare-server-container">
      {slots.map((slot, idx) => (
        <ServerSlot key={slot.id} id={slot.id} server={slot.server} servers={servers} onRemove={removeSlot} onChangeServer={onChangeServer} dragHandlers={{ draggable: true, onDragStart: e => handleDragStart(e, idx), onDragEnter: e => handleDragEnter(e, idx), onDragOver: handleDragOver, onDragEnd: handleDragEnd }} />
      ))}
      {slots.length < 8 && <div className="add-slot-button" onClick={addSlot}>+</div>}
    </div>
  );
}