import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import UserWeekStats from '../../Interfaces/UserWeekStats';

import '../../Stylesheets/Year Stylesheets/OvertimeComparison.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'; // Import necessary components from recharts
import AllUserWeekStats from '../../Interfaces/AllUserWeekStats';

interface OvertimeComparisonProps {
  data: LeagueData;
}

const OvertimeComparison: React.FC<OvertimeComparisonProps> = ({ data }) => {
  const [graphData, setGraphData] = useState<AllUserWeekStats[]>([]);

  useEffect(() => {
    const calculateAndSetGraphData = () => {

      const statsArray: AllUserWeekStats[] = [];


      statsArray.push(...getAllUserWeekStats());

      setGraphData(statsArray);
    };
    calculateAndSetGraphData();

  }, [data]);


  const getAllUserWeekStats = (): AllUserWeekStats[] => {
    let allUserStats: AllUserWeekStats[] = [];
    data.users.forEach((user) => {
      allUserStats.push({
        user_id: user.user_id,
        team_name: user.metadata.team_name,
        user_week_stats: [],
      });
    });

    let relevantWeek: number;

    if (data.nflSeasonInfo.season === data.season) {
      relevantWeek = Math.min(data.nflSeasonInfo.week, data.settings.playoff_week_start-1);
    } else {
      relevantWeek = data.settings.playoff_week_start;
    }

    for (let week = 1; week < relevantWeek; week++) {
      const stats = calculateStatsAsOfWeek(week);
      stats.forEach(stat => {
        const userStatsObject = allUserStats.find((userStats) => userStats.user_id === stat.user_id);
        // If the corresponding object is found, push the stat to its user_week_stats array
        if (userStatsObject) {
          userStatsObject.user_week_stats.push(stat);
        }
      });
    }

    return allUserStats;
  }

  const calculateStatsAsOfWeek = (asOfWeek: number): UserWeekStats[] => {
    let allUserWeekStats: UserWeekStats[] = [];

    // Step 1: Create a UserWeekStats object for each user in data.users
    data.users.forEach((user) => {
      allUserWeekStats.push({
        user_id: user.user_id,
        week: asOfWeek,
        wins: 0,
        losses: 0,
        ties: 0,
        rank: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    });

    // Step 2: Get all MatchupInfo objects where MatchupInfo.week <= asOfWeek
    const relevantMatchupInfo = data.matchupInfo.filter((info) => info.week <= asOfWeek);

    // Step 3: Loop through each MatchupInfo object
    relevantMatchupInfo.forEach((info) => {
      // Loop through each Matchup in the MatchupInfo
      let individualMatchups: [any[]] = [[]];

      for (let i = 0; i < info.matchups.length / 2; i++) {
        individualMatchups.push([]);
      }

      info.matchups.forEach((matchup) => {
        // Find user_id for each roster_id
        individualMatchups[matchup.matchup_id - 1].push(matchup);
      });

      individualMatchups.forEach((individualMatchup) => {

        const user1Matchup = individualMatchup[0];
        const user2Matchup = individualMatchup[1];
        const user1Roster = data.rosters.find((roster) => roster.roster_id === user1Matchup?.roster_id);
        const user2Roster = data.rosters.find((roster) => roster.roster_id === user2Matchup?.roster_id);


        if (user1Matchup && user2Matchup) {
          // Find the index of the users in allUserStats array based on their user_id
          const user1WeekStats = allUserWeekStats.find((user) => user.user_id === user1Roster?.owner_id);
          const user2WeekStats = allUserWeekStats.find((user) => user.user_id === user2Roster?.owner_id);

          if (user1WeekStats && user2WeekStats) {

            // Determine the winner and update stats accordingly
            if (user1Matchup.points > user2Matchup.points) {
              user1WeekStats.wins += 1;
              user2WeekStats.losses += 1;
            } else if (user1Matchup.points < user2Matchup.points) {
              user1WeekStats.losses += 1;
              user2WeekStats.wins += 1;
            } else {
              // It's a tie
              user1WeekStats.ties += 1;
              user2WeekStats.ties += 1;
            }

            // Update pointsFor and pointsAgainst
            user1WeekStats.pointsFor += user1Matchup.points;
            user1WeekStats.pointsAgainst += user2Matchup.points;

            user2WeekStats.pointsFor += user2Matchup.points;
            user2WeekStats.pointsAgainst += user1Matchup.points;
          }

        }
      });
    });

    // Step 4: Sort the allUserStats array by wins first, pointsFor second
    allUserWeekStats.sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });

    for (let index = 0; index < allUserWeekStats.length; index++) {
      allUserWeekStats[index].rank = index + 1;
    }

    // Step 5: Return the sorted allUserStats array
    return allUserWeekStats;
  };

  // Helper function to calculate relevant week
  const getLastRegularSeasonWeek = (): number => {
    let lastRegularSeasonWeek: number;

    if (data.nflSeasonInfo.season === data.season) {
      lastRegularSeasonWeek = Math.min(data.nflSeasonInfo.week-1, data.settings.playoff_week_start-1);
    } else {
      lastRegularSeasonWeek = data.settings.playoff_week_start-1;
    }

    console.log(lastRegularSeasonWeek);
    return lastRegularSeasonWeek;
  };

  // Function to generate a hash code from a string
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Function to convert a hash code to a hexadecimal color code
  const intToRGB = (i: number) => {
    const c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
  };

  return (

    <div>
      <YearNavBar data={data} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LineChart
          width={1200} // Adjust the width as per your requirement
          height={720} // Adjust the height as per your requirement
          margin={{ top: 40, right: 30, left: 20, bottom: 10 }}
        >
          <text
            x={(1200) / 2}
            y={20}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '18px', fontWeight: 'bold' }}
          >
            {data.season} Overtime Comparison
          </text>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="week"
            label={{ value: 'Week', position: 'insideBottom', offset: 0 }}
            ticks={Array.from({ length: getLastRegularSeasonWeek() }, (_, index) => index + 1)}
          />
          <YAxis type="number" reversed={true} domain={[1, graphData.length + 1]} label={{ value: 'Rank', angle: -90, position: 'insideLeft' }} ticks={graphData.map((_, index) => index + 1)} />
          <Tooltip />
          <Legend />

          {graphData.map((userData, index) => (
            <Line
              key={index}
              type="linear"
              dataKey="rank"
              data={userData.user_week_stats}
              name={userData.team_name}
              stroke={`#${intToRGB(hashCode(userData.user_id))}`}
            />
          ))}
        </LineChart>
        
      </div>
    </div>
  );
};

export default OvertimeComparison;