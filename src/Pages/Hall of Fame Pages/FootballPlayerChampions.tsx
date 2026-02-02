import React, { useEffect, useState } from 'react';
import '../../Stylesheets/Hall of Fame Stylesheets/FootballPlayerChampions.css'
import HallOfFameNavBar from '../../Navigation/HallOfFameNavBar';
import HallOfFameProps from './HallOfFameProps';
import { findRosterByUserId, getLeagueWinner } from '../../Helper Files/HelperMethods';
import SleeperUser from '../../Interfaces/SleeperUser';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import Matchup from '../../Interfaces/Matchup';
import Player from '../../Interfaces/Player';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DEF', 'K'];
const POSITION_COLORS: { [key: string]: { bg: string; border: string; accent: string } } = {
  QB: { bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)', accent: 'var(--accent-blue)' },
  RB: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', accent: 'var(--accent-orange)' },
  WR: { bg: 'rgba(74, 222, 128, 0.1)', border: 'rgba(74, 222, 128, 0.3)', accent: 'var(--accent-green)' },
  TE: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', accent: 'var(--accent-purple)' },
  DEF: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', accent: 'var(--accent-red)' },
  K: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)', accent: 'var(--accent-cyan)' }
};

const FootballPlayerChampions: React.FC<HallOfFameProps> = ({ data }) => {
  const [playerData, setPlayerData] = useState<Player[]>([]);
  const [sortedFootballPlayers, setSortedFootballPlayers] = useState<Map<string, FootballPlayerChampionshipInfo[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>('QB');
  const [selectedSort, setSelectedSort] = useState<string>('year');
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  let footballPlayerChampionships: FootballPlayerChampionshipInfo[] = [];

  const getFootballPlayerChampions = () => {
    try {
      data.map((leagueData) => {
        const leagueWinner: SleeperUser | undefined = getLeagueWinner(leagueData);
        if (leagueWinner) {
          const leagueWinnerRosterId: SleeperRoster | undefined = findRosterByUserId(leagueWinner.user_id, leagueData.rosters);
          const matchupInfo: MatchupInfo | undefined = leagueData.matchupInfo.find((matchupInfo) => matchupInfo.week === leagueData.settings.playoff_week_start + 2);
          const matchup: Matchup | undefined = matchupInfo?.matchups.find((matchup) => matchup.roster_id === leagueWinnerRosterId?.roster_id);

          if (matchup) {
            matchup.starters.map((starter) => {
              const playerPoints = matchup.players_points[starter] || 0;
              let footballPlayerChampionshipInfo = footballPlayerChampionships.find((fpci) => fpci.footballPlayerId === starter);
              if (footballPlayerChampionshipInfo) {
                footballPlayerChampionshipInfo.wins++;
                footballPlayerChampionshipInfo.years.push(leagueData.season);
                footballPlayerChampionshipInfo.points[leagueData.season] = playerPoints;
              }
              else {
                footballPlayerChampionshipInfo = {
                  footballPlayerId: starter,
                  wins: 1,
                  years: [leagueData.season],
                  points: { [leagueData.season]: playerPoints }
                };
                footballPlayerChampionships.push(footballPlayerChampionshipInfo);
              }
            });
          }
        }
      });

      const playersByPosition = new Map<string, FootballPlayerChampionshipInfo[]>();
      POSITIONS.forEach((position) => {
        playersByPosition.set(position, []);
      });

      footballPlayerChampionships.forEach((playerInfo) => {
        const player = playerData.find((p) => p.player_id === playerInfo.footballPlayerId);
        if (player && player.fantasy_positions) {
          player.fantasy_positions.forEach((position) => {
            const players = playersByPosition.get(position);
            if (players !== undefined) {
              players.push(playerInfo);
            }
          });
        }
      });

      playersByPosition.forEach((players) => {
        if (selectedSort === 'points') {
          // Sort by highest points scored in any championship
          players.sort((a, b) => {
            const aHighestPoints = Math.max(...Object.values(a.points));
            const bHighestPoints = Math.max(...Object.values(b.points));
            return bHighestPoints - aHighestPoints;
          });
        } else {
          // Sort by most recent year first, then by points scored in that year (default)
          players.sort((a, b) => {
            const aRecentYear = Math.max(...a.years.map(y => parseInt(y)));
            const bRecentYear = Math.max(...b.years.map(y => parseInt(y)));
            
            if (aRecentYear !== bRecentYear) {
              return bRecentYear - aRecentYear; // Most recent year first
            }
            
            const aRecentPoints = a.points[aRecentYear] || 0;
            const bRecentPoints = b.points[bRecentYear] || 0;
            return bRecentPoints - aRecentPoints; // Highest points first for same year
          });
        }
      });

      setSortedFootballPlayers(playersByPosition);
    } catch (error) {
      console.error('Error processing football player champions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerDataFromLeague = (leagueData: any[]) => {
    // Collect all unique player IDs from championship records
    const playerIds = new Set<string>();
    let tempChampionships: FootballPlayerChampionshipInfo[] = [];

    leagueData.forEach((leagueD) => {
      const leagueWinner: SleeperUser | undefined = getLeagueWinner(leagueD);
      if (leagueWinner) {
        const leagueWinnerRosterId: SleeperRoster | undefined = findRosterByUserId(leagueWinner.user_id, leagueD.rosters);
        const matchupInfo: MatchupInfo | undefined = leagueD.matchupInfo.find((m: MatchupInfo) => m.week === leagueD.settings.playoff_week_start + 2);
        const matchup: Matchup | undefined = matchupInfo?.matchups.find((m: Matchup) => m.roster_id === leagueWinnerRosterId?.roster_id);

        if (matchup) {
          matchup.starters.forEach((starter) => {
            const playerPoints = matchup.players_points[starter] || 0;
            playerIds.add(starter);
            let info = tempChampionships.find((f) => f.footballPlayerId === starter);
            if (info) {
              info.wins++;
              info.years.push(leagueD.season);
              info.points[leagueD.season] = playerPoints;
            } else {
              tempChampionships.push({
                footballPlayerId: starter,
                wins: 1,
                years: [leagueD.season],
                points: { [leagueD.season]: playerPoints }
              });
            }
          });
        }
      }
    });

    // Fetch player data from Sleeper API
    const fetchPlayerData = async () => {
      try {
        const playerDataResponses = await Promise.all(
          Array.from(playerIds).map((playerId) =>
            fetch(`https://api.sleeper.com/players/nfl/${playerId}`)
              .then(res => res.json())
              .catch(() => null)
          )
        );
        
        const players = playerDataResponses.filter((p) => p !== null);
        setPlayerData(players);
      } catch (error) {
        console.error('Error fetching player data:', error);
        setPlayerData([]);
      }
    };

    if (playerIds.size > 0) {
      fetchPlayerData();
    } else {
      setPlayerData([]);
    }
  };

  useEffect(() => {
    getPlayerDataFromLeague(data);
    
    // Build user map for championship years
    const newUserMap = new Map<string, string>();
    data.forEach((leagueData) => {
      leagueData.users.forEach((user) => {
        if (!newUserMap.has(user.user_id)) {
          newUserMap.set(user.user_id, user.metadata?.team_name || user.display_name || 'Unknown');
        }
      });
    });
    setUserMap(newUserMap);
  }, [data]);

  useEffect(() => {
    // Process regardless of playerData - if we have player data, use it; otherwise we'll just show what we can
    getFootballPlayerChampions();
  }, [playerData, data, selectedSort]);

  if (isLoading) {
    return (
      <div>
        <HallOfFameNavBar data={data} />
        <div className="loading-container">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <HallOfFameNavBar data={data} />
      <div className="football-player-container">
        <div className="football-player-header">
          <h2 className="football-player-title">🏈 Championship Football Players 🏈</h2>
        </div>

        {/* Position Selector */}
        <div className="position-selector">
          {POSITIONS.map((position) => (
            <label key={position} className="position-radio">
              <input
                type="radio"
                name="position"
                value={position}
                checked={selectedPosition === position}
                onChange={() => setSelectedPosition(position)}
              />
              <span className="position-label">{position}</span>
            </label>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="sort-selector">
          <label className="sort-radio">
            <input
              type="radio"
              name="sort"
              value="year"
              checked={selectedSort === 'year'}
              onChange={() => setSelectedSort('year')}
            />
            <span className="sort-label">Sort by Year</span>
          </label>
          <label className="sort-radio">
            <input
              type="radio"
              name="sort"
              value="points"
              checked={selectedSort === 'points'}
              onChange={() => setSelectedSort('points')}
            />
            <span className="sort-label">Sort by Points</span>
          </label>
        </div>

        {/* Players Card Grid */}
        <div className="players-card-grid">
          {(sortedFootballPlayers.get(selectedPosition) || []).length > 0 ? (
            (sortedFootballPlayers.get(selectedPosition) || []).map((playerInfo, index) => {
              const player = playerData.find((p) => p.player_id === playerInfo.footballPlayerId);
              if (!player) return null;

              return (
                <div key={`${selectedPosition}-${index}`} className="player-card-large">
                  <div className="player-card-header">
                    <div className="player-image-wrapper">
                      {player.injury_status ? (
                        <div className="player-image" style={{ backgroundImage: `url(https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg)` }} />
                      ) : (
                        <div className="player-image" style={{ backgroundImage: `url(https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg)` }} />
                      )}
                    </div>
                    <div className="player-info">
                      <h3 className="player-card-name">{player.first_name} {player.last_name}</h3>
                      <p className="player-position">{selectedPosition}</p>
                    </div>
                  </div>

                  <div className="player-card-body">
                    <div className="championship-info">
                      <div className="wins-badge">{playerInfo.wins} 🏆</div>
                      <div className="championship-years-list">
                        {playerInfo.years.map((year, idx) => {
                          const leagueData = data.find((ld) => ld.season === year);
                          const winner = leagueData ? getLeagueWinner(leagueData) : null;
                          const ownerName = winner ? userMap.get(winner.user_id) || 'Unknown' : 'Unknown';
                          const points = playerInfo.points[year] || 0;

                          return (
                            <div key={idx} className="year-info">
                              <span className="year">{year}</span>
                              <span className="points-badge">{points.toFixed(2)} pts</span>
                              <span className="owner">({ownerName})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-players-message">No players at this position</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FootballPlayerChampionshipInfo {
  footballPlayerId: string,
  wins: number,
  years: string[],
  points: { [year: string]: number }
}

export default FootballPlayerChampions;