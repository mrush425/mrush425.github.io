// YearData.tsx
import React, { useState, useEffect } from 'react'; // Import useEffect
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar'; // Import the YearNavBar component
import '../../Stylesheets/Year Stylesheets/YearData.css'; // Create a CSS file for styling
import { displayRecord, getAverageLeagueRecordAtSchedule, getAverageRecordAgainstLeague, getLeagueRecordAtSchedule, getRecordAgainstLeague, getRecordInTop50 } from '../../Helper Files/RecordCalculations';
import yearSidebetsData from '../../Data/yearSidebets.json';
import SidebetMethods, { Sidebet, YearSidebet } from './SidebetMethods';
import SidebetStat from '../../Interfaces/SidebetStat';
import SidebetStats from './SidebetStats';
import { getLast3WeeksAveragePointsMap, getUserSeasonPlace } from '../../Helper Files/HelperMethods';


interface YearDataProps {
  data: LeagueData;
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<'seasonPlace' | 'wins' | 'fpts' | 'last3Ave' | 'fptsAgainst' | 'winsAgainstEveryone' | 'winsAtSchedule' | 'winsTop50' | 'default'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortedRosters, setSortedRosters] = useState(data.rosters); // Initial state with data.rosters
  const users = data.users;
  const last3AveragePointsMap = getLast3WeeksAveragePointsMap(data);

  const handleSort = (column: 'seasonPlace' | 'wins' | 'fpts' | 'last3Ave' | 'fptsAgainst' | 'winsAgainstEveryone' | 'winsAtSchedule' | 'winsTop50') => {
    setSortBy(column);
    setSortDirection(sortBy === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc');
  };

  useEffect(() => {
    // Use useEffect to sort the data when it changes
    const sortedData = data.rosters.slice().sort((a, b) => {
      const userA = users.find((u) => u.user_id === a.owner_id);
      const userB = users.find((u) => u.user_id === b.owner_id);
      if (!userA || !userB) return 0;

      if (sortBy === 'seasonPlace') {
        const placeA = getUserSeasonPlace(userA.user_id, data);
        const placeB = getUserSeasonPlace(userB.user_id, data);
        return sortDirection === 'asc' ? placeA - placeB : placeB - placeA;
      }
      else if (sortBy === 'wins' || sortBy === 'default') {
        return sortDirection === 'asc' ? a.settings.wins - b.settings.wins || a.settings.fpts - b.settings.fpts : b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts;
      } else if (sortBy === 'fpts') {
        const fptsA = parseFloat(`${a.settings.fpts}.${a.settings.fpts_decimal}`);
        const fptsB = parseFloat(`${b.settings.fpts}.${b.settings.fpts_decimal}`);
        return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
      }
        else if (sortBy === 'last3Ave') {
          const fptsA = parseFloat(last3AveragePointsMap.get(userA.user_id)?.toFixed(2) ?? "");
          const fptsB = parseFloat(last3AveragePointsMap.get(userB.user_id)?.toFixed(2) ?? "");
          return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
      } else if (sortBy === 'fptsAgainst') {
        const fptsA = parseFloat(`${a.settings.fpts_against}.${a.settings.fpts_against_decimal}`);
        const fptsB = parseFloat(`${b.settings.fpts_against}.${b.settings.fpts_against_decimal}`);
        return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
      } else if (sortBy === 'winsAgainstEveryone') {
        const winsA = getRecordAgainstLeague(userA, data)[0];
        const winsB = getRecordAgainstLeague(userB, data)[0];
        return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
      } else if (sortBy === 'winsAtSchedule') {
        const winsA = getLeagueRecordAtSchedule(userA, data)[0];
        const winsB = getLeagueRecordAtSchedule(userB, data)[0];
        return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
      } else if (sortBy === 'winsTop50') {
        const winsA = getRecordInTop50(userA, data)[0];
        const winsB = getRecordInTop50(userB, data)[0];
        return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
      } else {
        return 0;
      }
    });
    setSortedRosters(sortedData);
  }, [data.rosters, sortBy, sortDirection]); // Run the effect whenever data.rosters, sortBy, or sortDirection changes

  const sidebetsDisplay: SidebetDisplay[] = [];
  const getSidebetData = () => {
    const yearSidebets: YearSidebet[] = yearSidebetsData.filter((yearSidebet) => yearSidebet.year === data.season);
    yearSidebets.map((yearSidebet) => {
      const sidebet: Sidebet | undefined = SidebetMethods.Sidebets().find(sidebet => sidebet.displayName === yearSidebet.sidebetName);
      console.log(sidebet);
      if (sidebet) {
        const result: SidebetStat[] | undefined = (SidebetMethods as any)[sidebet.methodName]?.(data);
        let sidebetDisplay: SidebetDisplay = {
          sidebetName: sidebet.displayName,
          winners: [],
          statDisplays: []
        };
        if (result) {
          sidebetDisplay.winners.push(result[0].user?.metadata.team_name || "something went wrong")
          sidebetDisplay.statDisplays.push(result[0].stats_display || "something went wrong");
          if (result[0].stat_number) {
            for (let i = 1; i < result.length; i++) {
              if (result[i].stat_number === result[0].stat_number) {
                sidebetDisplay.statDisplays.push(result[i].stats_display || "something went wrong");
              }
            }
          } else {
            for (let i = 1; i < result.length; i++) {
              if (result[i].stats_record?.wins === result[0].stats_record?.wins && result[i].stats_record?.losses === result[0].stats_record?.losses) {
                sidebetDisplay.statDisplays.push(result[i].stats_display || "something went wrong");
              }
            }
          }
        } else {
          sidebetDisplay.winners.push("n/a");
          sidebetDisplay.statDisplays.push("n/a");
        }
        sidebetsDisplay.push(sidebetDisplay);
      }
    });
  };

  getSidebetData();

  return (
    <div>
      <YearNavBar data={data} /> 

      <h2>{`Season ${data.season}`}</h2>
      <table className="records-table">
        <thead>
          <tr>
            <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('seasonPlace')}>
              Season Place
              {sortBy === 'seasonPlace' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ width: '150px' }}>
              Team
            </th>
            <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('wins')}>
              Record
              {sortBy === 'wins' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('fpts')}>
              Points
              {sortBy === 'fpts' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('last3Ave')}>
              Last 3 Average
              {sortBy === 'last3Ave' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '130px' }} onClick={() => handleSort('fptsAgainst')}>
              Points Against
              {sortBy === 'fptsAgainst' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsAgainstEveryone')}>
              Record Against Everyone
              {sortBy === 'winsAgainstEveryone' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsAtSchedule')}>
              League Record at Schedule
              {sortBy === 'winsAtSchedule' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
            <th style={{ cursor: 'pointer', width: '160px' }} onClick={() => handleSort('winsTop50')}>
              Record in top 50%
              {sortBy === 'winsTop50' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRosters.map((roster,index) => {
            const user = users.find((u) => u.user_id === roster.owner_id);
            const seasonPlace = user ? getUserSeasonPlace(user.user_id, data) : null;
            let recordAgainstEveryone: string = "";
            let leagueRecordAtSchedule: string = "";
            let averageRecordAgainstEveryone: string = "";
            let averageLeagueRecordAtSchedule: string = "";
            let recordInTop50: string = "";
            let className="";
            let last3Average="";

            if(user && getUserSeasonPlace(user.user_id,data)<=6){
              className="playoffs-team";
            }

            if (user) {
              recordAgainstEveryone = displayRecord(...getRecordAgainstLeague(user, data));
              leagueRecordAtSchedule = displayRecord(...getLeagueRecordAtSchedule(user, data));
              averageRecordAgainstEveryone = displayRecord(...getAverageRecordAgainstLeague(user, data));
              averageLeagueRecordAtSchedule = displayRecord(...getAverageLeagueRecordAtSchedule(user, data));
              recordInTop50 = displayRecord(...getRecordInTop50(user, data));
              last3Average = last3AveragePointsMap.get(user.user_id)?.toFixed(2) ?? "";
            }

            return (
              <tr className={className} key={roster.roster_id}>
                <td>{seasonPlace}</td>
                <td>{user?.metadata.team_name}</td>
                <td>{`${roster.settings.wins}-${roster.settings.losses}`}</td>
                <td>{`${roster.settings.fpts}.${roster.settings.fpts_decimal}`}</td>
                <td>{`${last3Average}`}</td>
                <td>{`${roster.settings.fpts_against}.${roster.settings.fpts_against_decimal}`}</td>
                <td>{`${recordAgainstEveryone} (${averageRecordAgainstEveryone})`}</td>
                <td>{`${leagueRecordAtSchedule} (${averageLeagueRecordAtSchedule})`}</td>
                <td>{`${recordInTop50}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ marginTop: "30px" }}>Sidebets</h3>
      <table className="sidebets-table">
        <thead>
          <tr>
            <th>Sidebet</th>
            <th>Winner</th>
            <th>Stat</th>
          </tr>
        </thead>
        <tbody>
          {sidebetsDisplay.map((sidebetDisplay) => {
            return (
              <tr>
                <td>{sidebetDisplay.sidebetName}</td>
                <td>
                  {sidebetDisplay.winners.map((winner, index) => (
                    <table className='single-sidebet-table' key={index}>
                      <tbody>
                        <tr>
                          <td>{winner}</td>
                        </tr>
                      </tbody>
                    </table>
                  ))}
                </td>
                <td>
                  {sidebetDisplay.statDisplays.map((statDisplay, index) => (
                    <table className='single-sidebet-table' key={index}>
                      <tbody>
                        <tr>
                          <td>{statDisplay}</td>
                        </tr>
                      </tbody>
                    </table>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface SidebetDisplay {
  sidebetName: string | undefined,
  winners: string[],
  statDisplays: string[]
}

export default YearData;
