import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/TeacherSettings.css';

export default function TeacherSettings() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [teacher, setTeacher] = useState<any>(null);
    const [editingDetails, setEditingDetails] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        bio: ''
    });

    // שינוי סיסמה (עבור המורה עצמו ב-Auth)
    const [passwordData, setPasswordData] = useState({
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        fetchTeacherData();
    }, []);

    const fetchTeacherData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setTeacher(data);
            setFormData({ full_name: data.full_name || '', bio: data.bio || '' });
        }
    };

    const handleUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('teachers')
                .update({ full_name: formData.full_name, bio: formData.bio })
                .eq('id', teacher.id);
            if (error) throw error;
            setMessage('הפרטים עודכנו בהצלחה! ✨');
            setEditingDetails(false);
            fetchTeacherData();
        } catch (err: any) {
            setMessage('שגיאה: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage('❌ הסיסמאות אינן תואמות');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.new_password
            });
            if (error) throw error;
            setMessage('הסיסמה שונתה בהצלחה! ✅');
            setPasswordData({ new_password: '', confirm_password: '' });
        } catch (err: any) {
            setMessage('שגיאה: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-container">
            <header className="settings-header">
                <h2>⚙️ הגדרות מנהל</h2>
                <p>ניהול החשבון האישי והרשאות המערכת</p>
            </header>

            <div className="settings-grid">
                {/* עדכון פרטים אישיים */}
                <section className="settings-section">
                    <h3>👤 פרטים אישיים</h3>
                    {editingDetails ? (
                        <form onSubmit={handleUpdateDetails} className="settings-form">
                            <div className="input-group">
                                <label>שם המורה:</label>
                                <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label>תיאור מקצועי / ביו:</label>
                                <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-actions">
                                <button type="submit" disabled={loading} className="save-btn">שמור שינויים</button>
                                <button type="button" onClick={() => setEditingDetails(false)} className="cancel-btn">ביטול</button>
                            </div>
                        </form>
                    ) : (
                        <div className="details-view">
                            <p><strong>שם:</strong> {teacher?.full_name}</p>
                            <p><strong>אימייל:</strong> {teacher?.email}</p>
                            <button onClick={() => setEditingDetails(true)} className="edit-btn">עריכת פרטים</button>
                        </div>
                    )}
                </section>

                {/* שינוי סיסמה */}
                <section className="settings-section">
                    <h3>🔐 אבטחת חשבון</h3>
                    <form onSubmit={handleChangePassword} className="settings-form">
                        <div className="input-group">
                            <label>סיסמה חדשה:</label>
                            <input type="password" value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} className="input-field" required />
                        </div>
                        <div className="input-group">
                            <label>אימות סיסמה:</label>
                            <input type="password" value={passwordData.confirm_password} onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="input-field" required />
                        </div>
                        <button type="submit" disabled={loading} className="p-change-btn">עדכן סיסמה</button>
                    </form>
                </section>
            </div>

            {message && <div className={`settings-message ${message.includes('שגיאה') || message.includes('❌') ? 'error' : 'success'}`}>{message}</div>}
        </div>
    );
}
