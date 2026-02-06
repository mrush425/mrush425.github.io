import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import '../../Stylesheets/YearStylesheets/ScheduleComparison.css'; // Create a CSS file for styling
import SleeperUser from '../../Interfaces/SleeperUser';
import { findRosterByUserId } from '../../Helper Files/HelperMethods';
import { calculateScheduleRecord } from '../../Helper Files/RecordCalculations';


interface ScheduleComparisonProps {
  data: LeagueData;
}

const ScheduleComparison: React.FC<ScheduleComparisonProps> = ({ data }) => {

  const displayRecord = (team: SleeperUser, schedule: SleeperUser): string => {
    const [wins,losses,ties] = calculateScheduleRecord(team,schedule,data);
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
      return { backgroundColor: 'rgba(74, 222, 128, 0.2)'};
    } else if (wins === extremeRecords[1]) {
      // Worst record, apply softer red background
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)'};
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
      const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex],data);
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
        const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex],data);
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
      const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex],data);
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
        const record = calculateScheduleRecord(data.users[rowIndex], data.users[colIndex],data);
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
    <div>
      <YearNavBar data={data} />
      <div className="schedule-comparison-container">
      <div className="horizontal-scroll">
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
      </div>
    </div>
  );
};

export default ScheduleComparison;