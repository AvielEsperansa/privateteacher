import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Mail, GraduationCap, MapPin, Trash2, FolderOpen, RefreshCw, User } from 'lucide-react';
import '../styles/StudentList.css';
import StudentProfile from './StudentProfile';

interface Student {
    id: string;
    full_name: string;
    email: string | null;
    grade: string | null;
    level: string | null;
    subject: string | null;
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

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <RefreshCw className="animate-spin text-primary" size={48} />
        </div>
    );

    return (
        <div className="student-list-section animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="search-bar-container">
                    <Search size={20} className="text-muted" />
                    <input
                        type="text"
                        placeholder="חפשי לפי שם תלמיד, כיתה או מקצוע..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={fetchStudents} className="btn btn-secondary">
                    <RefreshCw size={16} />
                    רענן
                </button>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', display: 'block' }} className="text-muted" />
                    <p className="text-secondary">לא נמצאו תלמידים התואמים לחיפוש.</p>
                </div>
            ) : (
                <div className="student-grid">
                    {filteredStudents.map((student) => {
                        const initials = student.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
                        return (
                            <div key={student.id} className="student-card">
                                <div className="student-card-header">
                                    <div className="student-avatar-large">{initials}</div>
                                    <div className="student-name-group">
                                        <h3>{student.full_name}</h3>
                                        <div className="student-badge-group">
                                            <span className="badge badge-info">{student.subject || 'כללי'}</span>
                                            {student.grade && <span className="badge badge-success">כיתה {student.grade}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="student-info-row">
                                    <div className="info-item">
                                        <GraduationCap size={16} />
                                        <span>{student.level || 'רמה לא הוגדרה'}</span>
                                    </div>
                                    {student.email && (
                                        <div className="info-item">
                                            <Mail size={16} />
                                            <span>{student.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="student-actions">
                                    <button
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                    >
                                        <FolderOpen size={16} />
                                        תיק תלמיד
                                    </button>
                                    <button
                                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                                        className="btn btn-secondary"
                                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.75rem' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

