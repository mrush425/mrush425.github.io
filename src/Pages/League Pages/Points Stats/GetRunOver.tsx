import React from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import PositionPointsAgainstStats from './PositionPointsAgainstStats';

const GetRunOver: React.FC<RecordComponentProps & { minYears?: number }> = (props) => {
  return (
    <PositionPointsAgainstStats
      {...props}
      position="RB"
      metricLabel="RB Points Against"
    />
  );
};

export default GetRunOver;
