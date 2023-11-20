// TeamDropdown.tsx
import React from 'react';
import SleeperUser from '../../Interfaces/SleeperUser';

interface TeamDropdownProps {
  users: SleeperUser[];
  onSelectTeam: (teamName: string) => void;
}

const TeamDropdown: React.FC<TeamDropdownProps> = ({ users, onSelectTeam }) => {
  const handleTeamSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTeam = event.target.value;
    onSelectTeam(selectedTeam);
  };

  return (
    <div>
      <label htmlFor="teamDropdown">Select Team:</label>
      <select id="teamDropdown" onChange={handleTeamSelect}>
        <option value="">Select a Team</option>
        {users.map((user) => (
          <option key={user.user_id} value={user.metadata.team_name}>
            {user.metadata.team_name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TeamDropdown;