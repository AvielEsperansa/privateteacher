import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Settings, Phone, GraduationCap, CheckCircle, XCircle, Clock, MessageCircle, Save, Edit3, Shield, BookOpen, Plus, Camera, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExerciseManager from './ExerciseManager';
import '../styles/StudentProfile.css';
import '../styles/ExerciseMini.css';

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
    hourly_rate?: number;
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
    onClose: () => void;
}

export default function StudentProfile({ studentId, onClose }: Props) {
    const [student, setStudent] = useState<Student | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'sessions' | 'notes' | 'practice'>('sessions');
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
    const [newNote, setNewNote] = useState('');
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [studentForm, setStudentForm] = useState<Partial<Student>>({});
    const [editForm, setEditForm] = useState({
        scheduled_at: '',
        duration_minutes: 60,
        summary: '',
        homework: ''
    });



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

        const { data: ex } = await supabase
            .from('exercises')
            .select('*, exercise_attempts(*), sessions(scheduled_at)')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        if (ex) setExercises(ex || []);
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
                password: studentForm.password,
                hourly_rate: studentForm.hourly_rate
            })
            .eq('id', studentId);

        if (!error) {
            setIsEditingStudent(false);
            fetchProfileData();
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
                const studentName = (conflict.students as any)?.full_name || 'תלמיד אחר';
                throw new Error(`חפיפת זמנים! כבר קיים שיעור בשעה ${conflictTime} עם ${studentName}`);
            }

            await supabase.from('sessions').update({
                scheduled_at: startTime.toISOString(),
                duration_minutes: editForm.duration_minutes,
                summary: editForm.summary,
                homework: editForm.homework
            }).eq('id', sessionId);

            setEditingSessionId(null);
            fetchProfileData();
        } catch (err: any) { alert(err.message); }
    };



    const togglePaidStatus = async (sessionId: string, currentPaid: boolean) => {
        const { error } = await supabase.from('sessions').update({ is_paid: !currentPaid }).eq('id', sessionId);
        if (!error) fetchProfileData();
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

    const initials = student.full_name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div className="student-profile-overlay">
            <div className="student-profile-card">
                <div className="profile-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <GraduationCap size={24} className="text-primary" />
                        <h2 style={{ fontSize: '1.25rem' }}>תיק תלמיד</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="profile-modal-body">
                    {isEditingStudent ? (
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <h3>עריכת פרטים אישיים</h3>
                                <button onClick={() => setIsEditingStudent(false)} className="btn btn-secondary">ביטול</button>
                            </div>
                            <form onSubmit={handleUpdateStudent} className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group">
                                    <label className="form-label">שם מלא</label>
                                    <input type="text" className="input" value={studentForm.full_name} onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">טלפון</label>
                                    <input type="text" className="input" value={studentForm.phone_number} onChange={e => setStudentForm({ ...studentForm, phone_number: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">כיתה</label>
                                    <input type="text" className="input" value={studentForm.grade} onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">מקצוע</label>
                                    <select className="input" value={studentForm.subject} onChange={e => setStudentForm({ ...studentForm, subject: e.target.value })}>
                                        <option value="מתמטיקה">מתמטיקה</option>
                                        <option value="אנגלית">אנגלית</option>
                                        <option value="לשון">לשון</option>
                                        <option value="מדעים">מדעים</option>
                                        <option value="אחר">אחר</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">מחיר לשעה (₪)</label>
                                    <input type="number" className="input" value={studentForm.hourly_rate} onChange={e => setStudentForm({ ...studentForm, hourly_rate: parseInt(e.target.value) })} />
                                </div>
                                <div className="credentials-section" style={{ gridColumn: '1 / -1' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <Shield size={18} />
                                        פרטי גישה לתלמיד
                                    </h4>
                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <input type="text" className="input" placeholder="שם משתמש" value={studentForm.username} onChange={e => setStudentForm({ ...studentForm, username: e.target.value })} />
                                        <input type="text" className="input" placeholder="סיסמה" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <Save size={18} />
                                    שמור שינויים בתיק
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            <div className="profile-summary-bar">
                                <div className="profile-avatar-circle">{initials}</div>
                                <div className="profile-main-meta">
                                    <h1>{student.full_name}</h1>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <span className="badge badge-info">{student.subject || 'כללי'}</span>
                                        <span className="badge badge-success">כיתה {student.grade || 'ללא'}</span>
                                        {student.phone_number && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                <Phone size={14} /> {student.phone_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setIsEditingStudent(true)} className="btn btn-secondary" style={{ marginRight: 'auto' }}>
                                    <Settings size={18} />
                                    הגדרות
                                </button>
                            </div>

                            <div className="profile-tabs">
                                <button className={`profile-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>שיעורים וסיכומים</button>
                                <button className={`profile-tab-btn ${activeTab === 'practice' ? 'active' : ''}`} onClick={() => setActiveTab('practice')}>תרגול אישי</button>
                                <button className={`profile-tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>הערות למידה</button>
                            </div>

                            {activeTab === 'sessions' ? (
                                <div className="animate-fade-in">
                                    {sessions.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                            <Clock size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                                            <p>טרם נקבעו שיעורים לתלמיד זה.</p>
                                        </div>
                                    ) : (
                                        sessions.map(s => {
                                            const isEditing = editingSessionId === s.id;
                                            return (
                                                <div key={s.id} className="session-card-mini">
                                                    {isEditing ? (
                                                        <div style={{ width: '100%' }}>
                                                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1rem' }}>
                                                                <input type="datetime-local" className="input" value={editForm.scheduled_at.slice(0, 16)} onChange={e => setEditForm({ ...editForm, scheduled_at: e.target.value })} />
                                                                <input type="number" className="input" placeholder="דקות" value={editForm.duration_minutes} onChange={e => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) })} />
                                                            </div>
                                                            <textarea className="input" style={{ marginBottom: '1rem', minHeight: '100px' }} placeholder="סיכום שיעור..." value={editForm.summary} onChange={e => setEditForm({ ...editForm, summary: e.target.value })} />
                                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                                <button onClick={() => handleSaveSessionEdit(s.id)} className="btn btn-primary">שמור</button>
                                                                <button onClick={() => setEditingSessionId(null)} className="btn btn-secondary">ביטול</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                                                    <span style={{ fontWeight: 700 }}>
                                                                        {new Date(s.scheduled_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                    <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                        <Clock size={14} /> {new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <span className={`badge ${s.status === 'done' ? 'badge-success' : 'badge-info'}`}>
                                                                        {s.status === 'done' ? 'בוצע' : 'מתוכנן'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>{s.summary || 'לחצי להוספת סיכום שיעור...'}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button onClick={() => sendWhatsAppSummary(s)} className="btn btn-secondary" style={{ color: '#25d366', padding: '0.5rem' }} title="שלח סיכום בוואטסאפ">
                                                                    <MessageCircle size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => togglePaidStatus(s.id, s.is_paid)}
                                                                    className={`payment-status-btn ${s.is_paid ? 'paid' : 'unpaid'}`}
                                                                    title={s.is_paid ? 'סומן כשולם' : 'סמן כשיעור שבוצע אך טרם שולם'}
                                                                >
                                                                    {s.is_paid ? <CheckCircle size={16} /> : <Clock size={16} />}
                                                                    <span>{s.is_paid ? 'שולם' : 'טרם שולם'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveTab('practice');
                                                                        setShowAddExercise(true);
                                                                        setPendingSessionId(s.id);
                                                                    }}
                                                                    className="btn btn-secondary"
                                                                    style={{ color: 'var(--primary)', padding: '0.5rem' }}
                                                                    title="שייך תרגיל לשיעור זה"
                                                                >
                                                                    <BookOpen size={18} />
                                                                </button>
                                                                <button onClick={() => {
                                                                    setEditingSessionId(s.id);
                                                                    setEditForm({
                                                                        scheduled_at: new Date(new Date(s.scheduled_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
                                                                        duration_minutes: s.duration_minutes,
                                                                        summary: s.summary || '',
                                                                        homework: s.homework || ''
                                                                    });
                                                                }} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                                                    <Edit3 size={18} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : activeTab === 'practice' ? (
                                <div className="animate-fade-in">
                                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <h3>תרגילים שניתנו לתלמיד</h3>
                                        {!showAddExercise && (
                                            <button onClick={() => setShowAddExercise(true)} className="btn btn-primary">
                                                <Plus size={18} /> הוספת תרגול חדש
                                            </button>
                                        )}
                                    </div>

                                    {showAddExercise ? (
                                        <div className="add-exercise-inline">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                                <button onClick={() => setShowAddExercise(false)} className="btn btn-secondary">סגור</button>
                                            </div>
                                            <ExerciseManager
                                                studentId={studentId}
                                                sessionId={pendingSessionId || undefined}
                                                onSave={() => {
                                                    fetchProfileData();
                                                    setTimeout(() => {
                                                        setShowAddExercise(false);
                                                        setPendingSessionId(null);
                                                    }, 2000);
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="student-exercises-list">
                                            {exercises.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '16px' }}>
                                                    <BookOpen size={40} className="text-muted" style={{ margin: '0 auto 1rem' }} />
                                                    <p>טרם נשלחו תרגילים אישיים לתלמיד זה.</p>
                                                    <button onClick={() => setShowAddExercise(true)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>שלחי לו את התרגיל הראשון</button>
                                                </div>
                                            ) : (
                                                <div className="exercise-mini-grid">
                                                    {exercises.map(ex => (
                                                        <div
                                                            key={ex.id}
                                                            className="exercise-mini-card"
                                                            onClick={() => setSelectedExercise(ex)}
                                                        >
                                                            {ex.question_image_url ? (
                                                                <div className="mini-image-wrap">
                                                                    <img src={ex.question_image_url} alt="Question" />
                                                                </div>
                                                            ) : (
                                                                <div className="mini-text-wrap">
                                                                    <p>{ex.question?.substring(0, 60)}...</p>
                                                                </div>
                                                            )}
                                                            <div className="mini-meta">
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ex.topic}</span>
                                                                    {ex.exercise_attempts && ex.exercise_attempts.length > 0 ? (
                                                                        ex.exercise_attempts[0].is_correct ?
                                                                            <CheckCircle size={14} className="text-success" /> :
                                                                            <XCircle size={14} className="text-danger" />
                                                                    ) : (
                                                                        <Clock size={14} className="text-muted" />
                                                                    )}
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{new Date(ex.created_at).toLocaleDateString('he-IL')}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h3>הערות למידה ודגשים</h3>
                                        <button onClick={async () => { await supabase.from('students').update({ notes: newNote }).eq('id', studentId); fetchProfileData(); }} className="btn btn-primary">
                                            <Save size={16} /> שמור הערות
                                        </button>
                                    </div>
                                    <textarea
                                        className="notes-editor"
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder="הוסיפי הערות על התקדמות התלמיד, קשיים, חוזקות וכל מה שחשוב לזכור..."
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* חלון צפייה בתרגיל */}
            <AnimatePresence>
                {selectedExercise && (
                    <motion.div
                        className="exercise-view-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedExercise(null)}
                    >
                        <motion.div
                            className="exercise-view-card"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button className="close-view-btn" onClick={() => setSelectedExercise(null)}>
                                <X size={24} />
                            </button>

                            <div className="view-content">
                                <h3>תצוגת תרגיל</h3>
                                <div className="view-question-area">
                                    {selectedExercise.question_image_url ? (
                                        <img src={selectedExercise.question_image_url} alt="שאלה" className="full-question-image" />
                                    ) : (
                                        <p className="full-question-text">{selectedExercise.question}</p>
                                    )}
                                </div>

                                <div className="view-details-grid">
                                    <div className="view-detail-item">
                                        <label>תשובה סופית:</label>
                                        <div className="detail-value highlight">{selectedExercise.correct_answer}</div>
                                    </div>
                                    {selectedExercise.sessions && (
                                        <div className="view-detail-item">
                                            <label>שויך לשיעור מתאריך:</label>
                                            <div className="detail-value">
                                                {new Date(selectedExercise.sessions.scheduled_at).toLocaleDateString('he-IL')}
                                                ({new Date(selectedExercise.sessions.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})
                                            </div>
                                        </div>
                                    )}
                                    {selectedExercise.explanation && (
                                        <div className="view-detail-item">
                                            <label>הסבר/דגשים:</label>
                                            <div className="detail-value">{selectedExercise.explanation}</div>
                                        </div>
                                    )}
                                    {selectedExercise.exercise_attempts && selectedExercise.exercise_attempts.length > 0 && (
                                        <div className="view-detail-item student-answer-box">
                                            <label>תשובת התלמיד:</label>
                                            <div className={`detail-value ${selectedExercise.exercise_attempts[0].is_correct ? 'correct-bg' : 'incorrect-bg'}`}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{selectedExercise.exercise_attempts[0].student_answer}</span>
                                                    {selectedExercise.exercise_attempts[0].is_correct ?
                                                        <span className="status-pill correct">נכון ✅</span> :
                                                        <span className="status-pill incorrect">צריך חיזוק ❌</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="view-footer">
                                    <button
                                        className="btn btn-secondary"
                                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                        onClick={async () => {
                                            if (window.confirm('האם את בטוחה שברצונך למחוק תרגיל זה?')) {
                                                await supabase.from('exercises').delete().eq('id', selectedExercise.id);
                                                setSelectedExercise(null);
                                                fetchProfileData();
                                            }
                                        }}
                                    >
                                        <Trash2 size={16} /> מחיקת תרגיל
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

