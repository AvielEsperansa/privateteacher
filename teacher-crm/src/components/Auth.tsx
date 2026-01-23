import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GraduationCap, Mail, Lock, User, LogIn, UserPlus as UserPlusIcon } from 'lucide-react';
import '../styles/Auth.css';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        confirmPassword: ''
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email.trim(),
                password: formData.password.trim(),
            });

            if (error) throw error;

            if (data.user) {
                setMessage('התחברת בהצלחה! 🎉');
                window.location.reload();
            }
        } catch (error: any) {
            setMessage('שגיאה בהתחברות: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const cleanEmail = formData.email.trim();
        const cleanPassword = formData.password.trim();

        if (cleanPassword !== formData.confirmPassword.trim()) {
            setMessage('הסיסמאות אינן תואמות');
            setLoading(false);
            return;
        }

        if (cleanPassword.length < 6) {
            setMessage('הסיסמה חייבת להכיל לפחות 6 תווים');
            setLoading(false);
            return;
        }

        try {
            // בדיקה אם המייל כבר רשום בטבלת המורים באמצעות פונקציה מאובטחת
            const { data: emailExists, error: checkError } = await supabase
                .rpc('check_teacher_email_exists', { email_to_check: cleanEmail });

            if (checkError) throw checkError;

            if (emailExists) {
                setMessage('שגיאה: האימייל הזה כבר רשום במערכת');
                setLoading(false);
                return;
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: cleanPassword,
                options: {
                    data: {
                        full_name: formData.fullName
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                setMessage('נרשמת בהצלחה! כעת תוכל להתחבר 🎉');
                setTimeout(() => {
                    setIsLogin(true);
                    setFormData({ email: formData.email, password: '', fullName: '', confirmPassword: '' });
                }, 2000);
            }
        } catch (error: any) {
            setMessage('שגיאה בהרשמה: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <GraduationCap size={48} color="#4f46e5" />
                    </div>
                    <h1>מורהפרטי</h1>
                    <p>{isLogin ? 'ברוכים השבים! התחברו כדי לנהל את השיעורים שלכם.' : 'הצטרפו לקהילת המורים הפרטיים שלנו.'}</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={isLogin ? 'active' : ''}
                        onClick={() => {
                            setIsLogin(true);
                            setMessage('');
                        }}
                    >
                        <LogIn size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
                        התחברות
                    </button>
                    <button
                        className={!isLogin ? 'active' : ''}
                        onClick={() => {
                            setIsLogin(false);
                            setMessage('');
                        }}
                    >
                        <UserPlusIcon size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
                        הרשמה
                    </button>
                </div>

                <form onSubmit={isLogin ? handleLogin : handleSignup} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">שם מלא:</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    required
                                    placeholder="שם המורה"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="input"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">אימייל:</label>
                        <input
                            type="email"
                            required
                            placeholder="teacher@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">סיסמה:</label>
                        <input
                            type="password"
                            required
                            placeholder="לפחות 6 תווים"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input"
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">אימות סיסמה:</label>
                            <input
                                type="password"
                                required
                                placeholder="הקלד את הסיסמה שוב"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="input"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        {loading ? 'מעבד...' : (isLogin ? 'התחבר למערכת' : 'צור חשבון חדש')}
                    </button>

                    {message && (
                        <p className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
                            {message}
                        </p>
                    )}
                </form>

                <div className="auth-footer">
                    <p>🔒 כל הנתונים שלכם מאובטחים ומוצפנים מקצה לקצה.</p>
                </div>
            </div>
        </div>
    );
}

