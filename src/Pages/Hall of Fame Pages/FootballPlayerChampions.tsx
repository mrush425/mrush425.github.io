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

  let footballPlayerChampionships: FootballPlayerChampionshipInfo[] = [];

  const getFootballPlayerChampions = () => {
    data.map((leagueData) => {
      const leagueWinner: SleeperUser | undefined = getLeagueWinner(leagueData);
      if (leagueWinner) {
        const leagueWinnerRosterId: SleeperRoster | undefined = findRosterByUserId(leagueWinner.user_id, leagueData.rosters);
        const matchupInfo: MatchupInfo | undefined = leagueData.matchupInfo.find((matchupInfo) => matchupInfo.week === leagueData.settings.playoff_week_start + 2);
        const matchup: Matchup | undefined = matchupInfo?.matchups.find((matchup) => matchup.roster_id === leagueWinnerRosterId?.roster_id);

        if (matchup) {
          matchup.starters.map((starter) => {
            let footballPlayerChampionshipInfo = footballPlayerChampionships.find((fpci) => fpci.footballPlayerId === starter);
            if (footballPlayerChampionshipInfo) {
              footballPlayerChampionshipInfo.wins++;
              footballPlayerChampionshipInfo.years.push(leagueData.season);
            }
            else {
              footballPlayerChampionshipInfo = {
                footballPlayerId: starter,
                wins: 1,
                years: [leagueData.season]
              };
              footballPlayerChampionships.push(footballPlayerChampionshipInfo);
            }
          });
        }
      }
    });
    footballPlayerChampionships.sort((a, b) => b.wins - a.wins);

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
      players.sort((a, b) => b.wins - a.wins);
    });

    setSortedFootballPlayers(playersByPosition);
    setIsLoading(false);
  };

  const getPlayerDataFromLeague = (leagueData: any[]) => {
    const players = new Map<string, Player>();
    leagueData.forEach((league) => {
      if (league.players) {
        league.players.forEach((player: Player) => {
          if (!players.has(player.player_id)) {
            players.set(player.player_id, player);
          }
        });
      }
    });
    setPlayerData(Array.from(players.values()));
  };

  useEffect(() => {
    getPlayerDataFromLeague(data);
  }, [data]);

  useEffect(() => {
    if (playerData.length > 0) {
      getFootballPlayerChampions();
    }
  }, [playerData]);

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
          <p className="football-player-subtitle">Players who have appeared in championship rosters</p>
        </div>

        <div className="positions-grid">
          {POSITIONS.map((position) => {
            const playersAtPosition = sortedFootballPlayers.get(position) || [];
            const colors = POSITION_COLORS[position];

            return (
              <div 
                key={position} 
                className="position-column"
                style={{
                  '--position-bg': colors.bg,
                  '--position-border': colors.border,
                  '--position-accent': colors.accent
                } as React.CSSProperties & { [key: string]: string }}
              >
                <div className="position-header" style={{ borderColor: colors.accent, backgroundColor: colors.bg }}>
                  <span className="position-title">{position}</span>
                </div>

                <div className="players-list">
                  {playersAtPosition.length > 0 ? (
                    playersAtPosition.map((playerInfo, index) => {
                      const player = playerData.find((p) => p.player_id === playerInfo.footballPlayerId);
                      if (!player) return null;

                      return (
                        <div key={`${position}-${index}`} className="player-card">
                          <div className="player-name">
                            {player.first_name} {player.last_name}
                          </div>
                          <div className="championship-badge">
                            {playerInfo.wins} 🏆
                          </div>
                          <div className="championship-years">
                            {playerInfo.years.map((year, idx) => (
                              <span key={idx} className="year-pill">{year}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-players">No players yet</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FootballPlayerChampionshipInfo {
  footballPlayerId: string,
  wins: number,
  years: string[]
}

export default FootballPlayerChampions;