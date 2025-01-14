import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Container, Nav, Offcanvas, Button, NavDropdown } from 'react-bootstrap';
import LeagueData from '../Interfaces/LeagueData';

interface NavbarProps {
  data: LeagueData[];
}

const WebsiteNavBar: React.FC<NavbarProps> = ({ data }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState<'main' | 'seasons'>('main'); // Tracks the sidebar view
  const closeDropdownTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const handleShowSidebar = () => setShowSidebar(true);
  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSidebarView('main'); // Reset to the main menu when closing
  };

  const handleMouseEnter = () => {
    if (closeDropdownTimeout.current) {
      clearTimeout(closeDropdownTimeout.current);
    }
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    closeDropdownTimeout.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200);
  };

  const logoImageUrl =
    'https://images.unsplash.com/photo-1627477150479-b7f109c3aaa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80';

  return (
    <>
      {/* Top Navbar for Mobile */}
      <Navbar bg="dark" variant="dark" expand="lg" className="d-lg-none">
        <Container className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Button variant="outline-light" onClick={handleShowSidebar} className="me-2">
              ☰
            </Button>
            <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
              <img
                className="avatar me-2"
                src={logoImageUrl}
                alt="Photo of Walrus"
                style={{ width: 50, height: 50 }}
              />
              <span className="text-white">League of the Trolls</span>
            </Navbar.Brand>
          </div>
        </Container>
      </Navbar>

      {/* Sidebar for Mobile */}
      <Offcanvas show={showSidebar} onHide={handleCloseSidebar} placement="start" className="bg-dark text-white">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title>
            {sidebarView === 'main' ? 'League of the Trolls' : 'Seasons'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {/* Main Menu */}
          {sidebarView === 'main' && (
            <Nav className="flex-column fs-4"> {/* fs-4 increases font size */}
              <Nav.Link as={Link} to="/" onClick={handleCloseSidebar}>
                Home
              </Nav.Link>
              <Nav.Link as={Link} to="/league-stats" onClick={handleCloseSidebar}>
                League Stats
              </Nav.Link>
              <Nav.Link as={Link} to="/hall-of-fame" onClick={handleCloseSidebar}>
                Hall of Fame
              </Nav.Link>
              {/* Seasons Menu with Indicator */}
              <Nav.Link
                onClick={() => setSidebarView('seasons')}
                className="d-flex justify-content-between align-items-center cursor-pointer"
              >
                Seasons
                <span>&gt;</span> {/* Simple text indicator */}
              </Nav.Link>
            </Nav>
          )}
          {/* Seasons Submenu */}
          {sidebarView === 'seasons' && (
            <Nav className="flex-column fs-4"> {/* fs-4 applies here too */}
              <Nav.Link onClick={() => setSidebarView('main')} className="cursor-pointer">
                ← Back
              </Nav.Link>
              {data.map((league) => (
                <Nav.Link
                  key={league.league_id}
                  as={Link}
                  to={`/season/${league.season}`}
                  onClick={handleCloseSidebar}
                >
                  Season {league.season}
                </Nav.Link>
              ))}
            </Nav>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Full Navbar for Large Screens */}
      <Navbar bg="dark" variant="dark" expand="lg" className="d-none d-lg-flex">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <img
              className="avatar"
              src={logoImageUrl}
              alt="Photo of Walrus"
              style={{ width: 50, height: 50 }}
            />{' '}
            League of the Trolls
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/league-stats">
              League Stats
            </Nav.Link>
            <Nav.Link as={Link} to="/hall-of-fame">
              Hall of Fame
            </Nav.Link>
            {/* Hover-based Dropdown for Large Screens */}
            <NavDropdown
              title="Seasons"
              id="basic-nav-dropdown"
              show={isDropdownOpen}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {data.map((league) => (
                <NavDropdown.Item key={league.league_id} as={Link} to={`/season/${league.season}`}>
                  Season {league.season}
                </NavDropdown.Item>
              ))}
            </NavDropdown>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
};

export default WebsiteNavBar;
