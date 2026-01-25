import React from 'react';
import '../Stylesheets/App.css'

const user = {
  name: 'League of the Trolls Home Page',
  imageUrl: 'https://images.unsplash.com/photo-1627477150479-b7f109c3aaa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
  imageSize: 200,
};

function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '36px',
        marginBottom: '40px',
        fontWeight: '700',
        letterSpacing: '-0.5px'
      }}>{user.name}</h1>
      <img
        className="avatar"
        src={user.imageUrl}
        alt={'Photo of ' + user.name}
        style={{
          width: user.imageSize,
          height: user.imageSize,
          borderRadius: '12px',
          border: '2px solid var(--accent-blue)',
          boxShadow: '0 8px 24px rgba(96, 165, 250, 0.2)',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

export default Home;