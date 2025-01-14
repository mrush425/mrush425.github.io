import React from 'react';
import SleeperUser from '../Interfaces/SleeperUser';
import LeagueData from '../Interfaces/LeagueData';
import './Stylesheets/MatchupDisplay.css';
import { getMatchupForWeek, getScoreForWeek } from '../Helper Files/HelperMethods';
import Matchup from '../Interfaces/Matchup';
import playerData from '../Data/players.json';

interface MatchupDisplayProps {
  user1?: SleeperUser | null;
  user2?: SleeperUser | null;
  data?: LeagueData | null;
  week?: number;
  secondWeek?: number;
  title?: string | null;
}

const MatchupDisplay: React.FC<MatchupDisplayProps> = ({
  user1 = null,
  user2 = null,
  data = null,
  week = 1,
  secondWeek,
  title = null,
}) => {
  const isDefaultState = !user1 || !user2 || !data;

  /**
   * Calculates the user's score for the specified week.
   */
  const getUserScore = (user: SleeperUser | null, week: number): number => {
    if (!user || !data) return 0; // Default score if data or user is missing
    return getScoreForWeek(user, week, data);
  };

  if (isDefaultState) return <div>Please Select a Matchup</div>;

  /**
   * Renders the player's name or fallback if unavailable.
   */
  const renderStarter = (playerId: string | undefined): string => {
    if (!playerId) return '';
    if (playerId in playerData) {
      const player = (playerData as Record<string, any>)[playerId];
      return `${player.first_name} ${player.last_name}`;
    }
    return playerId;
  };

  /**
   * Renders the player's image or fallback if unavailable.
   */
  const renderStarterImage = (starter: string | undefined): JSX.Element | null => {
    if (!starter) return null;

    const isPlayer = !isNaN(Number(starter));
    const imageUrl = isPlayer
      ? `https://sleepercdn.com/content/nfl/players/${starter}.jpg`
      : `https://sleepercdn.com/images/team_logos/nfl/${starter.toLowerCase()}.png`;

    const fallbackImageUrl = isPlayer
      ? 'https://sleepercdn.com/images/fallback_player_image.png'
      : 'https://sleepercdn.com/images/fallback_team_logo.png';

    return (
      <img
        src={imageUrl}
        onError={(e) => ((e.target as HTMLImageElement).src = fallbackImageUrl)}
        alt={starter}
        className="player-image"
      />
    );
  };

  /**
   * Renders team information including avatar and score.
   */
  const renderTeamInfo = (
    user: SleeperUser | null,
    defaultTeamName: string,
    isLeftSide: boolean
  ): JSX.Element | null => {
    if (!user) return null;

    const avatarUrl = user.avatar
      ? `https://sleepercdn.com/avatars/${user.avatar}`
      : user.metadata.avatar
      ? user.metadata.avatar
      : require('./Images/Default Team.png'); // Fallback to local image if no avatar

    const score = secondWeek
      ? getUserScore(user, week) + getUserScore(user, secondWeek)
      : getUserScore(user, week);

    return isLeftSide ? (
      <>
        <th className="col-10">
          <img src={avatarUrl} alt={`${user.metadata.team_name || defaultTeamName} avatar`} className="team-avatar" />
        </th>
        <th className="col-28">{user.metadata.team_name || defaultTeamName}</th>
        <th className="col-10">{score.toFixed(2)}</th>
      </>
    ) : (
      <>
        <th className="col-10">{score.toFixed(2)}</th>
        <th className="col-28">{user.metadata.team_name || defaultTeamName}</th>
        <th className="col-10">
          <img src={avatarUrl} alt={`${user.metadata.team_name || defaultTeamName} avatar`} className="team-avatar" />
        </th>
      </>
    );
  };

  /**
   * Renders individual rows for the matchup.
   */
  const renderMatchupRows = (
    matchup1: Matchup | undefined,
    matchup2: Matchup | undefined,
    maxStartersCount: number
  ): JSX.Element[] =>
    Array.from({ length: maxStartersCount }).flatMap((_, i) => [
      <tr key={`empty-row-${i}`} className="empty-row">
        <td colSpan={7}></td>
      </tr>,
      <tr key={`row-${i}`} className="data-row">
        <td className="col-10">{renderStarterImage(matchup1?.starters[i])}</td>
        <td className="col-28">{renderStarter(matchup1?.starters[i])}</td>
        <td className="col-10">{matchup1?.starters_points[i]?.toFixed(2) || ''}</td>
        <td className="col-4">{data?.roster_positions[i] || ''}</td>
        <td className="col-10">{matchup2?.starters_points[i]?.toFixed(2) || ''}</td>
        <td className="col-28">{renderStarter(matchup2?.starters[i])}</td>
        <td className="col-10">{renderStarterImage(matchup2?.starters[i])}</td>
      </tr>,
    ]);

  /**
   * Renders the total points row.
   */
  const renderTotalPointsRow = (matchup1: Matchup | undefined, matchup2: Matchup | undefined): JSX.Element => (
    <tr className="total-points-row">
      <td className="col-10"></td>
      <td className="col-28"></td>
      <td className="col-10 total-points-col">{matchup1?.points?.toFixed(2) || ''}</td>
      <td className="col-4"></td>
      <td className="col-10 total-points-col">{matchup2?.points?.toFixed(2) || ''}</td>
      <td className="col-28"></td>
      <td className="col-10"></td>
    </tr>
  );

  // Data preparation
  const user1matchup1 = getMatchupForWeek(user1, week, data);
  const user2matchup1 = getMatchupForWeek(user2, week, data);
  const user1matchup2 = secondWeek ? getMatchupForWeek(user1, secondWeek, data) : undefined;
  const user2matchup2 = secondWeek ? getMatchupForWeek(user2, secondWeek, data) : undefined;
  const maxStartersCount = Math.max(user1matchup1?.starters.length || 0, user2matchup1?.starters.length || 0);

  return (
    <div>
      {title && <h3>{title}</h3>}
      <table className="matchup-display-table">
        <thead className="matchup-header">
          <tr className="header-row">
            {renderTeamInfo(user1, 'Team 1', true)}
            <th className="col-4" colSpan={1}>
              VS
            </th>
            {renderTeamInfo(user2, 'Team 2', false)}
          </tr>
          <tr className="empty-row">
            <td colSpan={7}></td>
          </tr>
        </thead>
        <tbody>
          {renderMatchupRows(user1matchup1, user2matchup1, maxStartersCount)}

          {secondWeek && renderTotalPointsRow(user1matchup1, user2matchup1)}

          {secondWeek && (
            <>
            <tr className="empty-row">
                <td colSpan={7}></td>
            </tr>
            <tr className="empty-row">
                <td colSpan={7}></td>
            </tr>
            <tr className="second-week-header">
                <td colSpan={7}>Second Week Matchup</td>
            </tr>
                {renderMatchupRows(user1matchup2, user2matchup2, maxStartersCount)}
                {renderTotalPointsRow(user1matchup2, user2matchup2)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MatchupDisplay;
