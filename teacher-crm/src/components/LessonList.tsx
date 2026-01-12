import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/LessonList.css';
import StudentProfile from './StudentProfile';

interface Lesson {
    id: string;
    lesson_date: string;
    duration_minutes: number;
    is_paid: boolean;
    notes: string;
    student_id: string;
    students: {
        full_name: string;
    };
}

export default function LessonList() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select(`
          id,
          lesson_date,
          duration_minutes,
          is_paid,
          notes,
          student_id,
          students (
            full_name
          )
        `)
                .order('lesson_date', { ascending: true });

            if (error) throw error;
            setLessons(data as any || []);
        } catch (error: any) {
            console.error('Error fetching lessons:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const formatDate = (dateString: string) => {
        const options: any = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('he-IL', options);
    };

    if (loading) return <div className="loading-spinner">טוען יומן שיעורים...</div>;

    return (
        <div className="lesson-list-container">
            <h2>📅 יומן שיעורים</h2>

            <button onClick={fetchLessons} className="refresh-button">
                🔄 רענן יומן
            </button>

            {lessons.length === 0 ? (
                <p className="no-lessons">אין שיעורים מתוכננים כרגע.</p>
            ) : (
                <table className="lessons-table">
                    <thead>
                        <tr>
                            <th>תאריך ושעה</th>
                            <th>תלמיד</th>
                            <th>סטטוס</th>
                            <th>פעולה מהירה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lessons.map((lesson) => (
                            <tr key={lesson.id} className="lesson-row">
                                <td className="date-badge">{formatDate(lesson.lesson_date)}</td>
                                <td style={{ fontWeight: 'bold' }}>{lesson.students?.full_name}</td>
                                <td>
                                    <span className={`status-badge ${lesson.is_paid ? 'paid' : 'pending'}`}>
                                        {lesson.is_paid ? 'שולם' : 'טרם שולם'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => setSelectedStudentId(lesson.student_id)}
                                        className="refresh-button"
                                        style={{ margin: 0, padding: '5px 10px', fontSize: '0.85rem', backgroundColor: '#646cff', color: 'white' }}
                                    >
                                        📝 הזן תרגול/סיכום
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* פתיחת תיק תלמיד ישירות מהיומן */}
            {selectedStudentId && (
                <StudentProfile
                    studentId={selectedStudentId}
                    onClose={() => {
                        setSelectedStudentId(null);
                        fetchLessons(); // רענון למקרה שמשהו השתנה
                    }}
                />
            )}
        </div>
    );
}
