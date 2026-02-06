import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import MatchupDisplay from '../../Components/MatchupDisplay';
import '../../Stylesheets/YearStylesheets/Playoffs.css';
import { getUserSeasonPlace, getScoreForWeek } from '../../Helper Files/HelperMethods';

type BracketType = 'winners' | 'losers';

interface PlayoffsProps {
  data: LeagueData;
}

interface BracketMatchup {
  id: string;
  seed1: number;
  seed2: number;
  user1Id?: string;
  user2Id?: string;
  winnerId?: string;
  round: number;
  bowlName?: string;
  week?: number;
  secondWeek?: number;
}

const Playoffs: React.FC<PlayoffsProps> = ({ data }) => {
  const [bracketType, setBracketType] = useState<BracketType>('winners');
  const [selectedMatchup, setSelectedMatchup] = useState<BracketMatchup | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get user by seed
  const getUserBySeed = (seed: number, bracketType: BracketType): string | undefined => {
    const targetPlace = bracketType === 'winners' ? seed : seed + 6;
    
    for (const user of data.users) {
      const seasonPlace = getUserSeasonPlace(user.user_id, data);
      if (seasonPlace === targetPlace) {
        return user.user_id;
      }
    }
    return undefined;
  };

  // Get playoff weeks start
  const getPlayoffStartWeek = (): number => {
    return data.settings.playoff_week_start || 14;
  };

  // Determine winner of a matchup based on scores
  const getMatchupWinner = (matchup: BracketMatchup): string | undefined => {
    if (!matchup.week || !matchup.user1Id || !matchup.user2Id) return undefined;

    const user1 = data.users.find(u => u.user_id === matchup.user1Id);
    const user2 = data.users.find(u => u.user_id === matchup.user2Id);
    
    if (!user1 || !user2) return undefined;

    // Check if matchup data exists for this week
    const matchupInfo = data.matchupInfo.find(m => m.week === matchup.week);
    if (!matchupInfo || matchupInfo.matchups.length === 0) return undefined;

    const user1Score = getScoreForWeek(user1, matchup.week, data);
    const user2Score = getScoreForWeek(user2, matchup.week, data);

    // Only determine winner if we have valid scores (not 0 for both)
    if (user1Score === 0 && user2Score === 0) return undefined;

    if (user1Score > user2Score) return matchup.user1Id;
    if (user2Score > user1Score) return matchup.user2Id;
    return undefined; // Tie
  };

  // Build bracket matchups for current bracket type
  const buildBracketMatchups = (): BracketMatchup[] => {
    const matchups: BracketMatchup[] = [];
    const playoffStart = getPlayoffStartWeek();

    // First round at playoff_week_start
    const wr1: BracketMatchup = {
      id: 'wr1',
      seed1: 3,
      seed2: 6,
      user1Id: getUserBySeed(3, bracketType),
      user2Id: getUserBySeed(6, bracketType),
      round: 1,
      week: playoffStart,
    };
    matchups.push(wr1);

    const wr2: BracketMatchup = {
      id: 'wr2',
      seed1: 4,
      seed2: 5,
      user1Id: getUserBySeed(4, bracketType),
      user2Id: getUserBySeed(5, bracketType),
      round: 1,
      week: playoffStart,
    };
    matchups.push(wr2);

    // Second round at playoff_week_start + 1
    const wr2Winner = getMatchupWinner(wr2);
    const wr3: BracketMatchup = {
      id: 'wr3',
      seed1: 1,
      seed2: 0,
      user1Id: getUserBySeed(1, bracketType),
      user2Id: wr2Winner || getUserBySeed(4, bracketType),
      round: 2,
      week: playoffStart + 1,
    };
    matchups.push(wr3);

    const wr1Winner = getMatchupWinner(wr1);
    const wr4: BracketMatchup = {
      id: 'wr4',
      seed1: 2,
      seed2: 0,
      user1Id: getUserBySeed(2, bracketType),
      user2Id: wr1Winner || getUserBySeed(3, bracketType),
      round: 2,
      week: playoffStart + 1,
    };
    matchups.push(wr4);

    // All bowls at playoff_week_start + 2
    const bowlWeek = playoffStart + 2;

    // Koozie Bowl (Winners) / Butler Bowl (Losers) - First round losers (2-week event)
    const wr1Loser = wr1.user1Id && wr1.user2Id && getMatchupWinner(wr1) === wr1.user1Id ? wr1.user2Id : wr1.user1Id;
    const wr2Loser = wr2.user1Id && wr2.user2Id && getMatchupWinner(wr2) === wr2.user1Id ? wr2.user2Id : wr2.user1Id;
    
    const koozieMatchup: BracketMatchup = {
      id: bracketType === 'winners' ? 'koozie' : 'butler',
      seed1: 0,
      seed2: 0,
      user1Id: wr1Loser,
      user2Id: wr2Loser,
      round: 2,
      week: playoffStart + 1,
      secondWeek: bowlWeek,
      bowlName: bracketType === 'winners' ? 'Koozie Bowl' : 'Butler Bowl',
    };
    matchups.push(koozieMatchup);

    // Bengal Bowl (Winners) / Diarrhea Bowl (Losers) - Second round losers
    const wr3Loser = wr3.user1Id && wr3.user2Id && getMatchupWinner(wr3) === wr3.user1Id ? wr3.user2Id : wr3.user1Id;
    const wr4Loser = wr4.user1Id && wr4.user2Id && getMatchupWinner(wr4) === wr4.user1Id ? wr4.user2Id : wr4.user1Id;
    
    const bengalMatchup: BracketMatchup = {
      id: bracketType === 'winners' ? 'bengal' : 'diarrhea',
      seed1: 0,
      seed2: 0,
      user1Id: wr3Loser,
      user2Id: wr4Loser,
      round: 3,
      week: bowlWeek,
      bowlName: bracketType === 'winners' ? 'Bengal Bowl' : 'Diarrhea Bowl',
    };
    matchups.push(bengalMatchup);

    // Troll Bowl (Winners) / Toilet Bowl (Losers) - Championship (second round winners)
    const wr3Winner = getMatchupWinner(wr3) || getUserBySeed(1, bracketType);
    const wr4Winner = getMatchupWinner(wr4) || getUserBySeed(2, bracketType);
    
    const trollMatchup: BracketMatchup = {
      id: bracketType === 'winners' ? 'troll' : 'toilet',
      seed1: 0,
      seed2: 0,
      user1Id: wr3Winner,
      user2Id: wr4Winner,
      round: 3,
      week: bowlWeek,
      bowlName: bracketType === 'winners' ? 'Troll Bowl' : 'Toilet Bowl',
    };
    matchups.push(trollMatchup);

    return matchups;
  };

  const matchups = buildBracketMatchups();

  const getTeamName = (userId?: string): string => {
    if (!userId) return 'TBD';
    const user = data.users.find(u => u.user_id === userId);
    const seasonPlace = getUserSeasonPlace(userId, data);
    const seed = bracketType === 'winners' ? seasonPlace : seasonPlace - 6;
    return `${user?.metadata.team_name || 'Unknown'} (${seed})`;
  };

  const getTeamWithPoints = (userId?: string, matchup?: BracketMatchup): JSX.Element => {
    if (!userId || !matchup?.week) return <>{getTeamName(userId)}</>;
    
    const user = data.users.find(u => u.user_id === userId);
    const score = getScoreForWeek(user!, matchup.week, data);
    const displayScore = score > 0 ? score.toFixed(2) : null;
    
    return (
      <div className='team-with-points'>
        <span>{getTeamName(userId)}</span>
        {displayScore && <span className='team-points'>{displayScore}</span>}
      </div>
    );
  };

  const renderBracket = () => {
    return (
      <div className='bracket-container'>
        {/* First Round */}
        <div className='bracket-round'>
          <h3>First Round</h3>
          <div className='bracket-matchups'>
            {matchups.filter(m => m.round === 1 && !m.bowlName).map(matchup => {
              const winner = getMatchupWinner(matchup);
              return (
                <div
                  key={matchup.id}
                  className={`bracket-match ${selectedMatchup?.id === matchup.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMatchup(matchup)}
                >
                  <div className='match-team'>{getTeamWithPoints(matchup.user1Id, matchup)}</div>
                  <div className='match-vs'>vs</div>
                  <div className='match-team'>{getTeamWithPoints(matchup.user2Id, matchup)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Second Round */}
        <div className='bracket-round'>
          <h3>Second Round</h3>
          <div className='bracket-matchups'>
            {matchups.filter(m => m.round === 2 && !m.bowlName).map(matchup => {
              const winner = getMatchupWinner(matchup);
              return (
                <div
                  key={matchup.id}
                  className={`bracket-match ${selectedMatchup?.id === matchup.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMatchup(matchup)}
                >
                  <div className='match-team'>{getTeamWithPoints(matchup.user1Id, matchup)}</div>
                  <div className='match-vs'>vs</div>
                  <div className='match-team'>{getTeamWithPoints(matchup.user2Id, matchup)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Koozie/Butler Bowl */}
        <div className='bracket-round'>
          <h3>{bracketType === 'winners' ? '🍺 Koozie Bowl 🍺' : '🎩 Butler Bowl 🎩'}</h3>
          <div className='bracket-matchups'>
            {matchups.filter(m => m.bowlName === (bracketType === 'winners' ? 'Koozie Bowl' : 'Butler Bowl')).map(matchup => {
              const winner = getMatchupWinner(matchup);
              return (
                <div
                  key={matchup.id}
                  className={`bracket-match ${selectedMatchup?.id === matchup.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMatchup(matchup)}
                >
                  <div className='match-team'>{getTeamWithPoints(matchup.user1Id, matchup)}</div>
                  <div className='match-vs'>vs</div>
                  <div className='match-team'>{getTeamWithPoints(matchup.user2Id, matchup)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consolation Bracket */}
        <div className='bracket-round'>
          <h3>{bracketType === 'winners' ? '🐯 Bengal Bowl 🐯' : '💩 Diarrhea Bowl 💩'}</h3>
          <div className='bracket-matchups'>
            {matchups.filter(m => m.bowlName === (bracketType === 'winners' ? 'Bengal Bowl' : 'Diarrhea Bowl')).map(matchup => {
              const winner = getMatchupWinner(matchup);
              return (
                <div
                  key={matchup.id}
                  className={`bracket-match ${selectedMatchup?.id === matchup.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMatchup(matchup)}
                >
                  <div className='match-team'>{getTeamWithPoints(matchup.user1Id, matchup)}</div>
                  <div className='match-vs'>vs</div>
                  <div className='match-team'>{getTeamWithPoints(matchup.user2Id, matchup)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Championship Round */}
        <div className='bracket-round'>
          <h3>{bracketType === 'winners' ? '🏆 Troll Bowl 🏆' : '🚽 Toilet Bowl 🚽'}</h3>
          {matchups.filter(m => m.round === 3 && m.bowlName?.includes(bracketType === 'winners' ? 'Troll' : 'Toilet')).map(matchup => {
            const winner = getMatchupWinner(matchup);
            return (
              <div
                key={matchup.id}
                className={`bracket-match ${selectedMatchup?.id === matchup.id ? 'selected' : ''}`}
                onClick={() => setSelectedMatchup(matchup)}
              >
                <div className='match-team'>{getTeamWithPoints(matchup.user1Id, matchup)}</div>
                <div className='match-vs'>vs</div>
                <div className='match-team'>{getTeamWithPoints(matchup.user2Id, matchup)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <YearNavBar data={data} />

      {isMobile && selectedMatchup ? (
        // Mobile detail view
        <div className='playoffs-new-container horizontal-scroll'>
          <button className='back-button' onClick={() => setSelectedMatchup(null)}>
            ← Back to Bracket
          </button>
          <div className='matchup-detail-mobile'>
            <MatchupDisplay
              user1={selectedMatchup.user1Id ? data.users.find(u => u.user_id === selectedMatchup.user1Id) || null : null}
              user2={selectedMatchup.user2Id ? data.users.find(u => u.user_id === selectedMatchup.user2Id) || null : null}
              data={data}
              week={selectedMatchup.week}
              secondWeek={selectedMatchup.secondWeek}
            />
          </div>
        </div>
      ) : (
        // Desktop or mobile bracket view
        <div className='playoffs-new-container horizontal-scroll'>
          <h2 className='playoffs-title'>{`Season ${data.season} Playoffs`}</h2>

          <div className='bracket-toggle'>
            <button
              className={`toggle-button ${bracketType === 'winners' ? 'active' : ''}`}
              onClick={() => setBracketType('winners')}
            >
              Winners Bracket
            </button>
            <button
              className={`toggle-button ${bracketType === 'losers' ? 'active' : ''}`}
              onClick={() => setBracketType('losers')}
            >
              Losers Bracket
            </button>
          </div>

          <div className='playoffs-layout'>
            <div className='bracket-pane'>
              {renderBracket()}
            </div>

            {!isMobile && (
              <div className='details-pane'>
                {selectedMatchup && selectedMatchup.user1Id && selectedMatchup.user2Id ? (
                  <MatchupDisplay
                    user1={data.users.find(u => u.user_id === selectedMatchup.user1Id) || null}
                    user2={data.users.find(u => u.user_id === selectedMatchup.user2Id) || null}
                    data={data}
                    week={selectedMatchup.week}
                    secondWeek={selectedMatchup.secondWeek}
                  />
                ) : (
                  <div className='no-selection'>
                    <p>Select a matchup to view details</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Playoffs;
