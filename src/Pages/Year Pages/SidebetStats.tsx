import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';

import '../../Stylesheets/Year Stylesheets/SidebetStats.css';
import SidebetStat from '../../Interfaces/SidebetStat';
import SidebetMethods, { Sidebet } from './SidebetMethods';

interface SidebetStatsProps {
  data: LeagueData;
}

const SidebetStats: React.FC<SidebetStatsProps> = ({ data }) => {
  const [sidebetStats, setSidebetStats] = useState<SidebetStat[]>([]); // State to store draft picks for the selected team
  const [header, setHeader] = useState<string>('Select a Sidebet');
  const [description, setDescription] = useState<string>('');
  const [activeButton, setActiveButton] = useState<string>(''); // State to track the active button
  const [isImplemented, setIsImplemented] = useState<boolean>(true);

  const handleClick = (sidebet: Sidebet) => {
    const result: SidebetStat[] | undefined = (SidebetMethods as any)[sidebet.methodName]?.(data);

    if (result !== undefined) {
      setIsImplemented(true);
      setSidebetStats(result);
    } else {
      console.log("Method name: " + sidebet.methodName);
      setSidebetStats([]);
      setIsImplemented(false);
    }
    setHeader(sidebet.displayName);
    setDescription(sidebet.description);
  };


  return (
    <div>
      <YearNavBar data={data} />

      <table>
        <tbody>
          <tr>
            <td className="statMenu" key={"column1"}>
              <div className="statMenuDiv">
                <table>
                  <thead>
                    <tr>
                      <th>Stats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SidebetMethods.Sidebets().map((sidebet: Sidebet) => (
                      <tr key={sidebet.methodName}>
                        <td>
                          <button
                            className={`statButton ${activeButton === sidebet.methodName ? 'active' : ''}`}
                            onClick={() => handleClick(sidebet)}
                          >
                            {sidebet.displayName}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
            <td className="statsColumn" key={"column2"} width={"100%"}>
              <h2>{header + " " + data.season}</h2>
              <div>{description}</div>
              {!isImplemented ? (
                <div className="notImplementedMessage">
                  Stat not implemented
                </div>
              ) : (
                <div>
                  {/* Display table of draft picks for the selected team */}
                  <table className="statsTable">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Stat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(sidebetStats) &&
                        sidebetStats.map((sidebetStat, index) => {
                          return (
                            <tr key={sidebetStat.user?.user_id}>
                              <td>{sidebetStat.user?.metadata.team_name}</td>
                              <td>{sidebetStat.stats_display}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SidebetStats;
