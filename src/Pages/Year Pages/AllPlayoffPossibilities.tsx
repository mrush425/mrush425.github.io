import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';

import '../../Stylesheets/Year Stylesheets/AllPlayoffPossibilities.css';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findRosterByUserId, getUserSeasonPlace } from '../../Helper Files/HelperMethods';
import Matchup from '../../Interfaces/Matchup';

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
  const maxCombinations = 50000;
  const getAllPointsMap = (): Map<string, Map<number, number>> => {
    let allPointsMap: Map<string, Map<number, number>> = new Map();

    let relevantMatchups;
    
    data.users.forEach((team) => {
      // Find the matchupInfo for the current team
      let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;

      if (data.nflSeasonInfo.season === data.season) {
        relevantMatchups = data.matchupInfo.filter(
          (matchup) =>
            matchup.week !== data.nflSeasonInfo.week &&
            matchup.week < data.settings.playoff_week_start &&
            matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
      }
      else {
        relevantMatchups = data.matchupInfo.filter(
          (matchup) =>
            matchup.week < data.settings.playoff_week_start &&
            matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
      }

      let playerPointsMap: Map<number, number> = new Map();
      relevantMatchups.forEach((matchup) => {
        const teamMatchup: Matchup | undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        if (teamMatchup) {
          playerPointsMap.set(matchup.week, teamMatchup.points);
        }
      });
      allPointsMap.set(team.user_id, playerPointsMap);
    });
    return allPointsMap;
  }

  const getAllMatchupsMap = (): Map<number, Map<number, number>> => {
    let allMatchupsMap: Map<number, Map<number, number>> = new Map();

    let relevantMatchups: MatchupInfo[];
    if (data.nflSeasonInfo.season === data.season) {
      relevantMatchups = data.matchupInfo.filter(
        (matchup) =>
          matchup.week !== data.nflSeasonInfo.week &&
          matchup.week < data.settings.playoff_week_start
      );
    }
    else {
      relevantMatchups = data.matchupInfo.filter(
        (matchup) =>
          matchup.week < data.settings.playoff_week_start
      );
    }

    relevantMatchups.forEach((matchupInfo) => {
      let weekMatchups: Map<number, number> = new Map();
      matchupInfo.matchups.forEach(matchup => {
        let opponentMatchup = matchupInfo.matchups.find(
          (m) =>
            m.matchup_id === matchup.matchup_id &&
            m.roster_id !== matchup.roster_id
        );
        if (opponentMatchup) {
          weekMatchups.set(matchup.roster_id, opponentMatchup?.roster_id);
        }
      });
      allMatchupsMap.set(matchupInfo.week, weekMatchups);
    });
    return allMatchupsMap;
  }

  const allMatchupsMap = getAllMatchupsMap();
  const allPointsMap = getAllPointsMap();

  const calculateRecordWithUpdatedSchedule = (team: SleeperUser, updatedRosterIds: Map<string, number>): [wins: number, losses: number, ties: number] => {
    let wins: number = 0;
    let losses: number = 0;
    let ties: number = 0;

    for (let week of Array.from(allMatchupsMap.keys())) {
      const playerPoints: number | undefined = allPointsMap.get(team.user_id)?.get(week);
      const playerRosterId: number | undefined = updatedRosterIds.get(team.user_id);
      let opponentRosterId: number | undefined;
      if (playerRosterId) {
        opponentRosterId = allMatchupsMap.get(week)?.get(playerRosterId);
      }
      let opponentUserId: string | undefined;
      if (opponentRosterId) {
        opponentUserId = Array.from(updatedRosterIds.keys()).find(
          (userId) => updatedRosterIds.get(userId) === opponentRosterId
        );
      }
      let opponentPoints: number | undefined;
      if (opponentUserId) {
        opponentPoints = allPointsMap.get(opponentUserId)?.get(week);
      }
      if (playerPoints && opponentPoints) {
        if (playerPoints > opponentPoints) {
          wins++;
        } else if (playerPoints < opponentPoints) {
          losses++;
        } else {
          ties++;
        }
      }
    }
    return [wins, losses, ties];
  }

  const sortedData = data.users.slice().sort((a, b) => {
    const rosterA = data.rosters.find((u) => u.owner_id === a.user_id);
    const rosterB = data.rosters.find((u) => u.owner_id === b.user_id);
    if (!rosterA || !rosterB) return 0;
    return rosterB.settings.wins - rosterA.settings.wins || rosterB.settings.fpts - rosterA.settings.fpts;
  });

  const userMaps: Map<string, Map<number, number>>[] = sortedData.map((user) => {
    // Instantiate a map with keys 1 through 12 and values initialized to 0
    const userMap = new Map<number, number>(
      Array.from({ length: 12 }, (_, index) => [index + 1, 0])
    );

    // Create a map with the user_id as the key and the initialized map as the value
    const mapForUser = new Map<string, Map<number, number>>();
    mapForUser.set(user.user_id, userMap);

    return mapForUser;
  });

  // Combine the maps into a single map
  const userPlaceMap: Map<string, Map<number, number>> = new Map();
  userMaps.forEach((userMap) => {
    userMap.forEach((value, key) => {
      userPlaceMap.set(key, value);
    });
  });

  const fillPlacesForUpdatedSchedule = (updatedRosterIds: Map<string, number>) => {
    let recordArray: Record[] = [];

    data.users.forEach((user) => {
      const roster = data.rosters.find((roster) => roster.owner_id === user.user_id);
      let points = 0;
      if (roster) points = roster?.settings.fpts + roster.settings.fpts_decimal;

      let record: Record = {
        userId: user.user_id,
        pointsFor: points,
        wins: 0,
        losses: 0,
        ties: 0
      };

      [record.wins, record.losses, record.ties] = calculateRecordWithUpdatedSchedule(user, updatedRosterIds);
      recordArray.push(record);
    });

    recordArray.sort((a, b) => {
      // Primary sort by wins
      if (a.wins !== b.wins) {
        return b.wins - a.wins; // Sort in descending order by wins
      }

      // Secondary sort by pointsFor if wins are equal
      return b.pointsFor - a.pointsFor; // Sort in descending order by pointsFor
    });

    // Loop over the sorted recordArray
    recordArray.forEach((record, index) => {
      const userPlace = userPlaceMap.get(record.userId);
      if(userPlace){
        const timesAtPlace = (userPlace?.get(index + 1) ?? 0) as number;
        userPlace.set(index+1,timesAtPlace+1);
      }
    });
  }
  let count=0;
  const fillUserPlaceMap = () => {
    const usersCount = data.users.length;
    const rosterIds = Array.from({ length: usersCount }, (_, i) => i + 1);
  
    const generateRandomCombinations = (callback: Function) => {
      
      const combinations:Set<string> = new Set();
  
      while (combinations.size < maxCombinations) {
        const currentRosterIds = new Map<string, number>();
        for (let i = 0; i < usersCount; i++) {
          const currentUser = data.users[i];
          const randomRosterId = rosterIds[Math.floor(Math.random() * rosterIds.length)];
  
          currentRosterIds.set(currentUser.user_id, randomRosterId);
        }
  
        combinations.add(Array.from(currentRosterIds.values()).toString());
      }
  
      combinations.forEach((combination) => {
        const updatedRosterIds = new Map<string, number>();
        combination.split(',').forEach((value, index) => {
          updatedRosterIds.set(data.users[index].user_id, parseInt(value));
        });
  
        callback(updatedRosterIds);
      });
    };
  
    // Callback function to be invoked for each combination
    const callbackForCombination = (updatedRosterIds: Map<string, number>) => {
      fillPlacesForUpdatedSchedule(updatedRosterIds);
    };
  
    // Start generating random combinations
    generateRandomCombinations(callbackForCombination);
  };
  
  // Call the fillUserPlaceMap method
  fillUserPlaceMap();

  const tableHeaders = ["Team Name", "Place in Season", "Times in the Playoffs",...Array.from({ length: 12 }, (_, index) => index + 1)];

  const renderTable = () => {
  
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
            const teamName = userData ? userData.metadata.team_name : ""; // Get the team name
  
            const sumOfFirst6 = Array.from(userMap.values())
              .slice(0, 6)
              .reduce((sum, value) => sum + value, 0);
  
            const percentageOfSum = (sumOfFirst6 / maxCombinations) * 100;
            const roundedPercentageOfSum = percentageOfSum.toFixed(1); // Round to 1 decimal point
  
            return (
              <tr key={userId}>
                <td>{teamName}</td>
                <td>{getUserSeasonPlace(userId,data)}</td>
                <td>
                  {sumOfFirst6} ({roundedPercentageOfSum}%)
                </td>
                {Array.from(userMap.values()).map((value, week) => {
                  const percentage = (value / maxCombinations) * 100;
                  const roundedPercentage = percentage.toFixed(1); // Round to 1 decimal point
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
  
  return (
    <div>
      <YearNavBar data={data} />
      <h2>{maxCombinations} Simulations</h2>
      {renderTable()}
    </div>
  );
};

export default AllPlayoffPossibilities;