import React, { useState, useEffect } from 'react';
import '../../Stylesheets/League Stylesheets/LeagueHome.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import { getBowlWinner } from '../../Helper Files/HelperMethods';
import MatchupDisplay from '../../Components/MatchupDisplay';
import LeagueData from '../../Interfaces/LeagueData';

const LeagueHome: React.FC<LeagueProps> = ({ data }) => {
  const [matchupData, setMatchupData] = useState<{
    winner: any;
    loser: any;
    week: number;
    secondWeek: number | null;
    leagueData: LeagueData | null;
    bowl: string | null;
  }>({
    winner: null,
    loser: null,
    week: 0,
    secondWeek: null,
    leagueData: null,
    bowl: null,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bowlNames = [
    'Troll Bowl',
    'Bengal Bowl',
    'Koozie Bowl',
    'Toilet Bowl',
    'Diarrhea Bowl',
    'Butler Bowl',
  ];

  const handleWinnerClick = (
    winner: any,
    loser: any,
    leagueData: LeagueData,
    bowl: string
  ) => {
    if (bowl === 'Butler Bowl' || bowl === 'Koozie Bowl') {
      setMatchupData({
        winner,
        loser,
        week: leagueData.settings.playoff_week_start + 1,
        secondWeek: leagueData.settings.playoff_week_start + 2,
        leagueData,
        bowl,
      });
    } else {
      setMatchupData({
        winner,
        loser,
        week: leagueData.settings.playoff_week_start + 2,
        secondWeek: null,
        leagueData,
        bowl,
      });
    }
    if (isMobile) {
      setViewMode('matchup'); // Switch to matchup view on mobile
    }
  };

  const handleBackClick = () => {
    setViewMode('table'); // Return to table view on mobile
  };

  return (
    <div className="league-home-container">
      <LeagueNavBar data={data} />
      <div className="league-home-content">
        {/* Desktop: Show table and matchup side by side */}
        {!isMobile && (
          <>
            <div className="league-stats-section">
              <table className="league-stats-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    {bowlNames.map((bowl) => (
                      <th key={bowl}>{bowl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((league, index) => (
                    <tr key={index}>
                      <td>{league.season}</td>
                      {bowlNames.map((bowl) => {
                        const [winner, loser] = getBowlWinner(bowl, league);
                        return (
                          <td
                            key={bowl}
                            className="clickable-winner"
                            onClick={() =>
                              handleWinnerClick(winner, loser, league, bowl)
                            }
                          >
                            {winner ? winner.metadata.team_name : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="matchup-display-section">
              <MatchupDisplay
                user1={matchupData.winner}
                user2={matchupData.loser}
                data={matchupData.leagueData}
                week={matchupData.week}
                secondWeek={matchupData.secondWeek ?? undefined}
                title={`${matchupData.bowl} ${matchupData.leagueData?.season}`}
              />
            </div>
          </>
        )}

        {/* Mobile: Show one section at a time */}
        {isMobile && viewMode === 'table' && (
          <div className="league-stats-section mobile-visible">
            <table className="league-stats-table">
              <thead>
                <tr>
                  <th>Season</th>
                  {bowlNames.map((bowl) => (
                    <th key={bowl}>{bowl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((league, index) => (
                  <tr key={index}>
                    <td>{league.season}</td>
                    {bowlNames.map((bowl) => {
                      const [winner, loser] = getBowlWinner(bowl, league);
                      return (
                        <td
                          key={bowl}
                          className="clickable-winner"
                          onClick={() =>
                            handleWinnerClick(winner, loser, league, bowl)
                          }
                        >
                          {winner ? winner.metadata.team_name : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isMobile && viewMode === 'matchup' && (
          <div className="matchup-display-section mobile-visible">
            <button className="back-button" onClick={handleBackClick}>
              Back
            </button>
            <MatchupDisplay
              user1={matchupData.winner}
              user2={matchupData.loser}
              data={matchupData.leagueData}
              week={matchupData.week}
              secondWeek={matchupData.secondWeek ?? undefined}
              title={`${matchupData.bowl} ${matchupData.leagueData?.season}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueHome;
