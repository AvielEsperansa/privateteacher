import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/StudentList.css';
import StudentProfile from './StudentProfile';

interface Student {
    id: string;
    full_name: string;
    phone: string;
    subject: string;
    price_per_lesson: number;
    created_at: string;
}

export default function StudentList() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudents(data || []);
        } catch (error: any) {
            console.error('Error fetching students:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // סינון התלמידים לפי מה שהמורה מחפשת
    const filteredStudents = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.subject && student.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="loading-spinner">טוען תיקי תלמידים...</div>;

    return (
        <div className="student-list-container">
            <div className="student-list-header">
                <h2>📁 תיקי תלמידים</h2>
                <button onClick={fetchStudents} className="refresh-button" style={{ margin: 0 }}>
                    🔄 רענן
                </button>
            </div>

            <div className="search-container">
                <label>🔍 חיפוש תלמיד או מקצוע:</label>
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        placeholder="חפשי לפי שם תלמיד, או מקצוע..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {filteredStudents.length === 0 ? (
                <p className="no-students">לא נמצאו תלמידים התואמים לחיפוש.</p>
            ) : (
                <table className="students-table">
                    <thead>
                        <tr>
                            <th>שם מלא</th>
                            <th>מקצוע</th>
                            <th>טלפון</th>
                            <th>סטטוס</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id}>
                                <td style={{ fontWeight: 'bold' }}>{student.full_name}</td>
                                <td>{student.subject || '-'}</td>
                                <td>{student.phone || '-'}</td>
                                <td><span style={{ color: '#2ecc71', fontSize: '0.8rem' }}>● פעיל</span></td>
                                <td>
                                    <button
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className="refresh-button"
                                        style={{ margin: 0, padding: '6px 12px', fontSize: '0.9rem', backgroundColor: '#646cff', color: 'white' }}
                                    >
                                        📂 פתח תיק
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {selectedStudentId && (
                <StudentProfile
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}
        </div>
    );
}
