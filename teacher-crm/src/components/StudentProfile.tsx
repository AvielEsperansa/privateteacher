import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/StudentProfile.css';

interface Student {
    id: string;
    full_name: string;
    notes: string;
    grade?: string;
    level?: string;
    email?: string;
    phone_number?: string;
    subject?: string;
    username?: string;
    password?: string;
}

interface Session {
    id: string;
    scheduled_at: string;
    summary: string;
    status: 'scheduled' | 'done' | 'canceled';
    duration_minutes: number;
    homework?: string;
    is_paid: boolean;
}


interface Props {
    studentId: string;
    selectedLessonId?: string;
    onClose: () => void;
}

export default function StudentProfile({ studentId, onClose }: Props) {
    const [student, setStudent] = useState<Student | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [newNote, setNewNote] = useState('');
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [isEditingStudent, setIsEditingStudent] = useState(false);

    // טופס עריכת תלמיד
    const [studentForm, setStudentForm] = useState<Partial<Student>>({});

    const [editForm, setEditForm] = useState({
        scheduled_at: '',
        duration_minutes: 60,
        summary: '',
        homework: ''
    });

    const sessionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    useEffect(() => {
        fetchProfileData();
    }, [studentId]);

    const fetchProfileData = async () => {
        const { data: s } = await supabase.from('students').select('*').eq('id', studentId).single();
        if (s) {
            setStudent(s);
            setStudentForm(s);
            setNewNote(s.notes || '');
        }

        const { data: h } = await supabase.from('sessions').select('*').eq('student_id', studentId).order('scheduled_at', { ascending: false });
        if (h) setSessions(h || []);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('students')
            .update({
                full_name: studentForm.full_name,
                phone_number: studentForm.phone_number,
                email: studentForm.email,
                grade: studentForm.grade,
                subject: studentForm.subject,
                username: studentForm.username,
                password: studentForm.password
            })
            .eq('id', studentId);

        if (!error) {
            setIsEditingStudent(false);
            fetchProfileData();
            alert('פרטי התלמיד עודכנו בהצלחה!');
        }
    };

    const handleSaveSessionEdit = async (sessionId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const startTime = new Date(editForm.scheduled_at);
            const endTime = new Date(startTime.getTime() + editForm.duration_minutes * 60000);

            const { data: otherSessions } = await supabase
                .from('sessions')
                .select('id, scheduled_at, duration_minutes, students(full_name)')
                .eq('teacher_id', user.id)
                .neq('id', sessionId)
                .neq('status', 'canceled');

            const conflict = otherSessions?.find(s => {
                const sStart = new Date(s.scheduled_at);
                const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                return (startTime < sEnd && endTime > sStart);
            });

            if (conflict) {
                const conflictTime = new Date(conflict.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                // Note: 'students' in the query returns a single object if configured correctly in Supabase/PostgREST
                const studentName = (conflict.students as any)?.full_name || 'תלמיד אחר';
                throw new Error(`חפיפת זמנים! כבר קיים שיעור בשעה ${conflictTime} עם ${studentName}`);
            }

            await supabase.from('sessions').update({
                scheduled_at: editForm.scheduled_at,
                duration_minutes: editForm.duration_minutes,
                summary: editForm.summary,
                homework: editForm.homework
            }).eq('id', sessionId);

            setEditingSessionId(null);
            fetchProfileData();
        } catch (err: any) { alert(err.message); }
    };

    const toggleStatus = async (sessionId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'scheduled' ? 'done' : 'scheduled';
        await supabase.from('sessions').update({ status: nextStatus }).eq('id', sessionId);
        fetchProfileData();
    };

    const togglePaidStatus = async (sessionId: string, currentPaid: boolean) => {
        await supabase.from('sessions').update({ is_paid: !currentPaid }).eq('id', sessionId);
        fetchProfileData();
    };

    const sendWhatsAppSummary = (session: Session) => {
        if (!student?.phone_number) {
            alert('לא הוזן מספר טלפון לתלמיד זה.');
            return;
        }

        const date = new Date(session.scheduled_at).toLocaleDateString('he-IL');
        const text = `*סיכום שיעור - ${date}* 🎓%0A%0A` +
            `*נושא:* ${session.summary || 'לא צוין'}%0A` +
            `*שיעורי בית:* ${session.homework || 'אין'}%0A%0A` +
            `שיהיה המשך שבוע מצוין! ✨`;

        const phone = student.phone_number.replace(/[^0-9]/g, '');
        const finalPhone = phone.startsWith('0') ? '972' + phone.substring(1) : phone;

        window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
    };

    if (!student) return null;

    return (
        <div className="student-profile-overlay">
            <div className="student-profile-card">
                <button onClick={onClose} className="close-btn">סגור X</button>

                {isEditingStudent ? (
                    <div className="student-edit-form-container">
                        <h2>⚙️ עריכת פרטי תלמיד</h2>
                        <form onSubmit={handleUpdateStudent} className="student-personal-edit-form">
                            <div className="form-row">
                                <input type="text" placeholder="שם מלא" value={studentForm.full_name} onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
                                <input type="text" placeholder="טלפון" value={studentForm.phone_number} onChange={e => setStudentForm({ ...studentForm, phone_number: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <input type="text" placeholder="כיתה" value={studentForm.grade} onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })} />
                                <select value={studentForm.subject} onChange={e => setStudentForm({ ...studentForm, subject: e.target.value })}>
                                    <option value="מתמטיקה">מתמטיקה</option>
                                    <option value="אנגלית">אנגלית</option>
                                    <option value="לשון">לשון</option>
                                    <option value="מדעים">מדעים</option>
                                    <option value="אחר">אחר</option>
                                </select>
                            </div>
                            <div className="credentials-edit">
                                <h4>🔐 פרטי גישה לאזור האישי</h4>
                                <div className="form-row">
                                    <input type="text" placeholder="שם משתמש" value={studentForm.username} onChange={e => setStudentForm({ ...studentForm, username: e.target.value })} />
                                    <input type="text" placeholder="סיסמה" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: '20px' }}>
                                <button type="submit" className="save-btn">שמור שינויים</button>
                                <button type="button" onClick={() => setIsEditingStudent(false)} className="cancel-btn">ביטול</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="profile-header">
                            <div className="student-main-info">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h1>{student.full_name}</h1>
                                    <button onClick={() => setIsEditingStudent(true)} className="edit-personal-btn">⚙️ עריכת פרטים</button>
                                </div>
                                <div className="tags">
                                    <span className="tag subject">{student.subject || 'כללי'}</span>
                                    <span className="tag grade">{student.grade || 'ללא כיתה'}</span>
                                    <span className="tag phone">📱 {student.phone_number || 'אין טלפון'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-grid">
                            <div className="profile-main-content">
                                <section className="profile-section">
                                    <h3>🕒 יומן למידה וסיכומי שיעורים</h3>
                                    <div className="profile-sessions-list">
                                        {sessions.map(s => {
                                            const isEditing = editingSessionId === s.id;
                                            return (
                                                <div key={s.id} className={`profile-session-item ${s.status}`} ref={el => { sessionRefs.current[s.id] = el; }}>
                                                    {isEditing ? (
                                                        <div className="full-edit-mode">
                                                            <div className="edit-grid">
                                                                <input type="datetime-local" value={editForm.scheduled_at.slice(0, 16)} onChange={e => setEditForm({ ...editForm, scheduled_at: e.target.value })} />
                                                                <input type="number" value={editForm.duration_minutes} onChange={e => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) })} />
                                                            </div>
                                                            <textarea value={editForm.summary} onChange={e => setEditForm({ ...editForm, summary: e.target.value })} />
                                                            <textarea value={editForm.homework} onChange={e => setEditForm({ ...editForm, homework: e.target.value })} />
                                                            <div className="edit-actions">
                                                                <button onClick={() => handleSaveSessionEdit(s.id)} className="save-btn">שמור</button>
                                                                <button onClick={() => setEditingSessionId(null)} className="cancel-btn">ביטול</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="session-item-header">
                                                                <span className="session-date">
                                                                    📅 {new Date(s.scheduled_at).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                                                    <span style={{ marginRight: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                                        ⏰ {new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button onClick={() => sendWhatsAppSummary(s)} className="status-badge-mini" style={{ background: '#25d366', color: 'white' }}>🟢 WA</button>
                                                                    <button onClick={() => togglePaidStatus(s.id, s.is_paid)} className={`status-badge-mini ${s.is_paid ? 'done' : 'scheduled'}`} style={!s.is_paid ? { background: '#fef3c7', color: '#b45309' } : {}}>
                                                                        {s.is_paid ? '💰 שולם' : '💳 חוב'}
                                                                    </button>
                                                                    <button onClick={() => toggleStatus(s.id, s.status)} className={`status-badge-mini ${s.status}`}>{s.status === 'done' ? '✅ בוצע' : '⏳ מתוכנן'}</button>
                                                                </div>
                                                            </div>
                                                            <div className="view-box" onClick={() => {
                                                                setEditingSessionId(s.id);
                                                                setEditForm({
                                                                    scheduled_at: new Date(new Date(s.scheduled_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
                                                                    duration_minutes: s.duration_minutes,
                                                                    summary: s.summary || '',
                                                                    homework: s.homework || ''
                                                                });
                                                            }}>
                                                                <p className="summary-text">{s.summary || 'לחצי לעריכה...'}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>

                            <div className="profile-sidebar">
                                <section className="profile-section">
                                    <h3>✍️ הערות כלליות</h3>
                                    <textarea className="notes-area-large" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="מידע חשוב..." />
                                    <button onClick={async () => { await supabase.from('students').update({ notes: newNote }).eq('id', studentId); alert('הערות נשמרו'); }} className="submit-button">שמור הערות</button>
                                </section>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
