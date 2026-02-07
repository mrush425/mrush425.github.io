# AI Agent Instructions for Fantasy Football League Dashboard

## Project Overview
This is a **React/TypeScript fantasy football analytics dashboard** for a Sleeper League. It fetches live data from Sleeper API + ESPN NFL standings, combines it with local JSON data (players, sidebets, troll metadata), and renders multi-layered statistics views across League, Year, and Hall of Fame pages.

## Architecture & Data Flow

### Core Layers
1. **API Layer** (`SleeperApiMethods.ts`): Single async entry point `getLeagueData(leagueId)` that orchestrates parallel fetches from:
   - Sleeper API (league, rosters, users, state)
   - ESPN API (NFL standings)
   - Local JSON imports (trollData, sidebets, yearData)
   - Returns `LeagueData[]` (one per historical season + current)

2. **Route/Page Layer** (`Pages/App.tsx`): React Router with dynamic season-based routes and troll-based routes
   - League-wide views: `/league-stats/*` (Records, Points, Other Stats)
   - Troll profiles: `/troll/{userId}/*` (Home, Matchups)
   - Year-specific: `/season/{year}/*` (Matchups, Playoffs, Draft analysis)
   - Hall of Fame: `/hall-of-fame/*`

3. **Component Architecture**: Three patterns coexist
   - **Direct Rendering**: `LeagueHome`, `YearData`, `TrollData` take full data objects and render content directly
   - **Picker Pattern**: `RecordsStats`, `PointsStats`, `OtherStats` use dropdown/carousel to swap nested components from arrays (`STAT_COMPONENTS`, `POINT_COMPONENTS`, etc.)
   - **Shared Components**: `MatchupDisplay`, `WeeklyMatchupsPane`, `TrollMatchups` (reused in right panes)

### Key Interfaces
- **`LeagueData`**: Container with merged Sleeper + ESPN data, including `rosters`, `users`, `nflSeasonInfo`, `standings`
- **`SleeperRoster` / `SleeperUser`**: Sleeper API objects
- **Stat Component Props**: All stat components follow `RecordComponentProps | PointComponentProps | OtherComponentProps`:
  ```typescript
  { data: LeagueData[]; minYears?: number }
  ```

## Developer Workflows

### Adding a New Stat View
1. Create component in appropriate folder (e.g., `Pages/League Pages/Records Stats/MyNewStat.tsx`)
2. Accept props matching parent interface: `RecordComponentProps`, `PointComponentProps`, or `OtherComponentProps`
3. Add to corresponding array:
   - Record stats → `STAT_COMPONENTS` in `RecordsStats.tsx`
   - Point stats → `POINT_COMPONENTS` in `PointsStats.tsx`
   - Other stats → `STAT_COMPONENTS` in `OtherStats.tsx`
4. Component auto-renders via picker pattern

### Debugging Data
- League configuration locked to `Current_League_Id` in `Helper Files/Constants.ts` (switch commented line to change)
- All fetched data flows through `App.tsx` state → passed down as props
- Year filtering: Some stats exclude current year (`getCurrentYear()` checks `leagueData.season`)
- Troll names merged via `userId` lookup in `trollData.json`

### Common Patterns
- **Sorting**: Implement local state `[sortConfig, setSortConfig]`, call `useMemo` to re-sort on change
- **Mobile responsiveness**: Listen to `window.innerWidth < 768` in `useEffect`, render conditionally
- **Min years filter**: Checkbox toggles `minYears` (0 = all, 3 = 3+ years), passed to child components
- **Highlighting**: Use max/min values from `useMemo` to color-code cells (green best, red worst)

## Critical Files & Patterns

| File | Purpose |
|------|---------|
| `SleeperApiMethods.ts` | Single data orchestrator; do not split |
| `Helper Files/Constants.ts` | `Current_League_Id` configuration |
| `Helper Files/*` | Calculation functions (points, records, streaks, sidebets, etc.) |
| `Interfaces/*` | All TypeScript contracts; keep in sync |
| `Pages/League Pages/Records Stats/`, `Points Stats/`, `OtherStats/` | Pluggable stat subcomponents |
| `Pages/Troll Pages/TrollData.tsx` | Troll profile container with nested TrollHome and Matchups routes |
| `Navigation/TrollNavBar.tsx` | Navigation within troll profile pages |

## Project-Specific Conventions

- **No global state**: All data passed via props; React Router handles navigation
- **Troll metadata**: User nicknames live in `Data/trollData.json`, merged at API fetch time via `user.metadata.team_name`
- **Troll identification**: Each player uses `userId` as unique key; routes use `/troll/{userId}` pattern
- **Sidebets**: Stored in `Data/yearSidebets.json`; accessed via `SidebetMethods.tsx`
- **NFL standings**: Fetched live from ESPN (one call per season via Sleeper API year)
- **Styling**: CSS files mirror folder structure; use Bootstrap classes
- **Mobile-first mindset**: Many pages toggle between table and matchup views on small screens

## Bootstrap & Dependencies
- **React 18**, **React Router v6**, **Bootstrap 5**, **TypeScript**
- Build: React App (CRA) defaults; runs on `npm start`
- No custom build config; relies on CRA conventions
