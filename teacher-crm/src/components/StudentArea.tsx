import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/StudentArea.css';

interface Material {
    id: string;
    file_name: string;
    file_url: string;
    lesson_id?: string;
    created_at: string;
}

interface Lesson {
    id: string;
    lesson_date: string;
    notes: string;
}

export default function StudentArea() {
    const [studentName, setStudentName] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [studentData, setStudentData] = useState<any>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [allLessons, setAllLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data: student, error: sError } = await supabase
                .from('students')
                .select('*')
                .ilike('full_name', `%${studentName}%`)
                .single();

            if (sError || !student) {
                throw new Error('לא מצאנו תלמיד בשם הזה. ודא שהשם מדויק.');
            }

            setStudentData(student);

            const { data: mData } = await supabase
                .from('materials')
                .select('*')
                .eq('student_id', student.id)
                .order('created_at', { ascending: false });

            setMaterials(mData || []);

            const { data: lData } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', student.id)
                .order('lesson_date', { ascending: false });

            setAllLessons(lData || []);
            setIsLoggedIn(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const now = new Date();
    const futureLessons = allLessons.filter(l => new Date(l.lesson_date) > now).reverse();
    const pastLessons = allLessons.filter(l => new Date(l.lesson_date) <= now);

    if (!isLoggedIn) {
        return (
            <div className="student-portal-container" style={{ maxWidth: '450px' }}>
                <div className="student-welcome">
                    <h1>שלום תלמיד! 👋</h1>
                    <p>הכנס את שמך מלא כפי שמופיע אצל המורה</p>
                </div>
                <form onSubmit={handleLogin} className="login-box">
                    <input
                        type="text"
                        placeholder="שם מלא..."
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="input-field"
                        style={{ textAlign: 'center', fontSize: '1.2rem' }}
                        required
                    />
                    <button type="submit" disabled={loading} className="submit-button">כניסה לתיק האישי</button>
                    {error && <p style={{ color: '#e74c3c', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="student-portal-container" style={{ maxWidth: '800px' }}>
            <div className="student-dashboard">
                <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2>היי {studentData.full_name.split(' ')[0]}, כיף שבאת! 🎓</h2>
                    <p>הנה כל מה שאתה צריך לשיעורים שלנו</p>
                </header>

                {/* חלק 1: שיעורים קרובים - עכשיו כולל הצגת קבצים! */}
                <section style={{ marginBottom: '40px' }}>
                    <h3 style={{ borderRight: '4px solid #646cff', paddingRight: '15px', marginBottom: '20px' }}>📅 השיעורים הקרובים שלנו</h3>
                    {futureLessons.length === 0 ? (
                        <div className="dashboard-card"><p>אין כרגע שיעורים מתוכננים.</p></div>
                    ) : (
                        futureLessons.map(l => {
                            const lessonMaterials = materials.filter(m => m.lesson_id === l.id);
                            return (
                                <div key={l.id} className="dashboard-card" style={{ borderRight: '8px solid #2ecc71' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {new Date(l.lesson_date).toLocaleString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {l.notes && <p style={{ color: '#4a5568', margin: '15px 0' }}>💡 <strong>הערה מהמורה:</strong> {l.notes}</p>}

                                    {/* הצגת קבצים גם בשיעור עתידי */}
                                    {lessonMaterials.length > 0 && (
                                        <div style={{ marginTop: '15px', background: '#f0fff4', padding: '10px', borderRadius: '8px', border: '1px dashed #2ecc71' }}>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 'bold' }}>📂 חומר להכנה / תרגול:</p>
                                            {lessonMaterials.map(m => (
                                                <div key={m.id} className="material-link-card" style={{ margin: '5px 0', padding: '8px', background: 'white' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>📄 {m.file_name}</span>
                                                    <a href={m.file_url} target="_blank" rel="noreferrer" className="download-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>פתח</a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </section>

                {/* חלק 2: מה עשינו בשיעורים הקודמים */}
                <section>
                    <h3 style={{ borderRight: '4px solid #f6ad55', paddingRight: '15px', marginBottom: '20px' }}>📚 היסטוריית למידה ותרגול</h3>
                    {pastLessons.map(l => {
                        const lessonMaterials = materials.filter(m => m.lesson_id === l.id);
                        return (
                            <div key={l.id} className="dashboard-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: 'bold' }}>שיעור מיום {new Date(l.lesson_date).toLocaleDateString('he-IL')}</span>
                                </div>
                                <div style={{ marginBottom: '15px', lineHeight: '1.6' }}>
                                    {l.notes || <span style={{ color: '#a0aec0' }}>אין סיכום לשיעור זה.</span>}
                                </div>
                                {lessonMaterials.length > 0 && (
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                                        {lessonMaterials.map(m => (
                                            <div key={m.id} className="material-link-card" style={{ margin: '5px 0' }}>
                                                <span>📄 {m.file_name}</span>
                                                <a href={m.file_url} target="_blank" rel="noreferrer" className="download-btn">צפייה</a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>

                <button onClick={() => setIsLoggedIn(false)} className="back-to-login" style={{ marginTop: '40px' }}>↩️ יציאה מהתיק האישי</button>
            </div>
        </div>
    );
}
