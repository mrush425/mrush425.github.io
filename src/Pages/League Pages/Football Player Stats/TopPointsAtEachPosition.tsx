import React, { useMemo } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import FootballPlayerStatsMethods from '../../../Helper Files/FootballPlayerStatsMethods';

interface TopPointsAtEachPositionProps {
  data: LeagueData[];
}

const TopPointsAtEachPosition: React.FC<TopPointsAtEachPositionProps> = ({ data }) => {
  const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  const results = useMemo(() => {
    return FootballPlayerStatsMethods.MaxPointsByPosition(data, allPositions);
  }, [data]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '20px' }}>
          No data available
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
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
                  key={`${result.playerId}-${result.year}-${result.week}`}
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
      )}
    </div>
  );
};

export default TopPointsAtEachPosition;
