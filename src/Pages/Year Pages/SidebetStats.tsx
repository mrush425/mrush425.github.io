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
  const [sidebetStats, setSidebetStats] = useState<SidebetStat[]>([]);
  const [header, setHeader] = useState<string>('Select a Sidebet');
  const [description, setDescription] = useState<string>('');
  const [activeButtonIndex, setActiveButtonIndex] = useState<number>(-1);
  const [isImplemented, setIsImplemented] = useState<boolean>(true);

  const handleButtonClick = (sidebet: Sidebet, index: number) => {
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
    setActiveButtonIndex(index);
  };

  const handleArrowKey = (direction: 'left' | 'right') => {
    setActiveButtonIndex((prevIndex) => {
      const newIndex =
        direction === 'right'
          ? (prevIndex + 1) % SidebetMethods.Sidebets().length
          : (prevIndex - 1 + SidebetMethods.Sidebets().length) % SidebetMethods.Sidebets().length;

      const selectedSidebet = SidebetMethods.Sidebets()[newIndex];
      handleButtonClick(selectedSidebet, newIndex);

      return newIndex;
    });
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleArrowKey('right');
      } else if (event.key === 'ArrowLeft') {
        handleArrowKey('left');
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div>
      <YearNavBar data={data} />

      <table className='fullTable'>
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
                    {SidebetMethods.Sidebets().map((sidebet: Sidebet, index: number) => (
                      <tr key={sidebet.methodName}>
                        <td>
                          <button
                            className={`statButton ${activeButtonIndex === index ? 'active' : ''}`}
                            onClick={() => handleButtonClick(sidebet, index)}
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

              <div style={{width:"100%"}}>
              <table className="statsHeaderTable">
                <tbody>
                  <tr>
                    <td className='arrowButtonCell'><button className='arrowButton' onClick={() => handleArrowKey('left')}>&#x2b05;</button></td>
                    <td className='headerCell'><h2>{header + " " + data.season}</h2></td>
                    <td className='arrowButtonCell'><button className='arrowButton' onClick={() => handleArrowKey('right')}>&#x27a1;</button></td>
                  </tr>
                </tbody>
              </table>
              </div>

              <div>{description}</div>
              {!isImplemented ? (
                <div className="notImplementedMessage">
                  Stat not implemented
                </div>
              ) : (
                <div>
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
