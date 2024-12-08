import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import UserAsOfWeekStats from '../../Interfaces/UserAsOfWeekStats';
import '../../Stylesheets/Year Stylesheets/OvertimeComparison.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import AllUserWeekStats from '../../Interfaces/AllUserAsOfWeekStats';

interface OvertimeComparisonProps {
  data: LeagueData;
}

const OvertimeComparison: React.FC<OvertimeComparisonProps> = ({ data }) => {
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
    // Convert input number (hash) to a hue value in the range [0, 360]
    const hue = (i * 137) % 360; // Multiply by an arbitrary prime number to spread out the hues
  
    // Introduce variance in saturation and lightness
    const saturation = 50 + (i % 50); // Randomize saturation between 50% and 100%
    const lightness = 40 + (i % 40);  // Randomize lightness between 40% and 80%
  
    // Convert HSL to RGB
    return hslToHex(hue, saturation, lightness);
  };
  
  // Helper function to convert HSL to Hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0'); // Convert to hex and pad with zeros if necessary
    };
    return `${f(0)}${f(8)}${f(4)}`.toUpperCase(); // Return the hex color
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
        {graphData.map((userData) => {
          const lineColor = `#${intToRGB(hashCode(userData.user_id))}`;
          return (
            <div
              key={userData.user_id}
              onMouseEnter={() => handleLegendHover(userData.team_name)} // Handle hover
              onMouseLeave={() => handleLegendHover(null)} // Reset hover
              onClick={() => handleTeamClick(userData.team_name)}
              style={{
                cursor: 'pointer',
                margin: '0 20px',
                fontWeight: activeTeam === userData.team_name ? 'bold' : 'normal',
                color: activeTeam === userData.team_name ? lineColor : lineColor,
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
          <Legend content={renderLegend()} /> {/* Custom legend */}

          {graphData.map((userData) => (
            <Line
              key={userData.user_id}
              type="linear"
              dataKey="rank"
              data={userData.user_week_stats}
              name={userData.team_name}
              stroke={`#${intToRGB(hashCode(userData.user_id))}`}
              strokeWidth={2}
              opacity={hoveredTeam && hoveredTeam !== userData.team_name ? 0.2 : 1} // Set opacity on hover
            />
          ))}
        </LineChart>
      </div>
    </div>
  );
};

export default OvertimeComparison;