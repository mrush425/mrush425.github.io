import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';

import SidebetMethods from '../../../Helper Files/SidebetMethods';
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

const buildGetWreckdWeeklyRows = (allLeagues: LeagueData[]): WeeklyStatRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(allLeagues);
  const rows: WeeklyStatRow[] = [];

  allLeagues.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    const stats: SidebetStat[] = SidebetMethods.GetWreckd(league, true, true);

    stats.forEach((s) => {
      const user = s.user;
      if (!user) return;

      const teamName = user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;

      const statValue = round2(s.stat_number ?? 0);
      const statDisplay = s.stats_display ?? '';

      const week = extractWeekFromDisplay(statDisplay);
      const opponentName = extractOpponentNameFromDisplay(statDisplay);
      const opponentUserId = resolveOpponentUserId(league, opponentName);

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

const GetWreckd: React.FC<RecordComponentProps & { minYears?: number; includeRegularSeason?: boolean; includePlayoffs?: boolean }> = ({ 
  data, 
  minYears = 0,
  includeRegularSeason,
  includePlayoffs,
}) => {
  const weeklyRows = useMemo(() => {
    return buildGetWreckdWeeklyRows(data).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears]);

  return (
    <WeeklyPointsStats
      rows={weeklyRows}
      metricLabel="GetWreckd Total"
      emptyMessage={`No GetWreckd data found (min years: ${minYears}).`}
      defaultSort={{ key: 'statValue', direction: 'descending' }} // bigger blowout = more wreckd
      allowDeselect={true}
      includeRegularSeason={includeRegularSeason}
      includePlayoffs={includePlayoffs}
    />
  );
};

export default GetWreckd;
