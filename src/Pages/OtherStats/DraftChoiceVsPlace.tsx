// DraftChoiceVsPlace.tsx
import React from 'react';
import { OtherComponentProps } from '../../Interfaces/OtherStatItem';
import DraftKeyVsPlace from './DraftKeyVsPlace';

const DraftChoiceVsPlace: React.FC<OtherComponentProps> = (props) => {
  return <DraftKeyVsPlace {...props} mode="draft_choice" />;
};

export default DraftChoiceVsPlace;
