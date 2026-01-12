import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/StudentProfile.css';

interface Student {
    id: string;
    full_name: string;
    notes: string;
}

interface Lesson {
    id: string;
    lesson_date: string;
    notes: string;
    is_paid: boolean;
}

interface Material {
    id: string;
    file_name: string;
    file_url: string;
    lesson_id?: string;
    created_at: string;
}

interface Props {
    studentId: string;
    selectedLessonId?: string;
    onClose: () => void;
}

export default function StudentProfile({ studentId, selectedLessonId, onClose }: Props) {
    const [student, setStudent] = useState<Student | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [newNote, setNewNote] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [tempLessonNote, setTempLessonNote] = useState('');

    // רפרנסים לשורות השיעורים כדי שנוכל לגלול אליהן
    const lessonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    useEffect(() => {
        fetchProfileData();
    }, [studentId]);

    // אפקט לטיפול בגלילה ופתיחת שיעור ספציפי אם הועבר כזה
    useEffect(() => {
        if (selectedLessonId && lessons.length > 0) {
            const lesson = lessons.find(l => l.id === selectedLessonId);
            if (lesson) {
                // פתיחת מצב עריכה לשיעור הספציפי
                setEditingLessonId(selectedLessonId);
                setTempLessonNote(lesson.notes || '');

                // המתנה קלה כדי שהממשק יתעדכן ואז גלילה
                setTimeout(() => {
                    const el = lessonRefs.current[selectedLessonId];
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // הדגשה זמנית כדי שהמשתמש יראה איפה הוא
                        el.style.backgroundColor = '#f8fafc';
                        el.style.border = '2px solid #2d3748';
                    }
                }, 500);
            }
        }
    }, [selectedLessonId, lessons]);

    const fetchProfileData = async () => {
        const { data: s } = await supabase.from('students').select('*').eq('id', studentId).single();
        if (s) {
            setStudent(s);
            setNewNote(s.notes || '');
        }

        const { data: h } = await supabase.from('lessons').select('*').eq('student_id', studentId).order('lesson_date', { ascending: false });
        if (h) setLessons(h || []);

        const { data: m } = await supabase.from('materials').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
        if (m) setMaterials(m || []);
    };

    const handleUpdateNotes = async () => {
        await supabase.from('students').update({ notes: newNote }).eq('id', studentId);
        alert('הערה כללית נשמרה!');
    };

    const handleSaveLessonNote = async (lessonId: string) => {
        const { error } = await supabase
            .from('lessons')
            .update({ notes: tempLessonNote })
            .eq('id', lessonId);

        if (!error) {
            setEditingLessonId(null);
            fetchProfileData();
        }
    };

    const togglePayment = async (lessonId: string, currentStatus: boolean) => {
        await supabase.from('lessons').update({ is_paid: !currentStatus }).eq('id', lessonId);
        fetchProfileData();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, lessonId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(lessonId || 'general');
        try {
            const fileExt = file.name.split('.').pop();
            const cleanFileName = `file_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('materials')
                .upload(cleanFileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw new Error(uploadError.message);

            const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(cleanFileName);

            const { error: dbError } = await supabase.from('materials').insert([{
                student_id: studentId,
                lesson_id: lessonId,
                file_name: file.name,
                file_url: publicUrl
            }]);

            if (dbError) throw dbError;

            fetchProfileData();
        } catch (error: any) {
            console.error('Upload catch error:', error);
            alert('שגיאת העלאה: ' + (error.message || 'לא ידועה'));
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    };

    if (!student) return null;

    return (
        <div className="student-profile-overlay">
            <div className="student-profile-card">
                <button onClick={onClose} className="close-btn">סגור X</button>
                <h1 style={{ color: '#1a1a1a', marginBottom: '5px' }}>{student.full_name}</h1>
                <p style={{ color: '#666', marginBottom: '20px' }}>ניהול תיק אישי ומעקב שיעורים</p>

                <section className="profile-section">
                    <h3>✍️ הערות כלליות</h3>
                    <textarea
                        className="notes-area"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="מידע חשוב על התלמיד..."
                    />
                    <button onClick={handleUpdateNotes} className="submit-button" style={{ marginTop: '10px', width: 'auto', padding: '10px 25px' }}>שמור הערה כללית</button>
                </section>

                <section className="profile-section">
                    <h3>🕒 יומן למידה (סיכומי שיעורים ותרגול)</h3>
                    <div style={{ marginTop: '15px' }}>
                        {lessons.length === 0 ? <p>טרם נקבעו שיעורים.</p> : lessons.map(l => {
                            const lessonMaterials = materials.filter(m => m.lesson_id === l.id);

                            return (
                                <div
                                    key={l.id}
                                    ref={el => { lessonRefs.current[l.id] = el; }}
                                    className={`history-item ${editingLessonId === l.id ? 'highlight-lesson' : ''}`}
                                    style={{
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '20px',
                                        background: '#fff',
                                        border: editingLessonId === l.id ? '2px solid #2d3748' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        marginBottom: '15px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#2d3748' }}>
                                            📅 {new Date(l.lesson_date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button
                                            onClick={() => togglePayment(l.id, l.is_paid)}
                                            style={{ background: l.is_paid ? '#c6f6d5' : '#fed7d7', border: 'none', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                        >
                                            {l.is_paid ? '✅ שולם' : '💰 לסמן כשולם'}
                                        </button>
                                    </div>

                                    <div style={{
                                        width: '100%',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #edf2f7',
                                        overflow: 'hidden'
                                    }}>
                                        <div
                                            onClick={() => { if (editingLessonId !== l.id) { setEditingLessonId(l.id); setTempLessonNote(l.notes || ''); } }}
                                            style={{
                                                padding: '20px',
                                                cursor: editingLessonId === l.id ? 'default' : 'pointer',
                                                minHeight: '80px',
                                                borderBottom: '1px solid #edf2f7'
                                            }}
                                        >
                                            {editingLessonId === l.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    <textarea
                                                        className="notes-area"
                                                        style={{ minHeight: '80px', margin: 0, width: '100%', background: '#fff' }}
                                                        value={tempLessonNote}
                                                        onChange={(e) => setTempLessonNote(e.target.value)}
                                                        autoFocus
                                                        placeholder="מה עשינו בשיעור? מה המטלות לבית?"
                                                    />
                                                    <div style={{ display: 'flex', gap: '15px' }}>
                                                        <button onClick={() => handleSaveLessonNote(l.id)} className="submit-button" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>שמור סיכום</button>
                                                        <button onClick={() => setEditingLessonId(null)} className="back-to-login" style={{ margin: 0, padding: 0, fontSize: '0.9rem' }}>ביטול</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {l.notes ? (
                                                        <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6', color: '#2d3748' }}>{l.notes}</p>
                                                    ) : (
                                                        <p style={{ margin: 0, color: '#a0aec0', fontSize: '1rem', fontStyle: 'italic' }}>➕ לחצי כאן כדי לכתוב סיכום שיעור ותרגול לבית...</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '15px 20px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {lessonMaterials.map(m => (
                                                        <a
                                                            key={m.id}
                                                            href={m.file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                background: '#f1f5f9',
                                                                padding: '6px 14px',
                                                                borderRadius: '20px',
                                                                textDecoration: 'none',
                                                                color: '#2d3748',
                                                                border: '1px solid #e2e8f0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                fontWeight: '500'
                                                            }}
                                                        >
                                                            📄 {m.file_name}
                                                        </a>
                                                    ))}
                                                    {uploading === l.id && <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>מעלה קובץ...</span>}
                                                </div>

                                                <label style={{
                                                    fontSize: '0.9rem',
                                                    color: '#2d3748',
                                                    cursor: 'pointer',
                                                    fontWeight: '700',
                                                    padding: '8px 16px',
                                                    borderRadius: '10px',
                                                    background: '#fff',
                                                    border: '1px solid #cbd5e0',
                                                    whiteSpace: 'nowrap',
                                                    marginLeft: 'auto'
                                                }}>
                                                    📎 הוסף קובץ
                                                    <input
                                                        type="file"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => handleFileUpload(e, l.id)}
                                                        disabled={uploading === l.id}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="profile-section">
                    <h3>📂 חומרים כלליים</h3>
                    <div className="upload-section">
                        <input type="file" onChange={(e) => handleFileUpload(e)} disabled={uploading === 'general'} />
                        {uploading === 'general' && <p>מעלה קובץ...</p>}
                    </div>
                    <div style={{ marginTop: '15px' }}>
                        {materials.filter(m => !m.lesson_id).map(m => (
                            <div key={m.id} className="material-item">
                                <span>📄 {m.file_name}</span>
                                <a href={m.file_url} target="_blank" rel="noreferrer" className="download-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>צפייה</a>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
