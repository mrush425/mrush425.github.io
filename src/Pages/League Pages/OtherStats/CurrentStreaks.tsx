import React, { useMemo } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { getCurrentStreak, getUserLongestStreak } from '../../../Helper Files/StreakMethods';
import '../../../Stylesheets/League Stylesheets/CurrentStreaks.css';

// =========================================================================
// TYPES
// =========================================================================

interface StreakCard {
  userId: string;
  teamName: string;
  streakType: 'win' | 'loss';
  streakLength: number;
  startLabel: string;
  recordStreakLength: number; // their personal longest streak of the same type
}

// =========================================================================
// HELPERS
// =========================================================================

const buildStreakCards = (data: LeagueData[], minYears: number): StreakCard[] => {
  // Collect all unique users
  const allUserIDs = new Set<string>();
  const userDetails: Record<string, SleeperUser> = {};
  const yearsPlayed = new Map<string, number>();

  data.forEach((league) => {
    league.users.forEach((u) => {
      allUserIDs.add(u.user_id);
      userDetails[u.user_id] = u;
      yearsPlayed.set(u.user_id, (yearsPlayed.get(u.user_id) ?? 0) + 1);
    });
  });

  const cards: StreakCard[] = [];

  allUserIDs.forEach((userId) => {
    if ((yearsPlayed.get(userId) ?? 0) < minYears) return;

    const user = userDetails[userId];
    if (!user) return;

    const teamName = user.metadata?.team_name || `User ${userId.substring(0, 4)}`;
    const streak = getCurrentStreak(userId, data);

    if (!streak || streak.length === 0) return;

    const longestOfType = getUserLongestStreak(userId, streak.type, data);
    const recordLength = longestOfType.length > 0 ? longestOfType[0].length : streak.length;

    cards.push({
      userId,
      teamName,
      streakType: streak.type,
      streakLength: streak.length,
      startLabel: streak.start.label,
      recordStreakLength: recordLength,
    });
  });

  // Sort: winning streaks first (longest to shortest), then losing streaks (longest to shortest)
  cards.sort((a, b) => {
    // Win streaks are "better" — put them first
    if (a.streakType !== b.streakType) {
      return a.streakType === 'win' ? -1 : 1;
    }
    // Within same type: longer streak is better for wins, worse for losses
    if (a.streakType === 'win') {
      return b.streakLength - a.streakLength;
    }
    // For losses: shorter is better (less bad)
    return a.streakLength - b.streakLength;
  });

  return cards;
};

// =========================================================================
// COMPONENT
// =========================================================================

const CurrentStreaks: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const cards = useMemo(() => buildStreakCards(data, minYears), [data, minYears]);

  if (cards.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">
          No current streak data available (min years: {minYears}).
        </div>
      </div>
    );
  }

  return (
    <div className="current-streaks-page">
      <div className="current-streaks-grid">
        {cards.map((card) => {
          const progressPct = Math.min(
            100,
            (card.streakLength / (card.recordStreakLength || 1)) * 100
          );

          return (
            <div
              key={card.userId}
              className={`cs-card ${card.streakType}`}
            >
              {/* Team name as title */}
              <div className="cs-card-header">
                <div className="cs-card-icon">
                  {card.streakType === 'win' ? '⚡' : '💧'}
                </div>
                <h3 className="cs-card-title">{card.teamName}</h3>
              </div>

              {/* Streak display */}
              <div className="cs-streak-display">
                <div className="cs-streak-badge">
                  {card.streakType === 'win' ? 'Winning' : 'Losing'}
                </div>
                <div className="cs-streak-count">
                  <span className="cs-streak-number">{card.streakLength}</span>
                  <span className="cs-streak-text">
                    game{card.streakLength !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="cs-progress">
                <div className="cs-progress-header">
                  <span>Progress to Record</span>
                  <span className="cs-progress-record">
                    {card.recordStreakLength} games
                  </span>
                </div>
                <div className="cs-progress-bar">
                  <div
                    className="cs-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  >
                    <span className="cs-progress-pct">
                      {Math.round(progressPct)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="cs-started">Started {card.startLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CurrentStreaks;
