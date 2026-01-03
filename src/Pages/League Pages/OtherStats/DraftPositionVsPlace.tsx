// DraftPositionVsPlace.tsx
import React from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import DraftKeyVsPlace from './DraftKeyVsPlace';

const DraftPositionVsPlace: React.FC<OtherComponentProps> = (props) => {
  return <DraftKeyVsPlace {...props} mode="draft_position" />;
};

export default DraftPositionVsPlace;
