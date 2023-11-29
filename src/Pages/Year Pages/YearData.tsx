// YearData.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar'; // Import the YearNavBar component
import SleeperRoster from '../../Interfaces/SleeperRoster';
import SleeperUser from '../../Interfaces/SleeperUser';
import '../../Stylesheets/Year Stylesheets/YearData.css'; // Create a CSS file for styling

interface YearDataProps {
  data: LeagueData;
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<string>('wins'); // Initial sort by 'wins'

  const rosters = data.rosters;
  const users = data.users;


  const sortedRosters = rosters.slice().sort((a, b) => {
    if (sortBy === 'wins') {
      return b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts;
    } else {
      return 0;
    }
  });

  return (
    <div>
      <YearNavBar data={data} /> {/* Render the YearNavBar component */}

      <h2>{`Season ${data.season}`}</h2>
      {/* Display other information about the season */}

      {/* Display the team information table */}
      <table className="records-table">
        <thead>
          <tr>
            <th style={{ width: '250px' }}>
              Team
            </th>
            <th>Record</th>
            <th style={{ width: '150px' }}>
              Points For
            </th>
            <th style={{ width: '150px' }}>
              Points Against
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRosters.map((roster) => (
            <tr key={roster.roster_id}>
              <td>{users.find((user) => user.user_id === roster.owner_id)?.metadata.team_name}</td>
              <td>{`${roster.settings.wins}-${roster.settings.losses}`}</td>
              <td>{`${roster.settings.fpts}.${roster.settings.fpts_decimal}`}</td>
              <td>{`${roster.settings.fpts_against}.${roster.settings.fpts_against_decimal}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default YearData;
