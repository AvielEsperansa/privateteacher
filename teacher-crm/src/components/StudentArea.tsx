import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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

            if (sError || !s) {
                throw new Error('שם המשתמש או הסיסמה אינם נכונים.');
            }

            setStudent(s);

            const { data: sess } = await supabase
                .from('sessions')
                .select('*')
                .eq('student_id', s.id)
                .order('scheduled_at', { ascending: false });

            const { data: mats } = await supabase
                .from('materials')
                .select('*')
                .eq('student_id', s.id);

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
            <div className="student-area-dashboard">
                <header className="student-header">
                    <div className="welcome-text">
                        <h1>שלום, {student.full_name}! 👋</h1>
                        <p>כאן תמצאי את כל מה שאת צריכה ללימודים: שיעורים, סיכומים ודפי עבודה.</p>
                    </div>
                    <button onClick={() => setStudent(null)} className="back-to-login">יציאה מהחשבון</button>
                </header>

                <div className="student-content-layout">
                    <div className="main-sessions">
                        <section className="student-section">
                            <h3 className="section-title">📅 השיעורים הקרובים שלי</h3>
                            {upcoming.length === 0 ? (
                                <div className="no-data-card">אין כרגע שיעורים עתידיים.</div>
                            ) : (
                                <div className="sessions-list">
                                    {upcoming.map(s => (
                                        <SessionItem key={s.id} s={s} mats={materials.filter(m => m.session_id === s.id)} type="upcoming" />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="student-section" style={{ marginTop: '40px' }}>
                            <h3 className="section-title">📚 היסטוריית למידה וסיכומים</h3>
                            {history.length === 0 ? (
                                <div className="no-data-card">טרם בוצעו שיעורים.</div>
                            ) : (
                                <div className="sessions-list">
                                    {history.map(s => (
                                        <SessionItem key={s.id} s={s} mats={materials.filter(m => m.session_id === s.id)} type="history" />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="sidebar-materials">
                        <section className="student-section">
                            <h3 className="section-title">📂 דפי עבודה וחומרים כלליים</h3>
                            <div className="materials-card">
                                {generalMaterials.length === 0 ? <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>טרם הועלו חומרים כלליים.</p> : (
                                    <div className="general-mats-list">
                                        {generalMaterials.map(m => (
                                            <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="mat-item-link">
                                                📄 {m.file_name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        );
    }

    return (
        <div className="student-login-container">
            <div className="student-login-card">
                <h2>🎓 כניסה לאזור התלמיד</h2>
                <p>הזינו את פרטי הגישה שקיבלתם ממורן.</p>
                <form onSubmit={handleLogin} className="student-login-form">
                    <input type="text" placeholder="שם משתמש" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} required className="input-field" />
                    <input type="password" placeholder="סיסמה" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required className="input-field" />
                    <button type="submit" disabled={loading} className="submit-button">{loading ? 'מתחבר...' : 'כניסה לפורטל'}</button>
                    {error && <p className="status-message error">{error}</p>}
                </form>
            </div>
        </div>
    );
}

function SessionItem({ s, mats, type }: { s: Session, mats: Material[], type: 'upcoming' | 'history' }) {
    return (
        <div className={`session-full-card ${type}`}>
            <div className="session-main-info">
                <div className="session-status-badge">{type === 'upcoming' ? 'שיעור קרוב' : 'היה שיעור מצוין'}</div>
                <div className="session-date-time">
                    <span className="date">{new Date(s.scheduled_at).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="time">{new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            <div className="session-details-grid">
                <div className="detail-item">
                    <strong>📝 {type === 'upcoming' ? 'מה נלמד במפגש:' : 'מה למדנו בשיעור:'}</strong>
                    <p>{s.summary || 'אין סיכום עדיין.'}</p>
                </div>
                {s.homework && (
                    <div className="detail-item homework">
                        <strong>🏠 שיעורי בית:</strong>
                        <p>{s.homework}</p>
                    </div>
                )}
                {mats.length > 0 && (
                    <div className="detail-item materials">
                        <strong>📎 דפי עבודה מהשיעור:</strong>
                        <div className="mats-row">
                            {mats.map(m => (
                                <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="mini-mat-link">📄 {m.file_name}</a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
