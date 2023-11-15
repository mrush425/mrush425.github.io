// About.tsx
import React, {useState, useEffect} from 'react';

const About: React.FC = () => {
    const [data, setData] = useState<Array<any> | null>(null);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch('https://api.sleeper.app/v1/league/996974024729169920/users');
          const jsonData = await response.json();
          setData(jsonData);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
      fetchData();
    }, []);
  
    // Render your component using the 'data' state
  
    return (
      <div>
        {data ? (
          <div>
            {data.map((user) => (
              <p key={user.user_id}>{user.metadata.team_name}</p>
            ))}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    );
};

export default About;
