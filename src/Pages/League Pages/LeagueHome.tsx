import React from 'react';
import '../../Stylesheets/League Stylesheets/LeagueHome.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import { getBowlWinner } from '../../Helper Files/HelperMethods';

const LeagueHome: React.FC<LeagueProps> = ({ data }) => {
  const bowlNames = [
    "Troll Bowl",
    "Bengal Bowl",
    "Koozie Bowl",
    "Toilet Bowl",
    "Diarrhea Bowl",
    "Butler Bowl",
  ];

  return (
    <div>
      <LeagueNavBar data={data} />
      <h2>Overall League Stats (Under Construction)</h2>
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
                const [winner] = getBowlWinner(bowl, league);
                return (
                  <td key={bowl}>
                    {winner ? winner.metadata.team_name : "N/A"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeagueHome;
