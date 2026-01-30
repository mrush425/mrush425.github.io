import React, { useEffect, useMemo, useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import FootballPlayerStatsMethods, { JamarcusRusselStatResult } from '../../../Helper Files/FootballPlayerStatsMethods';

interface BestFirstRoundersTop20Props {
  data: LeagueData[];
}

const BestFirstRoundersTop20: React.FC<BestFirstRoundersTop20Props> = ({ data }) => {
  const [results, setResults] = useState<JamarcusRusselStatResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    FootballPlayerStatsMethods.BestFirstRoundersTop20(data)
      .then((res) => {
        if (!isMounted) return;
        setResults(res);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  const getPlayerImageUrl = (playerId: string, position: string) => {
    const isDefense = position === 'DEF';
    if (isDefense) {
      return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
    }
    return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
  };

  const getFallbackImageUrl = (position: string) => {
    return position === 'DEF'
      ? 'https://sleepercdn.com/images/fallback_team_logo.png'
      : 'https://sleepercdn.com/images/fallback_player_image.png';
  };

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: '#ff2d55',
      RB: '#00c7be',
      WR: '#007aff',
      TE: '#ff9500',
      K: '#5856d6',
      DEF: '#34c759',
    };
    return colors[position] || '#8e8e93';
  };

  const titleText = useMemo(() => {
    return 'Best First Rounders (Top 20 - Highest Half PPR Points)';
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h4 style={{ textAlign: 'center', color: '#a0a0a0', marginBottom: '12px' }}>{titleText}</h4>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '20px' }}>
          Loading...
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '20px' }}>
          No data available
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '20px',
          }}
        >
          {results.map((result, idx) => (
            <div
              key={`${result.playerId}-${result.year}-${idx}`}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = getPositionColor(result.position);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                #{idx + 1}
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: getPositionColor(result.position),
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                {result.position}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <img
                  src={getPlayerImageUrl(result.playerId, result.position)}
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src = getFallbackImageUrl(result.position))
                  }
                  alt={result.playerName}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `3px solid ${getPositionColor(result.position)}`,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                />
              </div>

              <h3
                style={{
                  color: '#e0e0e0',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  margin: '0 0 8px 0',
                  lineHeight: '1.3',
                }}
              >
                {result.playerName}
              </h3>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#a0a0a0',
                  marginBottom: '12px',
                }}
              >
                {result.year}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: getPositionColor(result.position),
                  margin: '12px 0',
                }}
              >
                {result.pointsPerGame.toFixed(2)}
                <span style={{ fontSize: '14px', color: '#a0a0a0', marginLeft: '4px' }}>
                  PPG
                </span>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#a0a0a0',
                  marginBottom: '12px',
                }}
              >
                ({result.points.toFixed(2)} pts in {result.gamesPlayed} games)
              </div>

              <div
                style={{
                  height: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  margin: '16px 0',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Owner</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {result.owner}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Season Place</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {result.seasonPlace ? `#${result.seasonPlace}` : 'N/A'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Overall Place</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {result.overallPlace ? `#${result.overallPlace}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BestFirstRoundersTop20;
