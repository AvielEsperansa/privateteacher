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

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage('שגיאה בהתחברות עם גוגל: ' + error.message);
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

                <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    className="google-auth-btn"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 1.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>{isLogin ? 'התחברות עם גוגל' : 'הרשמה עם גוגל'}</span>
                </button>

                <div className="auth-divider">
                    <span>או</span>
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

