import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';

import '../../Stylesheets/Year Stylesheets/AllPlayoffPossibilities.css';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findRosterByUserId, findUserByRosterId, getAveragePointsMap, getLast3WeeksAveragePointsMap, getUserSeasonPlace } from '../../Helper Files/HelperMethods';
import Matchup from '../../Interfaces/Matchup';
import { calculateScheduleRecord } from '../../Helper Files/RecordCalculations';

interface AllPlayoffPossibilitiesProps {
  data: LeagueData;
}

interface Record {
  userId: string;
  pointsFor: number;
  wins: number;
  losses: number;
  ties: number;
}


const AllPlayoffPossibilities: React.FC<AllPlayoffPossibilitiesProps> = ({ data }) => {
  const maxCombinations = 500000;

  // Define state to toggle between the two maps
  const [useLast3Points, setUseLast3Points] = useState(false);

  // Fetch both maps
  const averagePointsMap = getAveragePointsMap(data);
  const averageLast3PointsMap = getLast3WeeksAveragePointsMap(data);

  const userWinsMap: Map<string, Map<number, number>> = new Map();

  // Initialize userWinsMap for each user with 0 wins through 15
  data.users.forEach((user) => {
    const userWins = new Map<number, number>(Array.from({ length: 16 }, (_, i) => [i, 0]));
    userWinsMap.set(user.user_id, userWins);
  });

  const sortedData = data.users.slice().sort((a, b) => {
    const rosterA = data.rosters.find((u) => u.owner_id === a.user_id);
    const rosterB = data.rosters.find((u) => u.owner_id === b.user_id);
    if (!rosterA || !rosterB) return 0;
    return rosterB.settings.wins - rosterA.settings.wins || rosterB.settings.fpts - rosterA.settings.fpts;
  });

  const userMaps: Map<string, Map<number, number>>[] = sortedData.map((user) => {
    const userMap = new Map<number, number>(Array.from({ length: 12 }, (_, index) => [index + 1, 0]));
    const mapForUser = new Map<string, Map<number, number>>();
    mapForUser.set(user.user_id, userMap);
    return mapForUser;
  });

  const userPlaceMap: Map<string, Map<number, number>> = new Map();
  userMaps.forEach((userMap) => {
    userMap.forEach((value, key) => {
      userPlaceMap.set(key, value);
    });
  });

  const calculateRecord = () => {
    let recordArray: Record[] = [];
    data.users.forEach((user) => {
      const roster = data.rosters.find((roster) => roster.owner_id === user.user_id);
      let points = 0;
      if (roster) points = roster.settings.fpts + roster.settings.fpts_decimal;
      let [currentWins, currentLosses, currentTies] = calculateScheduleRecord(user, user, data);
      let record: Record = {
        userId: user.user_id,
        pointsFor: points,
        wins: currentWins,
        losses: currentLosses,
        ties: currentTies,
      };
      recordArray.push(record);
    });
    //console.log(recordArray);
  };

  const runSimulation = () => {
    let recordArray: Record[] = [];
    data.users.forEach((user) => {
      const roster = data.rosters.find((roster) => roster.owner_id === user.user_id);
      let points: number = 0;
      if (roster) points = roster.settings.fpts + (roster.settings.fpts_decimal * 0.01);
      let [currentWins, currentLosses, currentTies] = calculateScheduleRecord(user, user, data);
      let record: Record = {
        userId: user.user_id,
        pointsFor: points,
        wins: currentWins,
        losses: currentLosses,
        ties: currentTies,
      };
      recordArray.push(record);
    });

    // Use the correct points map based on the toggle state
    const pointsMap = useLast3Points ? averageLast3PointsMap : averagePointsMap;

    if (data.nflSeasonInfo.season === data.season) {
      for (let week = data.nflSeasonInfo.week; week < data.settings.playoff_week_start; week++) {
        const weeklyMatchups = data.matchupInfo.filter((matchup) => matchup.week === week);
        weeklyMatchups.forEach((matchup) => {

          for (let i = 1; i <= matchup.matchups.length / 2; i++) {
            const team1RosterId = matchup.matchups.find(match => match.matchup_id === i)?.roster_id;
            const team1 = team1RosterId ? findUserByRosterId(team1RosterId, data) : null;
            
            const team2RosterId = matchup.matchups
              .filter(match => match.matchup_id === i && match.roster_id !== team1RosterId)
              .map(match => match.roster_id)[0]; // Get the first match with a different roster_id
            const team2 = team2RosterId ? findUserByRosterId(team2RosterId, data) : null;

            if (!team1 || !team2) continue;

            const team1Average = pointsMap.get(team1.user_id) || 0;
            const team2Average = pointsMap.get(team2.user_id) || 0;
            const totalAverage = team1Average + team2Average;

            const team1Chance = (team1Average / totalAverage) * 100;
            const randomResult = Math.random() * 100;

            const team1Record = recordArray.find((record) => record.userId === team1.user_id);
            const team2Record = recordArray.find((record) => record.userId === team2.user_id);

            if (team1Record && team2Record) {
              if (randomResult < team1Chance) {
                team1Record.wins++;
                team2Record.losses++;
              } else if (randomResult > team1Chance) {
                team2Record.wins++;
                team1Record.losses++;
              } else {
                team1Record.ties++;
                team2Record.ties++;
              }
            }
          }
        });
      }
    }
    

    // Track win counts for the new win distribution table
    recordArray.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    });

    recordArray.forEach((record, index) => {
      const userPlace = userPlaceMap.get(record.userId);
      if (userPlace) {
        const timesAtPlace = (userPlace?.get(index + 1) ?? 0) as number;
        userPlace.set(index + 1, timesAtPlace + 1);
      }
      const winsMap = userWinsMap.get(record.userId);
      if (winsMap) {
        const currentCount = winsMap.get(record.wins) || 0;
        winsMap.set(record.wins, currentCount + 1);
      }
    });
  };

  const fillUserPlaceMap = () => {
    const usersCount = data.users.length;
    const rosterIds = Array.from({ length: usersCount }, (_, i) => i + 1);
    for (let i = 0; i < maxCombinations; i++) {
      runSimulation();
    }
  };

  // Call the fillUserPlaceMap method
  fillUserPlaceMap();

  const tableHeaders = ["Team Name", "Place in Season", "Current Record", "Times in the Playoffs", ...Array.from({ length: 12 }, (_, index) => index + 1)];

  const renderPlaceTable = () => {
    return (
      <table className="all-possibilities-table">
        <thead>
          <tr>
            {tableHeaders.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(userPlaceMap.entries()).map(([userId, userMap]) => {
            const userData = data.users.find((user) => user.user_id === userId);
            const teamName = userData ? userData.metadata.team_name : "";
            if (!userData) return;
            const sumOfFirst6 = Array.from(userMap.values()).slice(0, 6).reduce((sum, value) => sum + value, 0);
            const percentageOfSum = (sumOfFirst6 / maxCombinations) * 100;
            const roundedPercentageOfSum = percentageOfSum.toFixed(2);

            let [currentWins, currentLosses, currentTies] = calculateScheduleRecord(userData, userData, data);

            return (
              <tr key={userId}>
                <td>{teamName}</td>
                <td>{getUserSeasonPlace(userId, data)}</td>
                <td>{currentWins}-{currentLosses}-{currentTies}</td>
                <td>{sumOfFirst6} ({roundedPercentageOfSum}%)</td>
                {Array.from(userMap.values()).map((value, week) => {
                  const percentage = (value / maxCombinations) * 100;
                  const roundedPercentage = percentage === 0 ? "0" : percentage.toFixed(2);
                  return (
                    <td key={week}>
                      {value} ({roundedPercentage}%)
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderWinDistributionTable = () => {
    return (
      <table className="win-distribution-table">
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Place in Season</th>
            {Array.from({ length: 16 }, (_, i) => (
              <th key={i}>{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((user) => {
            const winsMap = userWinsMap.get(user.user_id);
            const roster = data.rosters.find((r) => r.owner_id === user.user_id);
            const teamName = user.metadata.team_name || "";
            const seasonPlace = roster ? getUserSeasonPlace(user.user_id, data) : "";

            return (
              <tr key={user.user_id}>
                <td>{teamName}</td>
                <td>{seasonPlace}</td>
                {Array.from({ length: 16 }, (_, i) => (
                  <td key={i}>{winsMap?.get(i) || 0}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <YearNavBar data={data} />
      <h2>{maxCombinations} Simulations - {!useLast3Points ? "Average Points" : "Last 3 Game Average Points"}</h2>
      {/* Toggle button to switch between average points and last 3 weeks average */}
      <button onClick={() => {
        setUseLast3Points(!useLast3Points); 
        fillUserPlaceMap();  // Re-run the simulation with the new map
      }}
      className="button-margin">
      
      {useLast3Points ? "Run with Average Points" : "Run with Last 3 Game Average Points"}
      </button>
      {renderPlaceTable()}
      <h2 style={{ marginTop: '30px' }}>Win Distribution</h2>
      {renderWinDistributionTable()}
    </div>
  );
};

export default AllPlayoffPossibilities;
