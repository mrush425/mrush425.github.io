import React, { useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import FootballPlayerStatsMethods, { MaxPointsByPositionResult } from '../../../Helper Files/FootballPlayerStatsMethods';

interface MostPointsByPositionProps {
  data: LeagueData[];
  minYears?: number;
}

const MostPointsByPosition: React.FC<MostPointsByPositionProps> = ({ data }) => {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Recalculate results whenever selectedPositions changes
  const results = selectedPositions.length > 0 
    ? FootballPlayerStatsMethods.Top50PointsByPosition(data, selectedPositions)
    : [];

  const handlePositionToggle = (position: string) => {
    setSelectedPositions((prev) => {
      const newPositions = prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position];
      setRefreshKey(k => k + 1);
      return newPositions;
    });
  };

  const handleClear = () => {
    setSelectedPositions([]);
    setRefreshKey(k => k + 1);
  };

  const handleSelectAll = () => {
    setSelectedPositions(positions);
    setRefreshKey(k => k + 1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Position Checkboxes */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '15px', justifyContent: 'center' }}>
          {positions.map((position) => (
            <label key={position} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={selectedPositions.includes(position)}
                onChange={() => handlePositionToggle(position)}
              />
              {position}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4ade80',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Select All
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results Table */}
      {selectedPositions.length > 0 && results.length > 0 ? (
        <div key={refreshKey} style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '20px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Position</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Player</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Points</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Owner</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Opponent</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Year</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a0a0a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Week</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr
                  key={`${refreshKey}-${result.position}-${result.playerId}-${idx}`}
                  style={{
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.position}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.playerName}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.points.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.owner}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.opponent}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.year}</td>
                  <td style={{ padding: '12px 16px', color: '#e0e0e0', fontSize: '14px' }}>{result.week}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedPositions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '20px' }}>
          Select at least one position to view the top 50 scoring performances.
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '20px' }}>
          No results found for selected positions.
        </div>
      )}
    </div>
  );
};

export default MostPointsByPosition;
