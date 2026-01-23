import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GraduationCap, LogOut, Calendar, BookOpen, FileText, CheckCircle, Clock, ExternalLink, User, Lock, AlertCircle } from 'lucide-react';
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

            const { data: sess } = await supabase.from('sessions').select('*').eq('student_id', s.id).order('scheduled_at', { ascending: false });
            const { data: mats } = await supabase.from('materials').select('*').eq('student_id', s.id);

            if (sess) setSessions(sess);
            if (mats) setMaterials(mats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (student) {
        const upcoming = sessions.filter(s => s.status === 'scheduled');
        const history = sessions.filter(s => s.status === 'done');
        const generalMaterials = materials.filter(m => !m.session_id);

        return (
            <div className="student-area-dashboard animate-fade-in">
                <header className="student-portal-header">
                    <div className="student-welcome">
                        <h1>שלום, {student.full_name.split(' ')[0]}! 👋</h1>
                        <p className="text-secondary">כאן נמצאת כל הלמידה שלך - שיעורים, סיכומים וחומרים.</p>
                    </div>
                    <button onClick={() => setStudent(null)} className="btn btn-secondary">
                        <LogOut size={16} /> יציאה
                    </button>
                </header>

                <div className="student-layout">
                    <main>
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
                                upcoming.map(s => <SessionPortalItem key={s.id} s={s} mats={materials.filter(m => m.session_id === s.id)} type="upcoming" />)
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
                                history.map(s => <SessionPortalItem key={s.id} s={s} mats={materials.filter(m => m.session_id === s.id)} type="history" />)
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

function SessionPortalItem({ s, mats, type }: { s: Session, mats: Material[], type: 'upcoming' | 'history' }) {
    const dateStr = new Date(s.scheduled_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="session-portal-card border-right-primary">
            <div className="portal-session-header">
                <div style={{ display: 'flex', items: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-info">{type === 'upcoming' ? 'שיעור מתוכנן' : 'שיעור בוצע'}</span>
                    <span style={{ fontWeight: 700 }}>{dateStr}</span>
                </div>
                <div style={{ display: 'flex', items: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
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
                    <div className="homework-box">
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>🏠 משימות לבית:</h4>
                        <p>{s.homework}</p>
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

