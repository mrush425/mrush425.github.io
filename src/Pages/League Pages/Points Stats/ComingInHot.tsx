import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';

import SidebetMethods from '../../../Pages/Year Pages/SidebetMethods';
import SidebetStat from '../../../Interfaces/SidebetStat';

import WeeklyPointsStats, { WeeklyStatRow } from './WeeklyPointsStats';

// =========================================================================
// HELPERS
// =========================================================================

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildYearsPlayedMap = (allLeagues: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  allLeagues.forEach((league) => {
    league.users.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

/**
 * ComingInHot returns MostPointsInWeek(data, 1)
 * stats_display is just the points string, so we derive week/opponent from matchupInfo.
 */
const buildComingInHotWeeklyRows = (allLeagues: LeagueData[]): WeeklyStatRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(allLeagues);
  const rows: WeeklyStatRow[] = [];

  allLeagues.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    const week = 1;

    const stats: SidebetStat[] = SidebetMethods.ComingInHot(league);

    stats.forEach((s) => {
      const user = s.user;
      if (!user) return;

      const statValue = round2(s.stat_number ?? 0);
      const statDisplay = s.stats_display ?? '';

      const teamName = user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;
      const yearsPlayed = yearsPlayedMap.get(user.user_id) ?? 0;

      // Derive opponent from matchupInfo week 1
      const rosterId = league.rosters.find((r) => r.owner_id === user.user_id)?.roster_id ?? 0;
      const matchupInfo = league.matchupInfo.find((m) => m.week === week);
      const teamMatchup = matchupInfo?.matchups.find((m) => m.roster_id === rosterId);
      const oppMatchup = matchupInfo?.matchups.find(
        (m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id
      );

      let opponentName = '';
      let opponentUserId: string | null = null;

      if (oppMatchup) {
        const oppUser = league.users.find((u) => {
          const r = league.rosters.find((rr) => rr.owner_id === u.user_id);
          return r?.roster_id === oppMatchup.roster_id;
        });

        opponentName = oppUser?.metadata?.team_name ?? '';
        opponentUserId = oppUser?.user_id ?? null;
      }

      rows.push({
        userId: user.user_id,
        teamName,
        yearsPlayed,

        year,
        week,

        opponentName,
        opponentUserId,

        statValue,
        statDisplay,

        league,
      });
    });
  });

  return rows;
};

// =========================================================================
// COMPONENT
// =========================================================================

const ComingInHot: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const weeklyRows = useMemo(() => {
    return buildComingInHotWeeklyRows(data).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears]);

  return (
    <WeeklyPointsStats
      rows={weeklyRows}
      metricLabel="Coming In Hot"
      emptyMessage={`No Coming In Hot data found (min years: ${minYears}).`}
      defaultSort={{ key: 'statValue', direction: 'descending' }} // higher points = better
      bestDirection="high"
      allowDeselect={true}
    />
  );
};

export default ComingInHot;
