import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import '../../Stylesheets/Year Stylesheets/ScheduleComparison.css'; // Create a CSS file for styling
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findRosterByUserId } from '../../HelperMethods';


interface ScheduleComparisonProps {
  data: LeagueData;
}


const ScheduleComparison: React.FC<ScheduleComparisonProps> = ({ data }) => {
  const [matchupInfo, setMatchupInfo] = useState<MatchupInfo[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  
  
    useEffect(() => {
      // Fetch league data when the component mounts
      const fetchMatchupData = async () => {
        try {
          const info = await getMatchupData(data);
          setMatchupInfo(info);
          data.matchupInfo=info;
          setDataFetched(true);
        } catch (error) {
          console.error('Error fetching league data:', error);
        }
      };
      if(data.matchupInfo===undefined){
      fetchMatchupData();
      }
      else{
        setDataFetched(true);
      }
    }, []); // Run this effect only once on mount

  if (!dataFetched) {
    // Render a loading indicator or placeholder while data is being fetched
    return <div>Loading...</div>;
  }

  const calculateScheduleRecord = (team: SleeperUser, schedule: SleeperUser): [wins:number, losses:number, ties:number] => {
    let wins: number = 0;
    let losses: number = 0;
    let ties: number = 0;

    if(team.user_id===schedule.user_id){
      const roster = findRosterByUserId(team.user_id,data.rosters);
      if(roster){
        wins=roster.settings.wins;
        losses = roster.settings.losses;
        ties = roster.settings.ties;
      }
    }

    else {
      // Find the matchupInfo for the current team and schedule
      let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;
      let scheduleRosterId = findRosterByUserId(schedule.user_id, data.rosters)?.roster_id;
    
      const relevantMatchups = matchupInfo.filter(
        (matchup) =>
          matchup.week !== data.nflSeasonInfo.week && // Exclude matchups for the current week
          matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
          matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
      );
    
      relevantMatchups.forEach((matchup) => {
        const teamMatchup = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        const scheduleMatchup = matchup.matchups.find((m) => m.roster_id === scheduleRosterId);
        const oppMatchup = matchup.matchups.find((m) => m.matchup_id === scheduleMatchup?.matchup_id && m.roster_id!== scheduleMatchup?.roster_id); 
    
        if (teamMatchup && scheduleMatchup) {
          if (scheduleMatchup.matchup_id === teamMatchup.matchup_id) {
            // If schedule's opponent is the same as teamMatchup, compare directly to schedule
            wins += teamMatchup.points > scheduleMatchup.points ? 1 : 0;
            losses += teamMatchup.points < scheduleMatchup.points ? 1 : 0;
            ties += teamMatchup.points === scheduleMatchup.points ? 1 : 0;
          } else {
            // Otherwise, compare teamMatchup to schedule's opponent
            if(oppMatchup){
              wins += teamMatchup.points > oppMatchup.points ? 1 : 0;
              losses += teamMatchup.points < oppMatchup.points ? 1 : 0;
              ties += teamMatchup.points === oppMatchup.points ? 1 : 0;
            }
          }
        }
      });
    }
    
    return [wins, losses, ties];
    
  }

  const displayRecord = (team: SleeperUser, schedule: SleeperUser): string => {
    const [wins,losses,ties] = calculateScheduleRecord(team,schedule);
    let recordString: string="";
    
    if(ties===0){
      recordString = wins + "-" + losses;
    }
    else{
      recordString = wins + "-" + losses + "-" + ties;
    }

    if(schedule.metadata.team_name==="TyReeking Havoc"){
      console.log("Team Name: " + team.metadata.team_name + " Schedule: " + schedule.metadata.team_name + " " + recordString);
    }

    return recordString;
  }

  return (
    <div>
      <YearNavBar data={data} />
      <table>
        <thead>
            <th></th>
            <th><b>Vs Schedule</b></th>
        </thead>
        <tbody>
          <tr>
            <td><b>Team Name</b></td>
            {data.users.map((user, index) => (
              <td key={index+1}>{user.metadata.team_name}</td>
            ))}
          </tr>
          {data.users.map((user, rowIndex) => (
            <tr key={rowIndex}>
              <td>{user.metadata.team_name}</td>
              {data.users.map((_, colIndex) => (
                <td key={colIndex}>
                  {displayRecord(
                    data.users[rowIndex],  // Current team (row)
                    data.users[colIndex]   // Schedule for the current column
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleComparison;