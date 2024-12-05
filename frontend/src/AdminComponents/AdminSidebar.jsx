import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import './AdminSidebar.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSidebar = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogOut = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/users/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            navigate('/login');
            console.log('Logout successful');
        } catch (err) {
            setError(err.message);
            console.error('Error during logout:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const [dropdowns, setDropdowns] = useState({
        users: false,
        academic: false,
        archive: false, // Archive dropdown
        settings: false,
    });

    const toggleDropdown = (key) => {
        setDropdowns(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Admin Panel</h3>
            </div>

            <Nav className="flex-column flex-grow-1">
                <LinkContainer to="/admin">
                    <Nav.Link className="sidebar-link">
                        <i className="bi bi-house-door"></i> Home
                    </Nav.Link>
                </LinkContainer>

                {/* Users Management */}
                <div className="sidebar-dropdown">
                    <div className="sidebar-link" onClick={() => toggleDropdown('users')}>
                        <i className="bi bi-people-fill"></i>
                        <span>Users Management</span>
                        <i className={`bi bi-chevron-${dropdowns.users ? 'up' : 'down'} ms-auto`}></i>
                    </div>
                    <div className={`sidebar-dropdown-content ${dropdowns.users ? 'show' : ''}`}>
                        <LinkContainer to="/admin/AdminViewAllUsersScreen">
                            <Nav.Link>
                                <i className="bi bi-person-lines-fill"></i> View All Users
                            </Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/admin/AdminCreateStudentAccount">
                            <Nav.Link>
                                <i className="bi bi-person-plus-fill"></i> Add Student Account
                            </Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/admin/AdminCreateTeacherAccount">
                            <Nav.Link>
                                <i className="bi bi-person-badge-fill"></i> Add Teacher Account
                            </Nav.Link>
                        </LinkContainer>
                    </div>
                </div>

                {/* Academic Management */}
                <div className="sidebar-dropdown">
                    <div className="sidebar-link" onClick={() => toggleDropdown('academic')}>
                        <i className="bi bi-diagram-3"></i>
                        <span>Academic Management</span>
                        <i className={`bi bi-chevron-${dropdowns.academic ? 'up' : 'down'} ms-auto`}></i>
                    </div>
                    <div className={`sidebar-dropdown-content ${dropdowns.academic ? 'show' : ''}`}>
                        <LinkContainer to="/admin/strands">
                            <Nav.Link>
                                Manage Strands
                            </Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/admin/ManageSections">
                            <Nav.Link>Manage Sections</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/admin/ManageSubjects">
                            <Nav.Link>Manage Subjects</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/admin/ManageSemesters">
                            <Nav.Link>Manage Semesters</Nav.Link>
                        </LinkContainer>
                    </div>
                </div>

                {/* Archive Management */}
                <div className="sidebar-dropdown">
                    <div className="sidebar-link" onClick={() => toggleDropdown('archive')}>
                        <i className="bi bi-archive"></i>
                        <span>Archive Management</span>
                        <i className={`bi bi-chevron-${dropdowns.archive ? 'up' : 'down'} ms-auto`}></i>
                    </div>
                    <div className={`sidebar-dropdown-content ${dropdowns.archive ? 'show' : ''}`}>
                        <LinkContainer to="/admin/ArchivedSemesters">
                            <Nav.Link>
                                <i className="bi bi-clock-history"></i> View Archived Semesters
                            </Nav.Link>
                        </LinkContainer>
                    </div>
                </div>

                {/* Logout */}
                <div className="sidebar-footer">
                    <div className="logout-link">
                        <Nav.Link onClick={handleLogOut} className="sidebar-link">
                            <i className="bi bi-box-arrow-right"></i>
                            <span>Logout</span>
                        </Nav.Link>
                    </div>
                </div>
            </Nav>
        </div>
    );
};

export default AdminSidebar;