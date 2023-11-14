// Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Container, Nav } from 'react-bootstrap';
import LeagueData from './Interfaces/LeagueData';

interface NavbarProps {
  data: LeagueData[]; // Use the LeagueData type for the data prop
}

const CustomNavbar: React.FC = ({}) => {
  const logoImageUrl =
    'https://images.unsplash.com/photo-1627477150479-b7f109c3aaa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80';

  return (
    <Navbar bg="dark" variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <img
            className="avatar"
            src={logoImageUrl}
            alt="Photo of Walrus"
            style={{
              width: 50,
              height: 50,
            }}
          />{' '}
          League of the Trolls
        </Navbar.Brand>

        <Nav className="me-auto">
          <Nav.Link as={Link} to="/">
            Home
          </Nav.Link>
          <Nav.Link as={Link} to="/about">
            About
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default CustomNavbar;
