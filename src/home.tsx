import React from 'react';
import './App.css';

const user = {
  name: 'Future Home of the League of the Trolls Website',
  imageUrl: 'https://images.unsplash.com/photo-1627477150479-b7f109c3aaa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
  imageSize: 200,
};

function Home() {
  return (
    <div className="App">
      <h1>{user.name}</h1>
      <img
        className="avatar"
        src={user.imageUrl}
        alt={'Photo of ' + user.name}
        style={{
          width: user.imageSize,
          height: user.imageSize
        }}
      />
    </div>
  );
}

export default Home;