import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/ScheduleLesson.css';

interface Student {
    id: string;
    full_name: string;
    price_per_lesson: number;
}

export default function ScheduleLesson() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        student_id: '',
        lesson_date: '',
        duration_minutes: '60',
        notes: '',
        price: '0'
    });

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('id, full_name, price_per_lesson');
            if (data) setStudents(data);
        };
        fetchStudents();
    }, []);

    const handleStudentChange = (id: string) => {
        const student = students.find(s => s.id === id);
        setFormData({
            ...formData,
            student_id: id,
            price: student ? student.price_per_lesson.toString() : '0'
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {

            const localDate = new Date(formData.lesson_date).toISOString();

            const { error } = await supabase
                .from('lessons')
                .insert([
                    {
                        student_id: formData.student_id,
                        lesson_date: localDate,
                        duration_minutes: parseInt(formData.duration_minutes),
                        notes: formData.notes,
                        price: parseFloat(formData.price) || 0
                    }
                ]);

            if (error) throw error;

            setMessage('השיעור נקבע בהצלחה! 📅');
            setFormData({ student_id: '', lesson_date: '', duration_minutes: '60', notes: '', price: '0' });
        } catch (error: any) {
            setMessage('שגיאה: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="schedule-lesson-container">
            <h2>קביעת שיעור חדש</h2>
            <form onSubmit={handleSubmit} className="lesson-form">
                <div className="input-group">
                    <label>בחר תלמיד:</label>
                    <select
                        required
                        value={formData.student_id}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        className="select-field"
                    >
                        <option value="">-- בחר תלמיד מהרשימה --</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.full_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label>תאריך ושעה:</label>
                    <input
                        type="datetime-local"
                        required
                        value={formData.lesson_date}
                        onChange={(e) => setFormData({ ...formData, lesson_date: e.target.value })}
                        className="date-input"
                    />
                </div>

                <div className="input-group">
                    <label>משך שיעור (דקות):</label>
                    <input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        className="input-field"
                    />
                </div>

                <div className="input-group">
                    <label>מחיר לשיעור זה (₪):</label>
                    <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="input-field"
                    />
                </div>

                <div className="input-group">
                    <label>הערות לשיעור (למורה):</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="input-field"
                        placeholder="מה נלמד בשיעור?"
                        style={{ minHeight: '80px', resize: 'vertical', padding: '10px' }}
                    />
                </div>

                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'קובע שיעור...' : 'קבע שיעור במערכת'}
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
