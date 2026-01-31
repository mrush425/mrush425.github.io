import React, { useMemo } from 'react';
import { PointComponentProps } from '../PointsStats';
import LeagueData from '../../../Interfaces/LeagueData';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface YearWeeklyAverages {
  year: number;
  yearAverage: number;
  weekAverages: (number | null)[]; // null for weeks without data
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

const calculateWeeklyAverages = (data: LeagueData[]): YearWeeklyAverages[] => {
  const results: YearWeeklyAverages[] = [];

  // Sort data by year (descending - most recent first)
  const sortedData = [...data].sort((a, b) => parseInt(b.season) - parseInt(a.season));

  // Determine max weeks across all years for consistent table width
  let globalMaxWeek = 14;
  sortedData.forEach((league) => {
    const playoffStart = league.settings.playoff_week_start;
    const lastRegularWeek = playoffStart - 1;
    if (lastRegularWeek > globalMaxWeek) {
      globalMaxWeek = lastRegularWeek;
    }
  });

  sortedData.forEach((league) => {
    const year = parseInt(league.season);
    const weekAverages: (number | null)[] = [];
    let totalPoints = 0;
    let totalGamesPlayed = 0;
    const playoffWeekStart = league.settings.playoff_week_start;

    // Calculate average for each week
    for (let week = 1; week <= globalMaxWeek; week++) {
      // Check if this week is playoff week for this year
      if (week >= playoffWeekStart) {
        weekAverages.push(null);
        continue;
      }

      const weekMatchup = league.matchupInfo.find((mi) => mi.week === week);

      if (weekMatchup && weekMatchup.matchups && weekMatchup.matchups.length > 0) {
        const weekPoints = weekMatchup.matchups.reduce(
          (sum, matchup) => sum + (matchup.points || 0),
          0
        );
        const weekGames = weekMatchup.matchups.length;
        const weekAverage = weekGames > 0 ? weekPoints / weekGames : 0;

        weekAverages.push(parseFloat(weekAverage.toFixed(2)));
        totalPoints += weekPoints;
        totalGamesPlayed += weekGames;
      } else {
        weekAverages.push(null);
      }
    }

    // Calculate year average
    const yearAverage = totalGamesPlayed > 0 ? totalPoints / totalGamesPlayed : 0;

    results.push({
      year,
      yearAverage: parseFloat(yearAverage.toFixed(2)),
      weekAverages,
    });
  });

  // Calculate overall average across all years
  const overallWeekAverages: (number | null)[] = [];
  let overallTotalPoints = 0;
  let overallTotalGames = 0;

  for (let week = 1; week <= globalMaxWeek; week++) {
    let weekSum = 0;
    let weekCount = 0;

    results.forEach((yearData) => {
      const weekValue = yearData.weekAverages[week - 1];
      if (weekValue !== null) {
        weekSum += weekValue;
        weekCount++;
      }
    });

    if (weekCount > 0) {
      const weekAvg = parseFloat((weekSum / weekCount).toFixed(2));
      overallWeekAverages.push(weekAvg);
      overallTotalPoints += weekSum;
      overallTotalGames += weekCount;
    } else {
      overallWeekAverages.push(null);
    }
  }

  const overallYearAverage = overallTotalGames > 0 
    ? parseFloat((overallTotalPoints / overallTotalGames).toFixed(2))
    : 0;

  // Add the overall average as the first row
  results.unshift({
    year: 0, // Use 0 to indicate this is the average row
    yearAverage: overallYearAverage,
    weekAverages: overallWeekAverages,
  });

  return results;
};

// =========================================================================
// COMPONENT
// =========================================================================

const WeeklyScoreAverages: React.FC<PointComponentProps> = ({ data }) => {
  const yearlyData = useMemo(() => calculateWeeklyAverages(data), [data]);

  // Determine the maximum number of weeks to display
  const maxWeeks = useMemo(() => {
    return Math.max(...yearlyData.map((yd) => yd.weekAverages.length), 14);
  }, [yearlyData]);

  return (
    <div className="unified-stats-container">
      <div className="stat-content">
        <div className="table-wrapper" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="table-scroll-container">
            <table className="stats-table">
            <thead>
              <tr>
                <th className="sticky-col">Year</th>
                <th className="sticky-col-2">Ave</th>
                {Array.from({ length: maxWeeks }, (_, i) => (
                  <th key={i + 1}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((yearData) => (
                <tr key={yearData.year} className={yearData.year === 0 ? 'average-row' : ''}>
                  <td className="sticky-col team-name-cell">
                    {yearData.year === 0 ? 'Average' : yearData.year}
                  </td>
                  <td className="sticky-col-2 highlight-cell">
                    {yearData.yearAverage.toFixed(2)}
                  </td>
                  {Array.from({ length: maxWeeks }, (_, i) => {
                    const weekValue = yearData.weekAverages[i];
                    return (
                      <td key={i} className={weekValue === null ? 'no-data-cell' : ''}>
                        {weekValue !== null ? weekValue.toFixed(2) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyScoreAverages;
