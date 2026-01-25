import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import UserAsOfWeekStats from '../../Interfaces/UserAsOfWeekStats';
import '../../Stylesheets/YearStylesheets/OvertimeComparison.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import AllUserWeekStats from '../../Interfaces/AllUserAsOfWeekStats';

interface OvertimeComparisonProps {
  data: LeagueData;
}

const OvertimeComparison: React.FC<OvertimeComparisonProps> = ({ data }) => {
  // Color scheme for 12 teams - vibrant and distinct colors
  const teamColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Sky Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B88B', // Peach
    '#52C41A', // Green
    '#FF85C0', // Pink
    '#FF7A45', // Orange
  ];

  // Get color for a team by index
  const getTeamColor = (userId: string, teamIndex: number): string => {
    return teamColors[teamIndex % teamColors.length];
  };
  const [graphData, setGraphData] = useState<AllUserWeekStats[]>([]);
  const [activeTeam, setActiveTeam] = useState<string | null>(null); // State for active team
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null); // State for hovered team

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

    if (data.nflSeasonInfo.season === data.season && data.nflSeasonInfo.season_type!=="post") {
      relevantWeek = Math.min(data.nflSeasonInfo.week, data.settings.playoff_week_start);
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

  const calculateStatsAsOfWeek = (asOfWeek: number): UserAsOfWeekStats[] => {
    let allUserWeekStats: UserAsOfWeekStats[] = [];

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

    //console.log(lastRegularSeasonWeek);
    return lastRegularSeasonWeek;
  };



  const handleTeamClick = (teamName: string) => {
    setActiveTeam(activeTeam === teamName ? null : teamName); // Toggle active team
  };

  const handleLegendHover = (teamName: string | null) => {
    setHoveredTeam(teamName); // Set hovered team
  };
  

  const renderLegend = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '10px' }}>
        {graphData.map((userData, index) => {
          const lineColor = getTeamColor(userData.user_id, index);
          return (
            <div
              key={userData.user_id}
              onMouseEnter={() => handleLegendHover(userData.team_name)}
              onMouseLeave={() => handleLegendHover(null)}
              onClick={() => handleTeamClick(userData.team_name)}
              style={{
                cursor: 'pointer',
                margin: '0 20px',
                fontWeight: activeTeam === userData.team_name ? 'bold' : 'normal',
                color: lineColor,
              }}
            >
              {userData.team_name}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <YearNavBar data={data} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LineChart
          width={1200}
          height={720}
          margin={{ top: 40, right: 30, left: 20, bottom: 10 }}
        >
          <text
            x={1200 / 2}
            y={20}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '18px', fontWeight: 'bold', fill: '#ffffff' }}
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
          <Legend content={renderLegend()} /> {/* Custom legend */}

          {graphData.map((userData, index) => (
            <Line
              key={userData.user_id}
              type="linear"
              dataKey="rank"
              data={userData.user_week_stats}
              name={userData.team_name}
              stroke={getTeamColor(userData.user_id, index)}
              strokeWidth={2}
              opacity={hoveredTeam && hoveredTeam !== userData.team_name ? 0.2 : 1}
            />
          ))}
        </LineChart>
      </div>
    </div>
  );
};

export default OvertimeComparison;