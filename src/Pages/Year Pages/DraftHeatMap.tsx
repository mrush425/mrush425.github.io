import React, { useState, useEffect, useMemo } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import DraftPick from '../../Interfaces/DraftPick';
import SleeperUser from '../../Interfaces/SleeperUser';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import '../../Stylesheets/YearStylesheets/DraftHeatMap.css'; // Create a CSS file for styling
import DraftInfo from '../../Interfaces/DraftInfo';
import {getBackgroundAndTextColor, getValueBasedColor, getPlayerStats } from './SharedDraftMethods';
import { fetchDraftData } from '../../SleeperApiMethods';

interface DraftHeatMapProps {
  data: LeagueData;
}

let positionOrderedLists: Record<string, PlayerYearStats[]> = {};

const DraftHeatMap: React.FC<DraftHeatMapProps> = ({ data }) => {

  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [draftInfo, setDraftInfo] = useState<DraftInfo[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerYearStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useValueBased, setUseValueBased] = useState(false);

  const users = data.users;

  useEffect(() => {
    const fetchDataFromApi = async () => {
        try {
            const [picks, info, pStatsData, pOrderedLists] = await fetchDraftData(data.draft_id, data.league_id, data.season);
            setDraftPicks(picks);
            setDraftInfo(info);
            setPlayerStats(pStatsData);
            positionOrderedLists=pOrderedLists;
            // ... (rest of the code)
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchDataFromApi();
}, [data.draft_id, data.league_id, data.season]);

  const draftPicksByRound: Record<number, DraftPick[]> = {};
  draftPicks.forEach((pick) => {
    const round = pick.round;
    if (!draftPicksByRound[round]) {
      draftPicksByRound[round] = [];
    }
    draftPicksByRound[round].push(pick);
  });

  // Calculate position draft stats (first round, last round, total picked, picks per round)
  const positionDraftStats = useMemo(() => {
    const stats: Record<string, { firstRound: number; lastRound: number; totalPicked: number; picksByRound: Record<number, number> }> = {};
    
    draftPicks.forEach((pick) => {
      const position = playerStats.find(p => p.player_id === pick.player_id)?.player.position || '';
      if (!position || position === 'K' || position === 'DEF') return; // Skip K/DEF
      
      if (!stats[position]) {
        stats[position] = { firstRound: pick.round, lastRound: pick.round, totalPicked: 0, picksByRound: {} };
      }
      stats[position].firstRound = Math.min(stats[position].firstRound, pick.round);
      stats[position].lastRound = Math.max(stats[position].lastRound, pick.round);
      stats[position].totalPicked++;
      stats[position].picksByRound[pick.round] = (stats[position].picksByRound[pick.round] || 0) + 1;
    });
    
    return stats;
  }, [draftPicks, playerStats]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Convert draft_order object to an array of userIds in the correct order
  const orderedUserIds: string[] = Object.keys(draftInfo[0]?.draft_order || {}).sort(
    (a, b) => draftInfo[0].draft_order[a] - draftInfo[0].draft_order[b]
  );

  // Fetch corresponding team names from SleeperUser objects
  const orderedTeamNames: string[] = orderedUserIds.map((userId) => {
    const user = users.find((u) => u.user_id === userId);
    return user ? user.metadata.team_name || 'Unknown Team' : 'Unknown Team';
  });

  const renderHeaderRow = (): React.ReactNode => {
    return (
      <tr>
        {orderedTeamNames.map((teamName, index) => (
          <th key={index}>{teamName !== 'Unknown Team' ? teamName : ''}</th>
        ))}
      </tr>
    );
  };

  const generateCellContent = (pick: DraftPick, playerStats: PlayerYearStats[], positionOrderedLists: Record<string, PlayerYearStats[]>, users: SleeperUser[], textColor: string): React.ReactNode => {
    const playerStat = getPlayerStats(pick.player_id, playerStats);
    const position = playerStat?.player.position || '';
    const positionList = positionOrderedLists[position] || [];
    const index = positionList.findIndex((p) => p.player_id === pick.player_id);
    const pickedByUser = users.find((user) => user.user_id === pick.picked_by);
  
    return (
      <div className="draft-cell-content" style={{ color: textColor }}>
        <div className="draft-player-name">{`${pick.metadata.first_name} ${pick.metadata.last_name}`}</div>
        <div className="draft-position-points">
          <span className="draft-player-position">#{index + 1} {position}</span>
          <span className="draft-player-points">{playerStat?.stats.pts_half_ppr || 0} pts</span>
        </div>
        {pickedByUser && <div className="draft-picked-by">{pickedByUser.metadata.team_name}</div>}
      </div>
    );
  };
  
  const renderOddOrEvenRoundPicks = (picksInRound: DraftPick[] | null, isOddRound: boolean): React.ReactNode[] => {
    if (!picksInRound) return [];
    return (isOddRound ? picksInRound : picksInRound.slice().reverse()).map((pick) => {
      const individualPlayerStats = getPlayerStats(pick.player_id, playerStats);
      const position = individualPlayerStats?.player.position || '';
      const positionList = positionOrderedLists[position] || [];
      const playerRank = positionList.findIndex((p) => p.player_id === pick.player_id)+1;

      const [backgroundColor, textColor] = useValueBased 
        ? getValueBasedColor(pick.pick_no, playerRank, position, draftPicks.length, positionOrderedLists, positionDraftStats, individualPlayerStats)
        : getBackgroundAndTextColor(position, playerRank, individualPlayerStats, positionOrderedLists);
  
      return (
        <td key={pick.pick_no} style={{ backgroundColor }}>
          {generateCellContent(pick, playerStats, positionOrderedLists, users, textColor)}
        </td>
      );
    });
  };
  
  const renderOddRoundPicks = (picksInRound: DraftPick[] | null): React.ReactNode[] => {
    return renderOddOrEvenRoundPicks(picksInRound, true);
  };
  
  const renderEvenRoundPicks = (picksInRound: DraftPick[] | null): React.ReactNode[] => {
    return renderOddOrEvenRoundPicks(picksInRound, false);
  };

  const renderTableBody = (): React.ReactNode[] => {
    return Object.keys(draftPicksByRound).map((roundStr) => {
      const round = parseInt(roundStr, 10);
      const picksInRound = draftPicksByRound[round];
      const isOddRound = round % 2 !== 0;

      return (
        <tr key={round}>
          {isOddRound ? renderOddRoundPicks(picksInRound) : renderEvenRoundPicks(picksInRound)}
        </tr>
      );
    });
  };

  return (
    <div>
      <YearNavBar data={data} />

      <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
        <button
          onClick={() => setUseValueBased(!useValueBased)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: '2px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: useValueBased ? 'var(--accent-blue)' : 'rgba(100, 100, 100, 0.4)',
            color: useValueBased ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: useValueBased ? '0 0 8px rgba(100, 150, 255, 0.5)' : 'none'
          }}
        >
          {useValueBased ? 'Switch to Rank-Based' : 'Switch to Value-Based'}
        </button>
        
        <div style={{ fontSize: '12px', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {useValueBased ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#1b5e20', borderRadius: '4px' }}></div>
                <span>Stellar</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#66bb6a', borderRadius: '4px' }}></div>
                <span>Solid</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ccffcc', borderRadius: '4px' }}></div>
                <span>Right On</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ffcccc', borderRadius: '4px' }}></div>
                <span>Just Early</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ff7777', borderRadius: '4px' }}></div>
                <span>You Serious...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#c62828', borderRadius: '4px' }}></div>
                <span>REEEEEEACH</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#1b5e20', borderRadius: '4px' }}></div>
                <span>Top 16%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#66bb6a', borderRadius: '4px' }}></div>
                <span>16-33%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ccffcc', borderRadius: '4px' }}></div>
                <span>33-50%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ffcccc', borderRadius: '4px' }}></div>
                <span>50-66%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#ff7777', borderRadius: '4px' }}></div>
                <span>66-83%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#c62828', borderRadius: '4px' }}></div>
                <span>Bottom 16%</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="horizontal-scroll">
        <table className="draft-heatmap-table">
          <colgroup>
            {orderedTeamNames.map((_, index) => (
              <col key={index} style={{ width: '8.333%' }} />
            ))}
          </colgroup>
          <thead>{renderHeaderRow()}</thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default DraftHeatMap;