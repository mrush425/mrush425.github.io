const fs = require('fs/promises');
const path = require('path');

const currentLeagueId = '1389721156168212480';
const outputDirectory = path.join(__dirname, '..', 'src', 'Data', 'Sleeper Data');
const trollDataPath = path.join(__dirname, '..', 'src', 'Data', 'trollData.json');

function getArgument(name) {
  const argumentIndex = process.argv.indexOf(name);
  return argumentIndex === -1 ? undefined : process.argv[argumentIndex + 1];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function findLeagueForSeason(targetSeason) {
  let leagueId = currentLeagueId;

  while (leagueId) {
    const league = await fetchJson(`https://api.sleeper.app/v1/league/${leagueId}`);
    if (String(league.season) === String(targetSeason)) {
      return league;
    }
    leagueId = league.previous_league_id;
  }

  throw new Error(`No league was found for season ${targetSeason}.`);
}

async function buildLeagueSnapshot(league, trollData) {
  const [state, rosters, users, standingsResponse] = await Promise.all([
    fetchJson('https://api.sleeper.app/v1/state/nfl'),
    fetchJson(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),
    fetchJson(`https://api.sleeper.app/v1/league/${league.league_id}/users`),
    fetchJson(`https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=${league.season}`),
  ]);

  for (const user of users) {
    const trollMatch = trollData.find((troll) => troll['Sleeper ID'] === user.user_id);
    if (trollMatch) {
      user.metadata = user.metadata || {};
      user.metadata.team_name = trollMatch.Nickname;
    }
  }

  const maxWeek = league.settings.playoff_week_start + 2;
  const matchupInfo = await Promise.all(
    Array.from({ length: maxWeek }, async (_, index) => ({
      week: index + 1,
      matchups: await fetchJson(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${index + 1}`),
    }))
  );

  const nflStandings = standingsResponse.children.flatMap((conference) =>
    conference.standings.entries.map((entry) => ({
      id: entry.team.id,
      name: entry.team.displayName,
      abbreviation: entry.team.abbreviation,
      wins: entry.stats.find((stat) => stat.name === 'wins')?.value || 0,
      losses: entry.stats.find((stat) => stat.name === 'losses')?.value || 0,
      ties: entry.stats.find((stat) => stat.name === 'ties')?.value || 0,
      winPercent: entry.stats.find((stat) => stat.name === 'winPercent')?.value || 0,
    }))
  );

  return {
    ...league,
    nflSeasonInfo: state,
    rosters,
    users,
    matchupInfo,
    nflStandings,
  };
}

async function updateArchiveIndex(season) {
  const indexPath = path.join(outputDirectory, 'index.ts');
  let seasons = [];

  try {
    const indexContents = await fs.readFile(indexPath, 'utf8');
    seasons = [...indexContents.matchAll(/'\.\/([0-9]{4})\/league\.json'/g)].map((match) => match[1]);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  seasons = [...new Set([...seasons, String(season)])].sort((firstSeason, secondSeason) => Number(secondSeason) - Number(firstSeason));
  const imports = seasons.map((season) => `import season${season} from './${season}/league.json';`).join('\n');
  const leagues = seasons.map((season) => `  season${season},`).join('\n');
  const indexContents = `import LeagueData from '../../Interfaces/LeagueData';\n${imports}\n\nconst archivedLeagueData = [\n${leagues}\n] as unknown as LeagueData[];\n\nexport default archivedLeagueData;\n`;
  await fs.writeFile(indexPath, indexContents);
}

async function snapshotSeason(season, trollData) {
  console.log(`Downloading Sleeper data for ${season}...`);
  const league = await findLeagueForSeason(season);
  const snapshot = await buildLeagueSnapshot(league, trollData);
  const seasonDirectory = path.join(outputDirectory, String(season));

  await fs.mkdir(seasonDirectory, { recursive: true });
  await fs.writeFile(path.join(seasonDirectory, 'league.json'), `${JSON.stringify(snapshot)}\n`);
  await updateArchiveIndex(season);
  console.log(`Saved ${path.join('src', 'Data', 'Sleeper Data', String(season), 'league.json')}`);
}

async function main() {
  const trollData = JSON.parse(await fs.readFile(trollDataPath, 'utf8'));
  const requestedSeason = getArgument('--season');

  if (requestedSeason) {
    await snapshotSeason(requestedSeason, trollData);
    return;
  }

  if (process.argv.includes('--all')) {
    let leagueId = (await fetchJson(`https://api.sleeper.app/v1/league/${currentLeagueId}`)).previous_league_id;
    while (leagueId) {
      const league = await fetchJson(`https://api.sleeper.app/v1/league/${leagueId}`);
      await snapshotSeason(league.season, trollData);
      leagueId = league.previous_league_id;
    }
    return;
  }

  throw new Error('Usage: npm run snapshot:sleeper -- --season 2025, or npm run snapshot:sleeper:all');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});