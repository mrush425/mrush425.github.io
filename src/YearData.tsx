// YearData.tsx
import React from 'react';

interface YearDataProps {
  data: any; // Replace with the actual type of your data
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  return (
    <div>
      <h2>{data.season}</h2>
    </div>
  );
};

export default YearData;