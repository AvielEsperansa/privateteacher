import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/AddStudent.css';

export default function AddStudent() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        grade: '',
        subject: 'מתמטיקה', // ברירת מחדל
        level: '',
        notes: '',
        username: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('עליך להיות מחובר');

            const { error } = await supabase
                .from('students')
                .insert([
                    {
                        teacher_id: user.id,
                        full_name: formData.full_name.trim(),
                        phone_number: formData.phone_number.trim(),
                        email: formData.email.trim() || null,
                        grade: formData.grade.trim() || null,
                        subject: formData.subject.trim(),
                        level: formData.level.trim() || null,
                        notes: formData.notes.trim() || null,
                        username: formData.username.trim().toLowerCase(),
                        password: formData.password.trim()
                    }
                ]);

            if (error) {
                if (error.code === '23505') throw new Error('שם המשתמש כבר תפוס');
                throw error;
            }

            setMessage('התלמיד נוסף בהצלחה!');
            setFormData({ full_name: '', phone_number: '', email: '', grade: '', subject: 'מתמטיקה', level: '', notes: '', username: '', password: '' });
        } catch (error: any) {
            setMessage('שגיאה: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-student-container">
            <h2>➕ תלמיד חדש</h2>
            <form onSubmit={handleSubmit} className="student-form">
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                        <label>שם מלא:</label>
                        <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input-field" />
                    </div>
                    <div className="input-group">
                        <label>מספר טלפון (לוואטסאפ):</label>
                        <input type="text" placeholder="למשל: 0521234567" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="input-field" />
                    </div>
                </div>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                        <label>מקצוע לימוד:</label>
                        <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input-field">
                            <option value="מתמטיקה">מתמטיקה</option>
                            <option value="אנגלית">אנגלית</option>
                            <option value="לשון">לשון</option>
                            <option value="מדעים">מדעים</option>
                            <option value="אחר">אחר</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>כיתה:</label>
                        <input type="text" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input-field" />
                    </div>
                </div>

                <div className="credentials-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', margin: '15px 0', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>🔐 גישה לאזור האישי</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" required placeholder="שם משתמש" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input-field" />
                        <input type="text" required placeholder="סיסמה" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input-field" />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="submit-button">שמור תלמיד</button>
                {message && <p className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>{message}</p>}
            </form>
        </div>
    );
}
