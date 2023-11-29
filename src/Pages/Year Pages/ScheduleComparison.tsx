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
  let [matchupInfo, setMatchupInfo] = useState<MatchupInfo[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    const fetchMatchupData = async () => {
      try {
        const info = await getMatchupData(data);
        setMatchupInfo(info);
        data.matchupInfo = info;
        setDataFetched(true);
      } catch (error) {
        console.error('Error fetching league data:', error);
        setDataFetched(true); // Set dataFetched to true even in case of an error to avoid infinite loading
      }
    };

    if (data.matchupInfo === undefined) {
      fetchMatchupData();
    } else {
      setDataFetched(true);
    }
  }, [data, matchupInfo]);

  if (!dataFetched) {
    // Render a loading indicator or placeholder while data is being fetched
    return <div>Loading...</div>;
  }

  const calculateScheduleRecord = (team: SleeperUser, schedule: SleeperUser): [wins:number, losses:number, ties:number] => {
    let wins: number = 0;
    let losses: number = 0;
    let ties: number = 0;

    if (!data.matchupInfo) {
      return [0, 0, 0]; // or handle it differently based on your use case
    }

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
      
      let relevantMatchups;
      if(data.nflSeasonInfo.season===data.season){
        relevantMatchups = data.matchupInfo.filter(
          (matchup) =>
            matchup.week !== data.nflSeasonInfo.week &&
            matchup.week < data.settings.playoff_week_start && 
            matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
            matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
        );
      }
      else{
        relevantMatchups = data.matchupInfo.filter(
          (matchup) =>
            matchup.week < data.settings.playoff_week_start && 
            matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
            matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
        );
      }
    
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

    return recordString;
  }

  const findExtremeRecords = (records: string[]): number[] => {
    const parsedRecords = records.map((record) => record.split('-').map(Number));

    const maxRecord = Math.max(...parsedRecords.map(([wins]) => wins));
    const minRecord = Math.min(...parsedRecords.map(([wins]) => wins));

    return [maxRecord, minRecord];
  };

  const getCellStyle = (record: string, extremeRecords: number[]): React.CSSProperties => {
    const parsedRecord = record.split('-').map(Number);
    const [wins] = parsedRecord;

    if (wins === extremeRecords[0]) {
      // Best record, apply softer green background
      return { backgroundColor: '#9ae59a'};
    } else if (wins === extremeRecords[1]) {
      // Worst record, apply softer red background
      return { backgroundColor: '#ff9999'};
    }

    // Default styling
    return {};
  };

  const isDiagonalCell = (rowIndex: number, colIndex: number) => rowIndex === colIndex;

  const getColumnSum = (colIndex: number): { wins: number, losses: number, ties: number } => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    for (let rowIndex = 0; rowIndex < data.users.length; rowIndex++) {
      const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex]);
      const [wins, losses, ties] = record;

      winsSum += wins;
      lossesSum += losses;
      tiesSum += ties;
    }

    return { wins: winsSum, losses: lossesSum, ties: tiesSum };
  };

  const getRecordString = (record: { wins: number, losses: number, ties: number }): string => {
    return `${record.wins}-${record.losses}-${record.ties}`;
  };

  const getRecordWinPercentage = (record: { wins: number, losses: number, ties: number }): string => {
    const winPercentage: string = ((record.wins*100)/(record.wins+record.losses+record.ties)).toFixed(2) + "%";
    return winPercentage;
  };

  const getCellStyleForColumnSum = (columnSum: { wins: number, losses: number, ties: number }): React.CSSProperties => {
    const recordString = getRecordString(columnSum);
    return getCellStyle(recordString, findExtremeRecords(data.users.map((_, innerColIndex) =>
      getRecordString(getColumnSum(innerColIndex))
    )));
  };

  const getColumnAverage = (colIndex: number): { wins: number, losses: number, ties: number } => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    for (let rowIndex = 0; rowIndex < data.users.length; rowIndex++) {
      if (colIndex !== rowIndex) { // Exclude the sum column from the average calculation
        const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex]);
        const [wins, losses, ties] = record;

        winsSum += wins;
        lossesSum += losses;
        tiesSum += ties;
      }
    }

    // Calculate the average based on the number of users (excluding the sum column)
    const usersCount = data.users.length - 1;
    return {
      wins: Math.round(winsSum / usersCount),
      losses: Math.round(lossesSum / usersCount),
      ties: Math.round(tiesSum / usersCount),
    };
  };

  const getRowSum = (rowIndex: number): { wins: number, losses: number, ties: number } => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;
  
    for (let colIndex = 0; colIndex < data.users.length; colIndex++) {
      const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex]);
      const [wins, losses, ties] = record;
  
      winsSum += wins;
      lossesSum += losses;
      tiesSum += ties;
    }
  
    return { wins: winsSum, losses: lossesSum, ties: tiesSum };
  };
  
  const getRowAverage = (rowIndex: number): { wins: number, losses: number, ties: number } => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;
  
    for (let colIndex = 0; colIndex < data.users.length; colIndex++) {
      if (colIndex !== rowIndex) { // Exclude the sum row from the average calculation
        const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex]);
        const [wins, losses, ties] = record;
  
        winsSum += wins;
        lossesSum += losses;
        tiesSum += ties;
      }
    }
  
    // Calculate the average based on the number of users (excluding the sum row)
    const usersCount = data.users.length - 1;
    return {
      wins: Math.round(winsSum / usersCount),
      losses: Math.round(lossesSum / usersCount),
      ties: Math.round(tiesSum / usersCount),
    };
  };

  const getCellStyleForColumnAverage = (columnAverage: { wins: number, losses: number, ties: number }): React.CSSProperties => {
    const recordString = getRecordString(columnAverage);
    return getCellStyle(recordString, findExtremeRecords(data.users.map((_, innerColIndex) =>
      getRecordString(getColumnAverage(innerColIndex))
    )));
  };


  return (
    <div className="schedule-comparison-container">
      <YearNavBar data={data} />
      <table className="schedule-table schedule-comparison-table">
        <thead>
          <tr>
            <th></th>
            <th><b>Vs Schedule</b></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="diagonal-cell"><b>Team Name</b></td>
            {data.users.map((user, index) => (
              <td key={index + 1}>{user.metadata.team_name}</td>
            ))}
            <td className="schedule-table-blank-row"></td>
            <td><b>Vs League</b></td>
            <td><b>Vs League Win %</b></td>
            <td><b>Average Record</b></td>
          </tr>
          {data.users.map((user, rowIndex) => (
            <tr key={rowIndex}>
              <td>{user.metadata.team_name}</td>
              {data.users.map((_, colIndex) => (
                <td key={colIndex}
                  className={isDiagonalCell(rowIndex, colIndex) ? 'diagonal-cell' : ''}
                  style={getCellStyle(
                    displayRecord(data.users[rowIndex], data.users[colIndex]),
                    findExtremeRecords(data.users.map((_, innerColIndex) =>
                      displayRecord(data.users[rowIndex], data.users[innerColIndex])
                    ))
                  )}>
                  {displayRecord(
                    data.users[rowIndex], // Current team (row)
                    data.users[colIndex] // Schedule for the current column
                  )}
                </td>
              ))}
              <td className="schedule-table-blank-row"></td>
              <td>
                {getRecordString(getRowSum(rowIndex))}
              </td>
              <td>
                {getRecordWinPercentage(getRowSum(rowIndex))}
              </td>
              <td>
                {getRecordString(getRowAverage(rowIndex))}
              </td>
            </tr>
          ))}
          {/*Blank row for seperation*/}
          <tr className="schedule-table-blank-row">
            <td></td>
            {data.users.map((_, colIndex) => {
              return (
                <td key={colIndex}></td>
              );
            })}
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          {/* New row for column sums */}
          <tr>
            <td><b>Whole League</b></td>
            {data.users.map((_, colIndex) => {
              const columnSum = getColumnSum(colIndex);
              return (
                <td key={colIndex} style={getCellStyleForColumnSum(columnSum)}>
                  {getRecordString(columnSum)} ({getRecordWinPercentage(columnSum)})
                </td>
              );
            })}
          </tr>
          {/* New row for column averages */}
          <tr>
            <td><b>Average</b></td>
            {data.users.map((_, colIndex) => {
              const columnAverage = getColumnAverage(colIndex);
              return (
                <td key={colIndex} style={getCellStyleForColumnAverage(columnAverage)}>
                  {getRecordString(columnAverage)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleComparison;