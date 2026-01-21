import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/StudentList.css';
import StudentProfile from './StudentProfile';

interface Student {
    id: string;
    full_name: string;
    email: string | null;
    grade: string | null;
    level: string | null;
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudents(data || []);
        } catch (error: any) {
            console.error('Error fetching students:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (!window.confirm(`האם את בטוחה שברצונך למחוק את התלמיד/ה ${name}? כל השיעורים והקבצים שלו יימחקו גם כן.`)) return;

        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
            fetchStudents();
        } catch (err: any) {
            alert('שגיאה במחיקה: ' + err.message);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.grade && student.grade.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.level && student.level.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <label>🔍 חיפוש תלמיד, כיתה או רמה:</label>
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        placeholder="חפשי לפי שם תלמיד, כיתה או רמה..."
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
                            <th>כיתה</th>
                            <th>רמה</th>
                            <th>אימייל</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id}>
                                <td style={{ fontWeight: 'bold' }}>{student.full_name}</td>
                                <td>{student.grade || '-'}</td>
                                <td>{student.level || '-'}</td>
                                <td>{student.email || '-'}</td>
                                <td style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className="refresh-button"
                                        style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#646cff', color: 'white' }}
                                    >
                                        📂 פתח
                                    </button>
                                    <button
                                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                                        className="refresh-button"
                                        style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#fed7d7', color: '#c53030', border: 'none' }}
                                    >
                                        🗑️ מחק
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
                    onClose={() => { setSelectedStudentId(null); fetchStudents(); }}
                />
            )}
        </div>
    );
}
