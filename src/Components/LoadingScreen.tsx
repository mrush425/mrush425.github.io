import React from 'react';
import './Stylesheets/LoadingScreen.css';

interface LoadingScreenProps {
  progress: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* You can add a walrus image here */}
        <div className="loading-image">
          {/* <img src={require('./Images/walrus.png')} alt="Loading..." /> */}
          <div className="walrus-placeholder">🦭</div>
        </div>
        <h2 className="loading-title">Loading League Data...</h2>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          >
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
