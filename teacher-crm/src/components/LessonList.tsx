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
    price: number;
    students: {
        full_name: string;
    };
}

export default function LessonList() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [targetLessonId, setTargetLessonId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

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
          price,
          students (
            full_name
          )
        `)
                .order('lesson_date', { ascending: false });

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

    const togglePaymentStatus = async (lessonId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('lessons')
                .update({ is_paid: !currentStatus })
                .eq('id', lessonId);

            if (error) throw error;

            // הצגת הודעת אישור
            setFeedback(currentStatus ? 'הסטטוס שונה ל"ממתין לתשלום"' : 'מעולה! הסטטוס שונה ל"שולם" ✅');
            setTimeout(() => setFeedback(null), 3000);

            fetchLessons();
        } catch (error: any) {
            console.error('Error updating status:', error.message);
        }
    };

    const handleQuickAction = (studentId: string, lessonId: string) => {
        setSelectedStudentId(studentId);
        setTargetLessonId(lessonId);
    };

    if (loading) return <div className="loading-spinner">טוען יומן שיעורים...</div>;

    return (
        <div className="lesson-list-container">
            <h2>📅 יומן שיעורים</h2>

            <button onClick={fetchLessons} className="refresh-button">
                🔄 רענן יומן
            </button>

            {feedback && (
                <div style={{
                    padding: '10px 20px',
                    background: '#e6fffa',
                    color: '#234e52',
                    border: '1px solid #b2f5ea',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    animation: 'fadeIn 0.3s ease-in'
                }}>
                    {feedback}
                </div>
            )}

            {lessons.length === 0 ? (
                <p className="no-lessons">אין שיעורים מתוכננים כרגע.</p>
            ) : (
                <table className="lessons-table">
                    <thead>
                        <tr>
                            <th>תאריך ושעה</th>
                            <th>תלמיד</th>
                            <th>מחיר</th>
                            <th>סטטוס</th>
                            <th>פעולה מהירה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lessons.map((lesson) => (
                            <tr key={lesson.id} className="lesson-row">
                                <td className="date-badge">{formatDate(lesson.lesson_date)}</td>
                                <td style={{ fontWeight: 'bold' }}>{lesson.students?.full_name}</td>
                                <td style={{ fontWeight: 'bold' }}>₪{lesson.price || 0}</td>
                                <td>
                                    <span
                                        className={`status-badge ${lesson.is_paid ? 'paid' : 'pending'}`}
                                        onClick={() => togglePaymentStatus(lesson.id, lesson.is_paid)}
                                        style={{ cursor: 'pointer' }}
                                        title="לחצי לשינוי סטטוס תשלום"
                                    >
                                        {lesson.is_paid ? 'שולם' : 'טרם שולם'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleQuickAction(lesson.student_id, lesson.id)}
                                        className="refresh-button"
                                        style={{ margin: 0, padding: '5px 12px', fontSize: '0.85rem', backgroundColor: '#2d3748', color: 'white', borderRadius: '8px' }}
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
                    selectedLessonId={targetLessonId || undefined}
                    onClose={() => {
                        setSelectedStudentId(null);
                        setTargetLessonId(null);
                        fetchLessons(); // רענון למקרה שמשהו השתנה
                    }}
                />
            )}
        </div>
    );
}
