import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Table, InputGroup } from 'react-bootstrap';
import AdminSidebar from "../AdminComponents/AdminSidebar";
import { useNavigate } from 'react-router-dom';
import './AdminArchiveSemester.css';
import { FaSearch } from 'react-icons/fa';
import Modal from 'react-bootstrap/Modal';
import Header from '../components/Header';

const ArchiveSemesterScreen = () => {
    const navigate = useNavigate();
    const [archivedSemesters, setArchivedSemesters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchArchivedSemesters = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/admin/archivedSemesters', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setArchivedSemesters(data);
        } catch (error) {
            setError('An error occurred while fetching archived semesters');
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        fetchArchivedSemesters();
    }, []);

    // Pagination and filtering
    const filteredSemesters = archivedSemesters.filter(semester =>
        semester.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredSemesters.slice(indexOfFirstEntry, indexOfLastEntry);

    const totalPages = Math.ceil(filteredSemesters.length / entriesPerPage);

    const handlePageChange = (direction) => {
        if (direction === 'prev' && currentPage > 1) setCurrentPage(currentPage - 1);
        if (direction === 'next' && currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    return (
        <>
            <Header />
            <AdminSidebar />
            <div className='d-flex'>
                <main className="main-content flex-grow-1">
                    <Container>
                        <Card className="mt-4">
                            <Card.Header>
                                <h4 className="mb-0">Archived Semesters</h4>
                            </Card.Header>
                            <Card.Body>
                                {error && <div className="alert alert-danger" role="alert">{error}</div>}

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center">
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '300px' }}
                                        />
                                        <Button variant="outline-secondary">
                                            <FaSearch />
                                        </Button>
                                    </div>
                                    <Form.Select
                                        value={entriesPerPage}
                                        onChange={(e) => setEntriesPerPage(parseInt(e.target.value))}
                                        style={{ width: '150px' }}
                                    >
                                        <option value={10}>10 Entries</option>
                                        <option value={25}>25 Entries</option>
                                        <option value={50}>50 Entries</option>
                                    </Form.Select>
                                </div>

                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr className='text-center'>
                                            <th>Semester Name</th>
                                            <th>Year</th>
                                        </tr>
                                    </thead>
                                    <tbody className='text-center'>
                                        {currentEntries.map((semester) => (
                                            <tr key={semester._id}>
                                                <td>{semester.name}</td>
                                                <td>{semester.year}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                <div className="d-flex justify-content-between">
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => handlePageChange('prev')}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => handlePageChange('next')}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Container>
                </main>
            </div>
        </>
    );
};

export default ArchiveSemesterScreen;