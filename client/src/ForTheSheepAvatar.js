import React from 'react';
import './ForTheSheepAvatar.css';

const ForTheSheepAvatar = ({ isLoading }) => {
  return (
    <div className={`for-the-sheep-avatar ${isLoading ? 'thinking' : ''}`}>
      <div className="avatar-body">
        <div className="avatar-eye left"></div>
        <div className="avatar-eye right"></div>
      </div>
    </div>
  );
};

export default ForTheSheepAvatar;