import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserPlus, ShieldCheck } from 'lucide-react';
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
        password: '',
        hourly_rate: '120'
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
                        password: formData.password.trim(),
                        hourly_rate: parseInt(formData.hourly_rate) || 120
                    }
                ]);

            if (error) {
                if (error.code === '23505') throw new Error('שם המשתמש כבר תפוס');
                throw error;
            }

            setMessage('התלמיד נוסף בהצלחה!');
            setFormData({ full_name: '', phone_number: '', email: '', grade: '', subject: 'מתמטיקה', level: '', notes: '', username: '', password: '', hourly_rate: '120' });
        } catch (error: any) {
            setMessage('שגיאה: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-student-container">
            <h2>
                <UserPlus size={24} className="text-primary" />
                תלמיד חדש
            </h2>
            <form onSubmit={handleSubmit} className="student-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">שם מלא:</label>
                        <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input" placeholder="שם מלא של התלמיד" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">מספר טלפון:</label>
                        <input type="text" placeholder="למשל: 0521234567" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="input" />
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">מקצוע לימוד:</label>
                        <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input">
                            <option value="מתמטיקה">מתמטיקה</option>
                            <option value="אנגלית">אנגלית</option>
                            <option value="לשון">לשון</option>
                            <option value="מדעים">מדעים</option>
                            <option value="אחר">אחר</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">מחיר לשעה (₪):</label>
                        <input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="input" placeholder="120" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">כיתה:</label>
                        <input type="text" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input" placeholder="למשל: יב" />
                    </div>
                </div>

                <div className="credentials-section">
                    <h4>
                        <ShieldCheck size={18} style={{ verticalAlign: 'middle', marginLeft: '8px' }} />
                        גישה למערכת תלמיד
                    </h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <input type="text" required placeholder="שם משתמש" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input" />
                        </div>
                        <div className="form-group">
                            <input type="text" required placeholder="סיסמה" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                    {loading ? 'שומר...' : 'שמור תלמיד'}
                </button>
                {message && <p className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>{message}</p>}
            </form>
        </div>
    );
}

