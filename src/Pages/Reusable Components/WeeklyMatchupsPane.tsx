import React, { useMemo } from 'react';
import LeagueData from '../../Interfaces/LeagueData';

import { findRosterByUserId } from '../../Helper Files/HelperMethods';

interface WeeklyMatchupRow {
  week: number;
  opponentName: string;
  teamPoints: number;
  oppPoints: number;
}

export interface WeeklyMatchupsPaneProps {
  allLeagues: LeagueData[];
  userId: string;
  season: number;

  /** Optional: hide header row entirely */
  hideHeader?: boolean;
}

const safeTeamNameFromUser = (u: any) =>
  u?.metadata?.team_name || `User ${String(u?.user_id ?? '').substring(0, 4)}`;

const fmtPoints = (n: number) => {
  const s = Number(n ?? 0).toFixed(2);
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const WeeklyMatchupsPane: React.FC<WeeklyMatchupsPaneProps> = ({
  allLeagues,
  userId,
  season,
  hideHeader = false,
}) => {
  const rows = useMemo<WeeklyMatchupRow[]>(() => {
    const league = allLeagues.find((l) => Number.parseInt(l.season) === season);
    if (!league || !league.matchupInfo) return [];

    const teamRosterId = findRosterByUserId(userId, league.rosters)?.roster_id;
    if (!teamRosterId) return [];

    // roster_id -> owner_id
    const rosterIdToOwner = new Map<number, string>();
    league.rosters?.forEach((r: any) => {
      if (typeof r?.roster_id === 'number' && r?.owner_id) {
        rosterIdToOwner.set(r.roster_id, r.owner_id);
      }
    });

    // owner_id -> team name
    const ownerToTeamName = new Map<string, string>();
    league.users?.forEach((u: any) => {
      if (u?.user_id) ownerToTeamName.set(u.user_id, safeTeamNameFromUser(u));
    });

    const out: WeeklyMatchupRow[] = [];

    league.matchupInfo.forEach((weekBlock: any) => {
      const week = weekBlock.week;

      const teamMatchup = weekBlock.matchups?.find((m: any) => m.roster_id === teamRosterId);
      if (!teamMatchup) return;

      const oppMatchup = weekBlock.matchups?.find(
        (m: any) =>
          m.matchup_id === teamMatchup.matchup_id &&
          m.roster_id !== teamRosterId
      );
      if (!oppMatchup) return;

      const oppOwnerId = rosterIdToOwner.get(oppMatchup.roster_id);
      const opponentName =
        (oppOwnerId && ownerToTeamName.get(oppOwnerId)) || `Roster ${oppMatchup.roster_id}`;

      out.push({
        week,
        opponentName,
        teamPoints: teamMatchup.points ?? 0,
        oppPoints: oppMatchup.points ?? 0,
      });
    });

    return out.sort((a, b) => a.week - b.week);
  }, [allLeagues, userId, season]);

  return (
    <div className="detail-pane">

      <table className="statsTable detail-table">
        <thead>
          <tr>
            <th className="table-col-1">Week</th>
            <th className="table-col-2">Opponent</th>
            <th className="table-col-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${userId}-${season}-wk${r.week}`}>
              <td>{r.week}</td>
              <td>{r.opponentName}</td>
              <td>
                {fmtPoints(r.teamPoints)}-{fmtPoints(r.oppPoints)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="notImplementedMessage">No matchup data found for this season/team.</div>
      )}
    </div>
  );
};

export default WeeklyMatchupsPane;
