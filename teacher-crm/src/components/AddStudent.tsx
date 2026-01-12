import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/AddStudent.css';

export default function AddStudent() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // מצב עבור השדות בטופס
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        subject: '',
        price_per_lesson: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // שליחת הנתונים ל-Supabase
            const { error } = await supabase
                .from('students')
                .insert([
                    {
                        full_name: formData.full_name,
                        phone: formData.phone,
                        subject: formData.subject,
                        price_per_lesson: parseFloat(formData.price_per_lesson) || 0
                    }
                ]);

            if (error) throw error;

            setMessage('התלמיד נוסף בהצלחה! 🎉');
            // איפוס הטופס
            setFormData({ full_name: '', phone: '', subject: '', price_per_lesson: '' });
        } catch (error: any) {
            setMessage('שגיאה: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-student-container">
            <h2>הוספת תלמיד חדש</h2>
            <form onSubmit={handleSubmit} className="student-form">
                <div className="input-group">
                    <label>שם מלא:</label>
                    <input
                        type="text"
                        required
                        placeholder="ישראל ישראלי"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="input-field"
                    />
                </div>

                <div className="input-group">
                    <label>טלפון:</label>
                    <input
                        type="text"
                        placeholder="050-0000000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field"
                    />
                </div>

                <div className="input-group">
                    <label>מקצוע לימוד:</label>
                    <input
                        type="text"
                        placeholder="מתמטיקה, אנגלית וכו'"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="input-field"
                    />
                </div>

                <div className="input-group">
                    <label>מחיר לשיעור:</label>
                    <input
                        type="number"
                        placeholder="שקלים לשיעור"
                        value={formData.price_per_lesson}
                        onChange={(e) => setFormData({ ...formData, price_per_lesson: e.target.value })}
                        className="input-field"
                    />
                </div>

                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'שומר נתונים...' : 'שלח והוסף תלמיד'}
                </button>

                {message && (
                    <p className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
