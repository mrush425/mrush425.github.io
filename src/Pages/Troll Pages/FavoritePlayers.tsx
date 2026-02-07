import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import { getPlayerImageUrl, getFallbackImageUrl } from '../../Helper Files/HelperMethods';
import {
  getFavoritePlayerByDraft,
  getFavoritePlayerByLineup,
  getFavoritePlayerByOwnership,
  FavoriteDraftedResult,
  FavoriteLineupResult,
  FavoriteOwnedResult,
  formatDraftDetails,
} from '../../Helper Files/FavoritePlayerMethods';

interface FavoritePlayersProps {
  userId: string;
  userName: string;
  leagueData: LeagueData[];
}

type FavoriteMode = 'draft' | 'lineup' | 'ownership';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const FavoritePlayers: React.FC<FavoritePlayersProps> = ({ userId, userName, leagueData }) => {
  const [mode, setMode] = useState<FavoriteMode>('draft');
  const [loading, setLoading] = useState(false);
  
  const [draftResults, setDraftResults] = useState<Map<string, FavoriteDraftedResult>>(new Map());
  const [lineupResults, setLineupResults] = useState<Map<string, FavoriteLineupResult>>(new Map());
  const [ownershipResults, setOwnershipResults] = useState<Map<string, FavoriteOwnedResult>>(new Map());

  // Load draft results (async)
  useEffect(() => {
    const loadDraftResults = async () => {
      setLoading(true);
      try {
        const results = await getFavoritePlayerByDraft(leagueData, userId, POSITIONS);
        setDraftResults(results);
      } catch (error) {
        console.error('Error loading draft results:', error);
      }
      setLoading(false);
    };
    
    loadDraftResults();
  }, [leagueData, userId]);

  // Load lineup and ownership results (sync)
  useEffect(() => {
    const lineupResult = getFavoritePlayerByLineup(leagueData, userId, POSITIONS);
    setLineupResults(lineupResult);
    
    const ownershipResult = getFavoritePlayerByOwnership(leagueData, userId, POSITIONS);
    setOwnershipResults(ownershipResult);
  }, [leagueData, userId]);

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

  const getModeTitle = () => {
    switch (mode) {
      case 'draft': return 'Most Drafted by Position';
      case 'lineup': return 'Most Started by Position';
      case 'ownership': return 'Most Years Owned by Position';
    }
  };

  const getResultsForMode = () => {
    const results: { position: string; data: FavoriteDraftedResult | FavoriteLineupResult | FavoriteOwnedResult | null }[] = [];
    
    for (const position of POSITIONS) {
      let data = null;
      if (mode === 'draft') {
        data = draftResults.get(position) || null;
      } else if (mode === 'lineup') {
        data = lineupResults.get(position) || null;
      } else if (mode === 'ownership') {
        data = ownershipResults.get(position) || null;
      }
      results.push({ position, data });
    }
    
    return results;
  };

  const renderCardContent = (position: string, data: FavoriteDraftedResult | FavoriteLineupResult | FavoriteOwnedResult | null) => {
    if (!data) {
      return (
        <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '40px 0' }}>
          No {position} drafted
        </div>
      );
    }

    const positionColor = getPositionColor(position);

    return (
      <>
        {/* Position Badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: positionColor,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
          }}
        >
          {position}
        </div>

        {/* Player Image */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img
            src={getPlayerImageUrl(data.playerId, position)}
            onError={(e) =>
              ((e.target as HTMLImageElement).src = getFallbackImageUrl(position))
            }
            alt={data.playerName}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `3px solid ${positionColor}`,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          />
        </div>

        {/* Player Name */}
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
          {data.playerName}
        </h3>

        {/* Main Stat */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '36px',
            fontWeight: 'bold',
            color: positionColor,
            margin: '12px 0',
          }}
        >
          {mode === 'draft' && (data as FavoriteDraftedResult).timesDrafted}
          {mode === 'lineup' && (data as FavoriteLineupResult).timesInLineup}
          {mode === 'ownership' && (data as FavoriteOwnedResult).yearsOwned}
          <span style={{ fontSize: '16px', color: '#a0a0a0', marginLeft: '4px' }}>
            {mode === 'draft' && 'times'}
            {mode === 'lineup' && 'games'}
            {mode === 'ownership' && 'years'}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            margin: '16px 0',
          }}
        />

        {/* Details based on mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mode === 'draft' && (() => {
            const draftData = data as FavoriteDraftedResult;
            const earliestDraft = draftData.draftDetails.reduce((earliest, d) => 
              d.round < earliest.round || (d.round === earliest.round && d.pick_no < earliest.pick_no) ? d : earliest
            , draftData.draftDetails[0]);
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Earliest Round</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    Round {earliestDraft.round} (Pick {earliestDraft.pick_no})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Most Recent</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {draftData.mostRecentYear}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#808080', textAlign: 'center' }}>
                  {draftData.draftDetails.map(d => d.year).join(', ')}
                </div>
              </>
            );
          })()}

          {mode === 'lineup' && (() => {
            const lineupData = data as FavoriteLineupResult;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Avg PPG</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {lineupData.avgPointsPerGame.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Total Points</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {lineupData.totalPoints.toFixed(1)}
                  </span>
                </div>
              </>
            );
          })()}

          {mode === 'ownership' && (() => {
            const ownershipData = data as FavoriteOwnedResult;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Games Started</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {ownershipData.timesInLineup}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Total Points</span>
                  <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                    {ownershipData.totalPointsInLineup.toFixed(1)}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#808080', textAlign: 'center' }}>
                  {ownershipData.yearsList.join(', ')}
                </div>
              </>
            );
          })()}
        </div>
      </>
    );
  };

  const results = getResultsForMode();

  return (
    <div style={{ padding: '0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '2.5rem', fontWeight: 'bold' }}>
        {userName}'s Favorite Players
      </h1>

      {/* Radio Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', gap: '24px', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="favorite-mode"
            value="draft"
            checked={mode === 'draft'}
            onChange={() => setMode('draft')}
          />
          <span>By Draft</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="favorite-mode"
            value="lineup"
            checked={mode === 'lineup'}
            onChange={() => setMode('lineup')}
          />
          <span>By Lineup</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="favorite-mode"
            value="ownership"
            checked={mode === 'ownership'}
            onChange={() => setMode('ownership')}
          />
          <span>By Ownership</span>
        </label>
      </div>

      {/* Subheading */}
      <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.5rem', fontWeight: '500', color: '#a0a0a0' }}>
        {getModeTitle()}
      </h2>

      {/* Loading state for draft mode */}
      {loading && mode === 'draft' && (
        <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '40px' }}>
          Loading draft data...
        </div>
      )}

      {/* Cards Grid */}
      {(!loading || mode !== 'draft') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '20px',
          }}
        >
          {results.map(({ position, data }) => (
            <div
              key={position}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '320px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = getPositionColor(position);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {renderCardContent(position, data)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritePlayers;
