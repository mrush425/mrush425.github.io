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

  // Sort seasons in descending order (newest first)
  const sortedData = [...data].sort((a, b) => parseInt(b.season) - parseInt(a.season));

  return (
    <div>
      <HallOfFameNavBar data={data} />
      <div className="hall-of-fame-container">
        <div className="hall-of-fame-header">
          <h2 className="hall-of-fame-title">🏆 League Hall of Fame 🏆</h2>
        </div>

        <div className="hall-of-fame-grid">
          {sortedData.map((league, index) => {
            const championImage = safeImage(`./Champions/${league.season}.jpg`);
            const butlerImage = safeImage(`./Butlers/${league.season}.jpg`);

            return (
              <div key={league.season} className="season-card">
                <div className="season-year">{league.season}</div>
                
                <div className="roles-container">
                  {/* Champion */}
                  <div className="role-section champion-section">
                    <div className="role-badge">
                      <span className="badge-icon">👑</span>
                      <span className="badge-text">Champion</span>
                    </div>
                    <div className="image-wrapper">
                      {championImage ? (
                        <img
                          src={championImage}
                          alt={`${league.season} Champion`}
                          className="role-image champion-image"
                        />
                      ) : (
                        <div className="no-image-placeholder">No Image</div>
                      )}
                    </div>
                  </div>

                  {/* Butler */}
                  <div className="role-section butler-section">
                    <div className="role-badge">
                      <span className="badge-icon">🎩</span>
                      <span className="badge-text">Butler</span>
                    </div>
                    <div className="image-wrapper">
                      {butlerImage ? (
                        <img
                          src={butlerImage}
                          alt={`${league.season} Butler`}
                          className="role-image butler-image"
                        />
                      ) : (
                        <div className="no-image-placeholder">No Image</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HallOfFameHome;

