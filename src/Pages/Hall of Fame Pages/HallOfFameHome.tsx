import React from 'react';
import '../../Stylesheets/Hall of Fame Stylesheets/HallOfFameHome.css';
import LeagueData from '../../Interfaces/LeagueData';
import HallOfFameNavBar from '../../Navigation/HallOfFameNavBar';
import HallOfFameProps from './HallOfFameProps';

const HallOfFameHome: React.FC<HallOfFameProps> = ({ data }) => {
  const safeImage = (path: string) => {
    try {
      return require(`${path}`);
    } catch {
      return null;
    }
  };

  return (
    <div>
      <HallOfFameNavBar data={data} />
      <h2>Welcome to the Hall of Fame</h2>
      <table className="hall-of-fame-table">
        <thead>
          <tr>
            <th className="header-column"></th>
            {data.map((league) => (
              <th key={league.season} className="header-column">
                {league.season}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="year-column">Champion</td>
            {data.map((league) => {
              const championImage = safeImage(`./Champions/${league.season}.jpg`);
              return (
                <td key={league.season}>
                  {championImage ? (
                    <img
                      src={championImage}
                      alt={`${league.season} Champion`}
                      className="champion-image"
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="year-column">Butler</td>
            {data.map((league) => {
              const butlerImage = safeImage(`./Butlers/${league.season}.jpg`);
              return (
                <td key={league.season}>
                  {butlerImage ? (
                    <img
                      src={butlerImage}
                      alt={`${league.season} Butler`}
                      className="butler-image"
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default HallOfFameHome;
