import LeagueData from '../../Interfaces/LeagueData';
import season2025 from './2025/league.json';
import season2024 from './2024/league.json';
import season2023 from './2023/league.json';
import season2022 from './2022/league.json';
import season2021 from './2021/league.json';
import season2020 from './2020/league.json';
import season2019 from './2019/league.json';

const archivedLeagueData = [
  season2025,
  season2024,
  season2023,
  season2022,
  season2021,
  season2020,
  season2019,
] as unknown as LeagueData[];

export default archivedLeagueData;
