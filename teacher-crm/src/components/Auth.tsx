import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>🎓 מערכת ניהול תלמידים</h1>
                    <p>{isLogin ? 'התחברות למורים' : 'הרשמה למורה חדש'}</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={isLogin ? 'active' : ''}
                        onClick={() => {
                            setIsLogin(true);
                            setMessage('');
                        }}
                    >
                        התחברות
                    </button>
                    <button
                        className={!isLogin ? 'active' : ''}
                        onClick={() => {
                            setIsLogin(false);
                            setMessage('');
                        }}
                    >
                        הרשמה
                    </button>
                </div>

                <form onSubmit={isLogin ? handleLogin : handleSignup} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <label>שם מלא:</label>
                            <input
                                type="text"
                                required
                                placeholder="שם המורה"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>אימייל:</label>
                        <input
                            type="email"
                            required
                            placeholder="teacher@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <label>סיסמה:</label>
                        <input
                            type="password"
                            required
                            placeholder="לפחות 6 תווים"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input-field"
                        />
                    </div>

                    {!isLogin && (
                        <div className="input-group">
                            <label>אימות סיסמה:</label>
                            <input
                                type="password"
                                required
                                placeholder="הקלד את הסיסמה שוב"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? 'מעבד...' : (isLogin ? 'התחבר' : 'הירשם')}
                    </button>

                    {message && (
                        <p className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
                            {message}
                        </p>
                    )}
                </form>

                <div className="auth-footer">
                    <p style={{ fontSize: '0.85rem', color: '#718096', marginTop: '20px' }}>
                        🔒 הסיסמאות מוצפנות ומאובטחות
                    </p>
                </div>
            </div>
        </div>
    );
}
