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

const extractWeekFromDisplay = (display?: string): number => {
  if (!display) return 0;
  const match = display.match(/during week\s+(\d+)/i);
  if (!match) return 0;
  const w = Number.parseInt(match[1], 10);
  return Number.isFinite(w) ? w : 0;
};

const extractOpponentNameFromDisplay = (display?: string): string => {
  if (!display) return '';
  const match = display.match(/against\s+(.+?):/i);
  return match?.[1]?.trim() ?? '';
};

const resolveOpponentUserId = (league: LeagueData, opponentName: string): string | null => {
  if (!opponentName) return null;
  const found = league.users.find(
    (u) => (u.metadata?.team_name ?? '').trim() === opponentName.trim()
  );
  return found?.user_id ?? null;
};

/**
 * BossWhenItCounts returns either:
 * - [new SidebetStat()] early-season placeholder, OR
 * - stats from MostPointsInWeek(playoff_week_start + 2)
 *
 * We build weekly rows across years and drop placeholder/invalid entries.
 */
const buildBossWhenItCountsWeeklyRows = (allLeagues: LeagueData[]): WeeklyStatRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(allLeagues);
  const rows: WeeklyStatRow[] = [];

  allLeagues.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    const stats: SidebetStat[] = SidebetMethods.BossWhenItCounts(league);

    stats.forEach((s) => {
      const user = s.user;
      if (!user) return; // filters placeholder entries like new SidebetStat()

      const statValue = round2(s.stat_number ?? 0);
      const statDisplay = s.stats_display ?? '';

      // If we somehow got a non-real placeholder with no value, ignore it
      if (!statDisplay && statValue === 0) return;

      const teamName = user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;

      // MostPointsInWeek display is just the points number, so week/opponent won’t be in stats_display.
      // BossWhenItCounts always uses week = playoff_week_start + 2.
      const week = (league.settings?.playoff_week_start ?? 0) + 2;

      // Try to derive opponent for that week by finding the matchup (best-effort)
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

      // Fallback parsing (in case you later change stats_display to include opponent/week)
      if (!opponentName) {
        opponentName = extractOpponentNameFromDisplay(statDisplay);
        opponentUserId = resolveOpponentUserId(league, opponentName);
      }

      rows.push({
        userId: user.user_id,
        teamName,
        yearsPlayed: yearsPlayedMap.get(user.user_id) ?? 0,

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

const BossWhenItCounts: React.FC<RecordComponentProps & { minYears?: number }> = ({
  data,
  minYears = 0,
}) => {
  const weeklyRows = useMemo(() => {
    return buildBossWhenItCountsWeeklyRows(data).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears]);

  return (
    <WeeklyPointsStats
      rows={weeklyRows}
      metricLabel="Boss When It Counts"
      emptyMessage={`No Boss When It Counts data found (min years: ${minYears}).`}
      defaultSort={{ key: 'statValue', direction: 'descending' }} // higher points = better
      allowDeselect={true}
    />
  );
};

export default BossWhenItCounts;
