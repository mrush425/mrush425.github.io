import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import TeamDropdown from './TeamDropdown';
import '../../Stylesheets/Year Stylesheets/ScheduleViewer.css';
import { findRosterByUserId, findUserByRosterId, getAveragePointsMap, getScoreForWeek } from '../../Helper Files/HelperMethods';
import Matchup from '../../Interfaces/Matchup';

interface ScheduleViewerProps {
  data: LeagueData;
}

interface ScheduleData {
  name: string;
  points: (string | number)[];
  opponents: string[];
  opponentPoints: (string | number)[];
}

const ScheduleViewer: React.FC<ScheduleViewerProps> = ({ data }) => {
  const users = data.users;
  const [selectedTeam1, setSelectedTeam1] = useState<string>('');
  const [selectedTeam2, setSelectedTeam2] = useState<string>('');
  const [schedule1, setSchedule1] = useState<ScheduleData>({ name: '', points: [], opponents: [], opponentPoints: [] });
  const [schedule2, setSchedule2] = useState<ScheduleData>({ name: '', points: [], opponents: [], opponentPoints: [] });
  const averagePointsMap = getAveragePointsMap(data);

  const handleTeam1Select = (teamName: string) => {
    const user_id = getUserIdFromTeamName(teamName);
    if (user_id) {
      setSelectedTeam1(user_id);
    }
  };

  const handleTeam2Select = (teamName: string) => {
    const user_id = getUserIdFromTeamName(teamName);
    if (user_id) {
      setSelectedTeam2(user_id);
    }
  };

  const getUserIdFromTeamName = (teamName: string): string | undefined => {
    const user = users.find((u) => u.metadata.team_name === teamName);
    return user?.user_id;
  };

  useEffect(() => {
    if (selectedTeam1) {
      setSchedule1(generateSchedule(selectedTeam1));
    }
  }, [selectedTeam1]);

  useEffect(() => {
    if (selectedTeam2) {
      setSchedule2(generateSchedule(selectedTeam2));
    }
  }, [selectedTeam2]);

  const generateSchedule = (userId: string): ScheduleData => {
    const schedule: ScheduleData = { name: '', points: [], opponents: [], opponentPoints: [] };
    const user = users.find((u) => u.user_id === userId);
    const roster_id=findRosterByUserId(userId,data.rosters)?.roster_id;

  
    if (!user||!roster_id) return schedule;
  
    schedule.name = user.metadata.team_name;
  
    for (let week = 1; week <= data.settings.playoff_week_start - 1; week++) {
      // Ensure points are parsed as a number and convert to a string with 2 decimal places
      const user = users.find((u) => u.user_id === userId);
      if (!user) continue;

      const points = Number(getScoreForWeek(user, week, data)) || parseFloat(averagePointsMap.get(userId)?.toFixed(2) || "0");
      const matchup = data.matchupInfo.find((m) => m.week === week);      
      const playerMatchup = matchup?.matchups.find(
        (m: Matchup) => m.roster_id === roster_id
      );

      const opponentMatchup = matchup?.matchups.find(
        (m: Matchup) => m.roster_id !== roster_id && m.matchup_id===playerMatchup?.matchup_id
      );      
      if(!opponentMatchup) continue;
      // Check if opponentMatchup exists before accessing its properties
      const opponentUser = findUserByRosterId(opponentMatchup?.roster_id,data);
      if(!opponentUser) continue;
      
      const opponentName = opponentMatchup ? findUserNameByRosterId(opponentMatchup.roster_id) : "Bye";
      const opponentPoints = Number(getScoreForWeek(opponentUser, week, data)) || parseFloat(averagePointsMap.get(opponentUser.user_id)?.toFixed(2) || "0");
  
      // Push the points as a number, and opponent points as a string
      schedule.points.push(points); // points as a number
      schedule.opponents.push(opponentName);
      schedule.opponentPoints.push(opponentPoints); // opponent points as a string
    }
  
    return schedule;
  };
  
  

  const findUserNameByRosterId = (rosterId: number): string => {
    const user = users.find((u) => findRosterByUserId(u.user_id, data.rosters)?.roster_id === rosterId);
    return user ? user.metadata.team_name : '';
  };

  return (
    <div>
      <YearNavBar data={data} />
      
      {/* First Team Picker */}
      <div className="team-selection">
        <TeamDropdown users={users} onSelectTeam={handleTeam1Select} />
      </div>
  
      {/* First Schedule Table */}
      <div className="schedule-table-container">
        <ScheduleTable scheduleData={schedule1} data={data}/>
      </div>
  
      {/* Second Team Picker */}
      <div className="team-selection">
        <TeamDropdown users={users} onSelectTeam={handleTeam2Select} />
      </div>
  
      {/* Second Schedule Table */}
      <div className="schedule-table-container">
        <ScheduleTable scheduleData={schedule2} data={data}/>
      </div>
    </div>
  );  
};

interface ScheduleTableProps {
  scheduleData: ScheduleData;
  data: LeagueData;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ scheduleData, data }) => {
    const currentWeek = data.nflSeasonInfo.week-1;  // Get the current week
  
    return (
      <div className="schedule-table">
        <table>
          <thead>
            <tr>
              <th></th>
              {scheduleData.points?.map((_, weekIndex: number) => (
                <th key={weekIndex}>Week {weekIndex + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{scheduleData.name}</td>
              {scheduleData.points?.map((point, weekIndex: number) => (
                <td
                  key={weekIndex}
                  className={weekIndex + 1 > currentWeek ? 'italic' : ''}  // Apply italic if week is after current week
                >
                  {point}
                </td>
              ))}
            </tr>
            <tr>
              <td>Opponent</td>
              {scheduleData.opponents?.map((opponent, weekIndex: number) => (
                <td
                  key={weekIndex}
                  className={weekIndex + 1 > currentWeek ? 'italic' : ''}  // Apply italic if week is after current week
                >
                  {opponent}
                </td>
              ))}
            </tr>
            <tr>
              <td>Opponent Points</td>
              {scheduleData.opponentPoints?.map((opponentPoint, weekIndex: number) => (
                <td
                  key={weekIndex}
                  className={weekIndex + 1 > currentWeek ? 'italic' : ''}  // Apply italic if week is after current week
                >
                  {opponentPoint}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };
  

export default ScheduleViewer;
