// YearData.tsx
import React, { useState } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar'; // Import the YearNavBar component
import '../../Stylesheets/Year Stylesheets/YearData.css'; // Create a CSS file for styling
import { displayRecord, getAverageLeagueRecordAtSchedule, getAverageRecordAgainstLeague, getLeagueRecordAtSchedule, getRecordAgainstLeague, getRecordInTop50 } from '../../Helper Files/RecordCalculations';

interface YearDataProps {
  data: LeagueData;
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  const sortBy='wins';
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
      <table className="records-table">
        <thead>
          <tr>
            <th style={{ width: '200px' }}>
              Team
            </th>
            <th>Record</th>
            <th style={{ width: '100px' }}>
              Points For
            </th>
            <th style={{ width: '100px' }}>
              Points Against
            </th>
            <th style={{ width: '175px' }}>
              Record Against Everyone
            </th>
            <th style={{ width: '175px' }}>
              League Record at Schedule
            </th>
            <th style={{ width: '175px' }}>
              Record in top 50%
            </th>
          </tr>
        </thead>
        <tbody>
        {sortedRosters.map((roster) => {
            const user = users.find((u) => u.user_id === roster.owner_id);
            let recordAgainstEveryone: string = "";
            let leagueRecordAtSchedule: string = ""; 
            let averageRecordAgainstEveryone: string = "";
            let averageLeagueRecordAtSchedule: string = ""; 
            let recordInTop50: string = "";
            if(user){
              recordAgainstEveryone = displayRecord(...getRecordAgainstLeague(user, data));
              leagueRecordAtSchedule = displayRecord(...getLeagueRecordAtSchedule(user, data));
              averageRecordAgainstEveryone = displayRecord(...getAverageRecordAgainstLeague(user, data));
              averageLeagueRecordAtSchedule = displayRecord(...getAverageLeagueRecordAtSchedule(user, data));
              recordInTop50 = displayRecord(...getRecordInTop50(user,data));
            }


            return (
              <tr key={roster.roster_id}>
                <td>{user?.metadata.team_name}</td>
                <td>{`${roster.settings.wins}-${roster.settings.losses}`}</td>
                <td>{`${roster.settings.fpts}.${roster.settings.fpts_decimal}`}</td>
                <td>{`${roster.settings.fpts_against}.${roster.settings.fpts_against_decimal}`}</td>
                <td>{`${recordAgainstEveryone} (${averageRecordAgainstEveryone})`}</td>
                <td>{`${leagueRecordAtSchedule} (${averageLeagueRecordAtSchedule})`}</td>
                <td>{`${recordInTop50}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default YearData;
