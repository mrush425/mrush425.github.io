import React from 'react';
import SleeperUser from '../Interfaces/SleeperUser';
import LeagueData from '../Interfaces/LeagueData';
import './Stylesheets/MatchupDisplay.css';
import { getMatchupForWeek, getScoreForWeek, getScoreStringForWeek } from '../Helper Files/HelperMethods';
import Matchup from '../Interfaces/Matchup';
import playerData from '../Data/players.json';
import { start } from 'repl';


interface MatchupDisplayProps {
  user1?: SleeperUser | null;
  user2?: SleeperUser | null;
  data?: LeagueData | null;
  week?: number;
  secondWeek?: number;
}

const MatchupDisplay: React.FC<MatchupDisplayProps> = ({
  user1 = null,
  user2 = null,
  data = null,
  week = 1,
  secondWeek,
}) => {
  const isDefaultState = !user1 || !user2 || !data;

  const getUserScore = (user: SleeperUser | null): string => {
    let score:number = 0;
    if (!user || !data) {
      return '0'; // Default score if data or user is missing
    }
    score = getScoreForWeek(user, week, data);
    if (secondWeek) {
      score += getScoreForWeek(user, secondWeek, data);
    }
    return score.toFixed(2);
  };

  if (isDefaultState) return <div>Please Select a Matchup</div>;

  const user1matchup1: Matchup | undefined = getMatchupForWeek(user1, week, data);
  const user2matchup1: Matchup | undefined = getMatchupForWeek(user2, week, data);
  let user1matchup2: Matchup | undefined, user2matchup2: Matchup | undefined;
  if (secondWeek) {
    user1matchup2 = getMatchupForWeek(user1, secondWeek, data);
    user2matchup2 = getMatchupForWeek(user2, secondWeek, data);
  }

  // Determine the maximum number of starters between user1 and user2
  const maxStartersCount = Math.max(
    user1matchup1?.starters.length || 0,
    user2matchup1?.starters.length || 0
  );

  const renderStarter = (playerId: string | undefined): string => {
    if(!playerId) return '';
    if (playerId in playerData) {
        const player = (playerData as Record<string, any>)[playerId];
        return `${player.first_name} ${player.last_name}`;
      }
    return playerId; // For now, just return the starter or an empty string if undefined
  };

  const renderStarterImage = (starter: string | undefined): JSX.Element|null => {
    if (!starter) {
      return null; // No starter, return nothing
    }
  
    // Check if starter is a number (player ID)
    const isPlayer = !isNaN(Number(starter));
  
    if (isPlayer) {
      // If it's a player, show player image
      const imageUrl = `https://sleepercdn.com/content/nfl/players/${starter}.jpg`;
      return <img src={imageUrl} alt={starter} className="player-image" />;
    } else {
      // If it's not a number, treat it as a team ID and show the team logo
      const teamLogoUrl = `https://sleepercdn.com/images/team_logos/nfl/${starter.toLowerCase()}.png`;
      return <img src={teamLogoUrl} alt={starter} className="player-image" />;
    }
  };
  

  return (
    <table className="matchup-display-table">
      <thead>
        <tr>
          <th className="col-10" colSpan={2}>
            {user1?.metadata.team_name || 'Team 1'}
          </th>
          <th colSpan={1}>{getUserScore(user1)}</th>
          <th className="col-4" colSpan={1}>VS</th>
          <th colSpan={1}>{getUserScore(user2)}</th>
          <th className="col-28" colSpan={2}>
            {user2?.metadata.team_name || 'Team 2'}
          </th>
        </tr>
      </thead>
      <tbody>
  {/* Render for the first week */}
  {Array.from({ length: maxStartersCount }).map((_, i) => (
    <tr key={`week-1-${i}`}>
      {/* First TD for left side, image instead of number */}
      <td className="col-10">{renderStarterImage(user1matchup1?.starters[i])}</td>

      {/* User 1 starter */}
      <td className="col-28">{renderStarter(user1matchup1?.starters[i])}</td>

      {/* User 1 points */}
      <td className="col-10">{user1matchup1?.starters_points[i] || ''}</td>

      {/* Empty TD for separator */}
      <td className="col-4"></td>

      {/* User 2 points */}
      <td className="col-10">{user2matchup1?.starters_points[i] || ''}</td>

      {/* User 2 starter */}
      <td className="col-28">{renderStarter(user2matchup1?.starters[i])}</td>

      {/* Last TD for right side, image instead of number */}
      <td className="col-10">{renderStarterImage(user2matchup1?.starters[i])}</td>
    </tr>
  ))}

  {/* Row for first week total points */}
  {user1matchup1 && user2matchup1 && (
    <tr>
      <td className="col-10"></td>
      <td className="col-28"></td>
      <td className="col-10">{user1matchup1.points?.toFixed(2) || ''}</td>
      <td className="col-4"></td>
      <td className="col-10">{user2matchup1.points?.toFixed(2) || ''}</td>
      <td className="col-28"></td>
      <td className="col-10"></td>
    </tr>
  )}

  {/* If secondWeek exists, render second week matchups */}
  {secondWeek && (
    <>
      <tr>
        <td colSpan={7} className="second-week-header">Second Week Matchup</td>
      </tr>
      {Array.from({ length: maxStartersCount }).map((_, i) => (
        <tr key={`week-2-${i}`}>
          {/* First TD for left side, image instead of number */}
          <td className="col-10">{renderStarterImage(user1matchup2?.starters[i])}</td>

          {/* User 1 starter */}
          <td className="col-28">{renderStarter(user1matchup2?.starters[i])}</td>

          {/* User 1 points */}
          <td className="col-10">{user1matchup2?.starters_points[i] || ''}</td>

          {/* Empty TD for separator */}
          <td className="col-4"></td>

          {/* User 2 points */}
          <td className="col-10">{user2matchup2?.starters_points[i] || ''}</td>

          {/* User 2 starter */}
          <td className="col-28">{renderStarter(user2matchup2?.starters[i])}</td>

          {/* Last TD for right side, image instead of number */}
          <td className="col-10">{renderStarterImage(user2matchup2?.starters[i])}</td>
        </tr>
      ))}

      {/* Row for second week total points */}
      {user1matchup2 && user2matchup2 && (
        <tr>
          <td className="col-10"></td>
          <td className="col-28"></td>
          <td className="col-10">{user1matchup2.points?.toFixed(2) || ''}</td>
          <td className="col-4"></td>
          <td className="col-10">{user2matchup2.points?.toFixed(2) || ''}</td>
          <td className="col-28"></td>
          <td className="col-10"></td>
        </tr>
      )}
    </>
  )}
</tbody>




    </table>
  );
};

export default MatchupDisplay;
