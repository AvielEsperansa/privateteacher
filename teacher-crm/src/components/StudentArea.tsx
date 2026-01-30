import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GraduationCap, LogOut, Calendar, BookOpen, FileText, CheckCircle, Clock, ExternalLink, User, Lock, AlertCircle } from 'lucide-react';
import ExercisePractice from './ExercisePractice';
import AIChat from './AIChat';
import '../styles/StudentArea.css';

interface Session {
    id: string;
    scheduled_at: string;
    summary: string;
    status: 'scheduled' | 'done' | 'canceled';
    duration_minutes: number;
    homework?: string;
}

interface Material {
    id: string;
    file_name: string;
    file_url: string;
    session_id?: string;
}

export default function StudentArea() {
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [student, setStudent] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPractice, setShowPractice] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const storedData = sessionStorage.getItem('studentData');
        if (storedData) {
            const s = JSON.parse(storedData);
            setStudent(s);
            fetchData(s.id);
        }
    }, []);

    const fetchData = async (studentId: string) => {
        setLoading(true);
        try {
            // טעינת שיעורים וחומרים
            const { data: sess } = await supabase.from('sessions').select('*').eq('student_id', studentId).order('scheduled_at', { ascending: false });
            const { data: mats } = await supabase.from('materials').select('*').eq('student_id', studentId);

            // טעינת תרגילים עם הניסיונות שלהם בשאילתה אחת
            const { data: exs, error: exErr } = await supabase
                .from('exercises')
                .select('*, exercise_attempts(*)')
                .eq('student_id', studentId);

            if (sess) setSessions(sess);
            if (mats) setMaterials(mats);

            if (exErr) {
                console.error("Join fetch failed, using fallback:", exErr);
                // Fallback למקרה שה-Join נכשל מסיבה כלשהי
                const { data: simpleExs } = await supabase.from('exercises').select('*').eq('student_id', studentId);
                const { data: atts } = await supabase.from('exercise_attempts').select('*').eq('student_id', studentId);

                if (simpleExs) {
                    const merged = simpleExs.map(ex => ({
                        ...ex,
                        exercise_attempts: atts ? atts.filter(a => a.exercise_id === ex.id) : []
                    }));
                    setExercises(merged);
                }
            } else if (exs) {
                // וידוא שכל תרגיל מכיל מערך ניסיונות (גם אם ריק)
                setExercises(exs.map(ex => ({
                    ...ex,
                    exercise_attempts: ex.exercise_attempts || []
                })));
            }

            setRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Error in fetchData:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data: s, error: sError } = await supabase
                .from('students')
                .select('*')
                .eq('username', loginData.username.trim().toLowerCase())
                .eq('password', loginData.password.trim())
                .maybeSingle();

            if (sError || !s) throw new Error('שם המשתמש או הסיסמה אינם נכונים.');

            setStudent(s);
            sessionStorage.setItem('studentData', JSON.stringify(s));
            await fetchData(s.id);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async (lastResults?: any[]) => {
        if (!student) return;

        // עדכון אופטימי - נציג לקוח את התוצאות מיד בזיכרון המקומי
        if (lastResults && lastResults.length > 0) {
            setExercises(prev => prev.map(ex => {
                const res = lastResults.find(r => r.id === ex.id);
                if (res) {
                    return {
                        ...ex,
                        exercise_attempts: [
                            ...(ex.exercise_attempts || []),
                            { student_answer: res.userAnswer, is_correct: res.isCorrect, created_at: new Date().toISOString() }
                        ]
                    };
                }
                return ex;
            }));
        }

        setLoading(true);
        // טעינה מהשרת ברקע בלי להמתין סתם
        await fetchData(student.id);
        setLoading(false);
    };

    if (student) {
        if (showPractice) {
            return <ExercisePractice
                key={`practice-${activeSessionId || 'general'}`}
                sessionId={activeSessionId || undefined}
                onBack={(results) => {
                    setShowPractice(false);
                    setActiveSessionId(null);
                    refreshData(results);
                }}
            />;
        }

        const upcoming = sessions.filter(s => s.status === 'scheduled');
        const history = sessions.filter(s => s.status === 'done');
        const generalMaterials = materials.filter(m => !m.session_id);

        return (
            <div className="student-area-dashboard animate-fade-in">
                <header className="student-portal-header">
                    <div className="student-welcome">
                        <h1>
                            שלום, {student.full_name.split(' ')[0]}! 👋
                            <button
                                onClick={() => fetchData(student.id)}
                                className="btn-icon"
                                style={{ marginRight: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                title="רענן נתונים"
                            >
                                <Clock size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </h1>
                        <p className="text-secondary">כאן נמצאת כל הלמידה שלך - שיעורים, סיכומים וחומרים.</p>
                    </div>
                    <button onClick={() => {
                        sessionStorage.removeItem('studentData');
                        setStudent(null);
                    }} className="btn btn-secondary">
                        <LogOut size={16} /> יציאה
                    </button>
                </header>

                <div className="student-layout">
                    <main>
                        <section>
                            <h3 className="portal-section-title">
                                <BookOpen size={20} className="text-primary" />
                                תרגול אישי
                            </h3>
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                {exercises.length > 0 ? (
                                    <>
                                        {exercises.filter(ex => (ex.exercise_attempts?.length || 0) === 0).length > 0 ? (
                                            <>
                                                <p style={{ marginBottom: '1rem' }}>יש לך {exercises.filter(ex => (ex.exercise_attempts?.length || 0) === 0).length} תרגילים חדשים שמחכים לך!</p>
                                                <button onClick={() => { setActiveSessionId(null); setShowPractice(true); }} className="btn btn-primary">
                                                    <BookOpen size={18} /> התחל תרגול כללי
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', marginBottom: '1rem' }}>
                                                    <CheckCircle size={20} />
                                                    <p style={{ margin: 0, fontWeight: 600 }}>כל הכבוד! סיימת את כל התרגילים האישיים שלך.</p>
                                                </div>
                                                <button onClick={() => { setActiveSessionId(null); setShowPractice(true); }} className="btn btn-secondary">
                                                    <BookOpen size={16} /> צפייה בתוצאות
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-muted">טרם הועלו תרגילים עבורך. המשיכי לעקוב!</p>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="portal-section-title">
                                <Calendar size={20} className="text-primary" />
                                השיעורים הקרובים שלי
                            </h3>
                            {upcoming.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Clock size={40} className="text-muted" style={{ margin: '0 auto 1rem' }} />
                                    <p className="text-secondary">אין כרגע שיעורים מתוכננים לעתיד.</p>
                                </div>
                            ) : (
                                upcoming.map(s => {
                                    const sessionExercises = exercises.filter(ex => ex.session_id === s.id);
                                    const attempts = sessionExercises.flatMap(ex => ex.exercise_attempts || []);
                                    // הושלם אם לכל תרגיל יש לפחות ניסיון אחד
                                    const isCompleted = sessionExercises.length > 0 && sessionExercises.every(ex => (ex.exercise_attempts?.length || 0) > 0);
                                    // בתהליך אם יש לפחות ניסיון אחד אבל לא סיימנו הכל
                                    const isInProgress = !isCompleted && attempts.length > 0;

                                    const score = attempts.length > 0
                                        ? Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100)
                                        : 0;

                                    return (
                                        <SessionPortalItem
                                            key={`${s.id}-${refreshKey}`}
                                            s={s}
                                            mats={materials.filter(m => m.session_id === s.id)}
                                            hasExercises={sessionExercises.length > 0}
                                            isCompleted={isCompleted}
                                            isInProgress={isInProgress}
                                            score={score}
                                            onStartPractice={() => {
                                                setActiveSessionId(s.id);
                                                setShowPractice(true);
                                            }}
                                            type="upcoming"
                                        />
                                    );
                                })
                            )}
                        </section>

                        <section style={{ marginTop: '3rem' }}>
                            <h3 className="portal-section-title">
                                <CheckCircle size={20} className="text-primary" />
                                היסטוריית למידה וסיכומים
                            </h3>
                            {history.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p className="text-secondary">טרם בוצעו שיעורים במערכת.</p>
                                </div>
                            ) : (
                                history.map(s => {
                                    const sessionExercises = exercises.filter(ex => ex.session_id === s.id);
                                    const attempts = sessionExercises.flatMap(ex => ex.exercise_attempts || []);
                                    const isCompleted = sessionExercises.length > 0 && sessionExercises.every(ex => (ex.exercise_attempts?.length || 0) > 0);
                                    const isInProgress = !isCompleted && attempts.length > 0;

                                    const score = attempts.length > 0
                                        ? Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100)
                                        : 0;

                                    return (
                                        <SessionPortalItem
                                            key={`${s.id}-${refreshKey}`}
                                            s={s}
                                            mats={materials.filter(m => m.session_id === s.id)}
                                            hasExercises={sessionExercises.length > 0}
                                            isCompleted={isCompleted}
                                            isInProgress={isInProgress}
                                            score={score}
                                            onStartPractice={() => {
                                                setActiveSessionId(s.id);
                                                setShowPractice(true);
                                            }}
                                            type="history"
                                        />
                                    );
                                })
                            )}
                        </section>
                    </main>

                    <aside>
                        <div className="portal-sidebar-card">
                            <h3 className="portal-section-title">
                                <FileText size={20} className="text-primary" />
                                חומרי עזר כלליים
                            </h3>
                            {generalMaterials.length === 0 ? (
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>טרם הועלו חומרים כלליים.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {generalMaterials.map(m => (
                                        <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="material-chip" style={{ borderRadius: 'var(--radius-md)', width: '100%' }}>
                                            <ExternalLink size={14} /> {m.file_name}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
                <AIChat />
            </div>
        );
    }

    return (
        <div className="student-login-wrap">
            <div className="student-login-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '50%' }}>
                        <GraduationCap size={40} className="text-primary" />
                    </div>
                </div>
                <h2>פורטל התלמיד</h2>
                <p className="text-secondary">היכנסו עם הפרטים שקיבלתם מהמורה.</p>
                <form onSubmit={handleLogin} className="form-group" style={{ gap: '1rem', marginTop: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="שם משתמש" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} required className="input" />
                        <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input type="password" placeholder="סיסמה" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required className="input" />
                        <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                        {loading ? 'מתחבר...' : 'כניסה לפורטל'}
                    </button>
                    {error && (
                        <div className="status-message error" style={{ marginTop: '1rem' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

function SessionPortalItem({ s, mats, hasExercises, isCompleted, isInProgress, score, onStartPractice, type }: { s: Session, mats: Material[], hasExercises: boolean, isCompleted: boolean, isInProgress: boolean, score: number, onStartPractice: () => void, type: 'upcoming' | 'history' }) {
    const dateStr = new Date(s.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="session-portal-card border-right-primary">
            <div className="portal-session-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-info">{type === 'upcoming' ? 'שיעור מתוכנן' : 'שיעור בוצע'}</span>
                    <span style={{ fontWeight: 700 }}>{dateStr}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Clock size={16} /> {timeStr}
                </div>
            </div>
            <div className="portal-session-body">
                <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={14} /> מה {type === 'upcoming' ? 'נלמד' : 'למדנו'}:
                    </h4>
                    <p style={{ lineHeight: 1.6 }}>{s.summary || 'טרם הועלה סיכום לשיעור זה.'}</p>
                </div>

                {s.homework && (
                    <div className="homework-box" style={{ marginBottom: hasExercises ? '1.5rem' : '0' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>🏠 משימות לבית:</h4>
                        <p>{s.homework}</p>
                    </div>
                )}

                {hasExercises && (
                    <div className="practice-box" style={{
                        background: isCompleted ? '#f0fdf4' : (isInProgress ? '#fffbeb' : 'var(--primary-light)'),
                        padding: '1rem',
                        borderRadius: '12px',
                        marginTop: '1rem',
                        border: isCompleted ? '1px solid #10b981' : (isInProgress ? '1px solid #f59e0b' : '1px solid var(--primary)')
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: isCompleted ? '#15803d' : (isInProgress ? '#b45309' : 'var(--primary)'),
                                    marginBottom: '0.25rem'
                                }}>
                                    {isCompleted ? `🎉 תרגול הושלם! ציון: ${score}` : (isInProgress ? '⏳ התחלת לתרגל! (ממתין לסיום)' : '📝 מחכה לך תרגול לשיעור זה!')}
                                </h4>
                                <p style={{ fontSize: '0.85rem', margin: 0 }}>
                                    {isCompleted ? 'התרגול הושלם בהצלחה! ניתן לצפות בתשובות שלך.' : (isInProgress ? 'נשאר לך עוד קצת כדי לסיים את כל המשימות.' : 'המורה הכינה תרגילים המבוססים על מה שלמדנו היום.')}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {isCompleted ? (
                                    <button onClick={onStartPractice} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                        <CheckCircle size={14} /> צפייה בתוצאות
                                    </button>
                                ) : (
                                    <button onClick={onStartPractice} className={`btn ${isInProgress ? 'btn-primary' : 'btn-primary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                        <BookOpen size={14} /> {isInProgress ? 'המשך תרגול' : 'התחל תרגול'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {mats.length > 0 && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>📎 חומרי למידה מהשיעור:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {mats.map(m => (
                                <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="material-chip">
                                    <ExternalLink size={14} /> {m.file_name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

