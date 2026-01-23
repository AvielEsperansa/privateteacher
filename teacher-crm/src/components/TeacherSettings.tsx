import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Shield, Mail, Save, Edit2, Lock, Check, AlertCircle, RefreshCw } from 'lucide-react';
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

    const [passwordData, setPasswordData] = useState({
        old_password: '',
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
            setMessage('success:הפרטים עודכנו בהצלחה! ✨');
            setEditingDetails(false);
            fetchTeacherData();
        } catch (err: any) {
            setMessage('error:' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage('error:הסיסמאות החדשות אינן תואמות');
            return;
        }

        setLoading(true);
        try {
            // בוודא את הסיסמה הישנה על ידי ניסיון התחברות נוסף
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('משתמש לא מחובר');

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordData.old_password,
            });

            if (signInError) {
                throw new Error('הסיסמה הישנה שהזנת אינה נכונה');
            }

            // עדכון לסיסמה החדשה
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.new_password
            });

            if (updateError) throw updateError;

            setMessage('success:הסיסמה שונתה בהצלחה! ✅');
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            setMessage('error:' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-container animate-fade-in">
            <header className="settings-header">
                <h2>הגדרות מנוי</h2>
                <p className="text-secondary">נהלי את חשבון המורה ואת אבטחת המערכת שלך.</p>
            </header>

            <div className="settings-grid">
                <section className="settings-section">
                    <h3>
                        <User size={20} className="text-primary" />
                        פרטים אישיים
                    </h3>

                    {editingDetails ? (
                        <form onSubmit={handleUpdateDetails} className="form-group" style={{ gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">שם המורה מלא:</label>
                                <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ביו / תיאור מקצועי:</label>
                                <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="input" style={{ minHeight: '100px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" disabled={loading} className="btn btn-primary">
                                    <Save size={16} /> שמור שינויים
                                </button>
                                <button type="button" onClick={() => setEditingDetails(false)} className="btn btn-secondary">ביטול</button>
                            </div>
                        </form>
                    ) : (
                        <div className="details-view">
                            <div className="details-row">
                                <label>שם מלא</label>
                                <span>{teacher?.full_name || 'טרם הוגדר'}</span>
                            </div>
                            <div className="details-row">
                                <label>אימייל למערכת</label>
                                <span>{teacher?.email}</span>
                            </div>
                            <div className="details-row">
                                <label>אודות</label>
                                <span style={{ fontSize: '0.875rem' }}>{teacher?.bio || 'אין ביו כרגע'}</span>
                            </div>
                            <button onClick={() => setEditingDetails(true)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                                <Edit2 size={16} /> עריכת פרטים
                            </button>
                        </div>
                    )}
                </section>

                <section className="settings-section">
                    <h3>
                        <Shield size={20} className="text-primary" />
                        אבטחת חשבון
                    </h3>
                    <form onSubmit={handleChangePassword} className="form-group" style={{ gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">סיסמה ישנה:</label>
                            <div style={{ position: 'relative' }}>
                                <input type="password" value={passwordData.old_password} onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })} className="input" required />
                                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">סיסמה חדשה:</label>
                            <input type="password" value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">אימות סיסמה חדשה:</label>
                            <input type="password" value={passwordData.confirm_password} onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="input" required />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 'auto' }}>
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
                            עדכן סיסמה
                        </button>
                    </form>
                </section>
            </div>

            {message && (
                <div className={`status-message ${message.startsWith('error') ? 'error' : 'success'}`} style={{ marginTop: '2rem' }}>
                    {message.startsWith('error') ? <AlertCircle size={18} /> : <Check size={18} />}
                    {message.split(':')[1]}
                </div>
            )}
        </div>
    );
}


