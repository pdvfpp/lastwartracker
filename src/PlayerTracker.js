import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactSlider from 'react-slider';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import playerData from './playerData';

const BIN_SIZE = 10_000_000;

function PlayerTracker() {
  // Quick‐search from URL
  const { search } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const q = new URLSearchParams(search).get('search') || '';
    setSearchQuery(q);
  }, [search]);

  // Server & Alliance controls
  const [serverFilter, setServerFilter] = useState('');
  const [selectedAlliance, setSelectedAlliance] = useState('');

  const allServers = useMemo(
    () => [...new Set(playerData.map(p => p.server))].sort((a, b) => a - b),
    []
  );
  const minServer = allServers[0];
  const maxServer = allServers[allServers.length - 1];
  const [serverRange, setServerRange] = useState([minServer, maxServer]);
  const useServerSlider = serverFilter.trim() === '';

  // Base filtering by server/alliance when no quick‐search
  const baseFiltered = useMemo(() => {
    if (searchQuery.length >= 3) return playerData;
    return playerData.filter(p => {
      const inServer = useServerSlider
        ? p.server >= serverRange[0] && p.server <= serverRange[1]
        : serverFilter
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(Number)
            .includes(p.server);
      if (!inServer) return false;
      if (selectedAlliance && p.alliance !== selectedAlliance) return false;
      return true;
    });
  }, [
    searchQuery,
    serverFilter,
    serverRange,
    selectedAlliance,
    useServerSlider,
  ]);

  // Alliance dropdown options now derived from baseFiltered
  const allianceOptions = useMemo(() => {
    const map = new Map();
    baseFiltered.forEach(p => {
      if (!map.has(p.alliance)) map.set(p.alliance, p.server);
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    ); // [ [allianceTag, server], ... ]
  }, [baseFiltered]);

  // Override with quick‐search exact match if active
  const filteredPlayers = useMemo(() => {
    if (searchQuery.length < 3) return baseFiltered;
    const isAll = baseFiltered.some(p => p.alliance === searchQuery);
    if (isAll) {
      return baseFiltered.filter(p => p.alliance === searchQuery);
    }
    return baseFiltered.filter(
      p => p.player.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [baseFiltered, searchQuery]);

  // Compute power slider limits
  const [minLimit, maxLimit] = useMemo(() => {
    const powers = filteredPlayers.map(p => p.power);
    if (!powers.length) return [0, 0];
    const lo = Math.min(...powers);
    const hi = Math.max(...powers);
    const floored = Math.floor(lo / BIN_SIZE) * BIN_SIZE;
    const ceiled = Math.ceil(hi / BIN_SIZE) * BIN_SIZE;
    return [Math.max(0, floored - BIN_SIZE), ceiled + BIN_SIZE];
  }, [filteredPlayers]);

  // Power range state resets when limits change
  const [powerRange, setPowerRange] = useState([minLimit, maxLimit]);
  useEffect(() => {
    setPowerRange([minLimit, maxLimit]);
  }, [minLimit, maxLimit]);

  // Build histogram data
  const histogramData = useMemo(() => {
    const bins = {};
    filteredPlayers.forEach(p => {
      const b = Math.floor(p.power / BIN_SIZE) * BIN_SIZE;
      bins[b] = (bins[b] || 0) + 1;
    });
    const data = [];
    for (let b = minLimit; b <= maxLimit; b += BIN_SIZE) {
      data.push({
        bin: b,
        count: bins[b] || 0,
        inRange:
          b + BIN_SIZE >= powerRange[0] && b <= powerRange[1],
      });
    }
    return data;
  }, [filteredPlayers, minLimit, maxLimit, powerRange]);

  // Apply powerRange filter for the table
  const tablePlayers = useMemo(() => {
    return filteredPlayers.filter(
      p => p.power >= powerRange[0] && p.power <= powerRange[1]
    );
  }, [filteredPlayers, powerRange]);

  // Table header style
  const thStyle = {
    border: 'none',
    padding: 12,
    backgroundColor: 'transparent',
    textAlign: 'middle',
    color: '#50ebfcff',
  };

  // Disable Server+Alliance controls when quick‐search active
  const disabled = searchQuery.length >= 3;
  const controlStyle = { opacity: disabled ? 0.5 : 1 };

  return (
    <div>
      {/* Filters Row */}
      <div className="filter-row">
        {/* Server Filter */}
        <div className="filter-group" style={controlStyle}>
          <label className="filter-label">Server</label>
          <input
            type="text"
            className="filter-input"
            placeholder="e.g. 98, 99"
            value={serverFilter}
            disabled={disabled}
            onChange={e => setServerFilter(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <div
              className="filter-label"
              style={{
                marginTop: 42,
                marginBottom: 12,
                textAlign: 'left',
              }}
            >
              Server Range
            </div>
            <ReactSlider
              className="power-slider"
              thumbClassName="slider-thumb"
              value={serverRange}
              min={minServer}
              max={maxServer}
              step={1}
              onChange={setServerRange}
              minDistance={1}
              withTracks
              pearling
              disabled={disabled || !useServerSlider}
              renderTrack={(props, state) => (
                <div
                  {...props}
                  style={{
                    ...props.style,
                    backgroundColor:
                      state.index === 1
                        ? '#50ebfcff'
                        : '#cbf9feff',
                    height: '100%',
                    borderRadius: 4,
                  }}
                />
              )}
            />
            <div
              className="power-range-display"
              style={{ marginTop: 12, textAlign: 'left' }}
            >
              {serverRange[0]} – {serverRange[1]}
            </div>
          </div>
        </div>

        {/* Alliance Filter (now scoped to current servers) */}
        <div className="filter-group" style={controlStyle}>
          <label className="filter-label">Alliance</label>
          <select
            className="filter-select"
            value={selectedAlliance}
            disabled={disabled}
            onChange={e => setSelectedAlliance(e.target.value)}
          >
            <option value="">All Alliances</option>
            {allianceOptions.map(([tag, srv]) => (
              <option key={tag} value={tag}>
                {`${tag} (${srv})`}
              </option>
            ))}
          </select>
        </div>

        {/* Power Histogram + Slider */}
        <div className="filter-group">
          <label className="filter-label">Power Range</label>
          <div style={{ marginBottom: -20 }}>
            <ResponsiveContainer width={250} height={160}>
              <BarChart data={histogramData}>
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {histogramData.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.inRange ? '#50ebfcff' : '#cbf9feff'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ReactSlider
            className="power-slider"
            thumbClassName="slider-thumb"
            value={powerRange}
            min={minLimit}
            max={maxLimit}
            step={BIN_SIZE}
            onChange={setPowerRange}
            minDistance={BIN_SIZE}
            withTracks
            pearling
            renderTrack={(props, state) => (
              <div
                {...props}
                style={{
                  ...props.style,
                  backgroundColor:
                    state.index === 1
                      ? '#50ebfcff'
                      : '#cbf9feff',
                  height: '100%',
                  borderRadius: 4,
                }}
              />
            )}
          />
          <div className="power-range-display">
            {powerRange[0].toLocaleString()} –{' '}
            {powerRange[1].toLocaleString()}
          </div>
        </div>
      </div>

      {/* Player Table */}
      <div style={{ marginTop: 40, padding: '0 20px' }}>  
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0 8px',
            fontSize: 20,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 100 }}>Rank</th>
              <th style={thStyle}>Player</th>
              <th style={{ ...thStyle, width: 150 }}>Alliance</th>
              <th style={thStyle}>Server</th>
              <th style={thStyle}>Power</th>
            </tr>
          </thead>
          <tbody>
            {tablePlayers
              .sort((a, b) => b.power - a.power)
              .map((p, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor:
                      i % 2 === 0 ? '#cbf9feff' : '#ffffffff',
                    color: '#0b0c10',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <td
                    style={{
                      padding: 12,
                      border: 'none',
                      borderTopLeftRadius: 10,
                      borderBottomLeftRadius: 10,
                      width: 100,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      border: 'none',
                      width: 300,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 150,
                    }}
                  >
                    <img
                      src={`/avatars/avatar${(i % 12) + 1}.svg`}
                      alt="avatar"
                      style={{
                        width: 55,
                        height: 55,
                        borderRadius: '50%',
                        border: '2px solid #0b0c10',
                        marginRight: 12,
                        objectFit: 'cover',
                      }}
                    />
                    {p.player}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      border: 'none',
                      width: 120,
                    }}
                  >
                    {p.alliance}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      border: 'none',
                      width: 150,
                    }}
                  >
                    {p.server}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      border: 'none',
                      borderTopRightRadius: 10,
                      borderBottomRightRadius: 10,
                      width: 180,
                      textAlign: 'right',
                      paddingRight: 100,
                    }}
                  >
                    {p.power.toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerTracker;