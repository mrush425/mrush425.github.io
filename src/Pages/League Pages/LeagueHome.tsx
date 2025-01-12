import React, { useState } from 'react';
import '../../Stylesheets/League Stylesheets/LeagueHome.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import { getBowlWinner } from '../../Helper Files/HelperMethods';
import MatchupDisplay from '../../Components/MatchupDisplay';
import LeagueData from '../../Interfaces/LeagueData'; // Import the LeagueData interface

const LeagueHome: React.FC<LeagueProps> = ({ data }) => {
  const [matchupData, setMatchupData] = useState<{
    winner: any;
    loser: any;
    week: number;
    secondWeek: number | null;
    leagueData: LeagueData | null; // Update the type to use LeagueData
    bowl: string | null;
  }>({
    winner: null,
    loser: null,
    week: 1,
    secondWeek: null,
    leagueData: null,
    bowl: null
  });

  const bowlNames = [
    "Troll Bowl",
    "Bengal Bowl",
    "Koozie Bowl",
    "Toilet Bowl",
    "Diarrhea Bowl",
    "Butler Bowl",
  ];

  const handleWinnerClick = (
    winner: any,
    loser: any,
    leagueData: LeagueData, // Update parameter type to LeagueData
    bowl: string
  ) => {
    if (bowl === "Butler Bowl" || bowl === "Koozie Bowl") {
      setMatchupData({
        winner,
        loser,
        week: leagueData.settings.playoff_week_start+1,
        secondWeek: leagueData.settings.playoff_week_start+2,
        leagueData,
        bowl
      });
    } else {
      setMatchupData({
        winner,
        loser,
        week: leagueData.settings.playoff_week_start+2,
        secondWeek: null,
        leagueData,
        bowl
      });
    }
  };

  return (
    <div>
      <LeagueNavBar data={data} />
      <div className="league-home-container">
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
                        style={{
                          cursor: "pointer",
                          color: winner ? "blue" : "inherit",
                        }}
                      >
                        {winner ? winner.metadata.team_name : "N/A"}
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
            secondWeek={matchupData.secondWeek ?? undefined} // Handle null-to-undefined conversion
            title={`${matchupData.bowl} ${matchupData.leagueData?.season}`}
          />
        </div>
      </div>
    </div>
  );
};

export default LeagueHome;
