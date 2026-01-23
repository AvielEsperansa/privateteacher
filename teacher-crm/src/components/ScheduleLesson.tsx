import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import '../styles/ScheduleLesson.css';

interface Student {
    id: string;
    full_name: string;
}

export default function ScheduleLesson() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [repeatMode] = useState<'once' | '4weeks' | '8weeks'>('once');
    const [freeSlots, setFreeSlots] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        student_id: '',
        scheduled_at: '',
        duration_minutes: '60',
        summary: '',
        homework: ''
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('students').select('id, full_name').eq('teacher_id', user.id).order('full_name');
        if (data) setStudents(data);
    };

    const fetchFreeSlots = async (selectedDateStr: string) => {
        if (!selectedDateStr) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const date = new Date(selectedDateStr);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

        const { data: daySessions } = await supabase
            .from('sessions')
            .select('scheduled_at, duration_minutes')
            .eq('teacher_id', user.id)
            .gte('scheduled_at', startOfDay)
            .lte('scheduled_at', endOfDay)
            .neq('status', 'canceled');

        const slots = [];
        const now = new Date();
        const isToday = new Date(selectedDateStr).toDateString() === now.toDateString();

        for (let h = 8; h <= 21; h++) {
            const slotTime = new Date(new Date(selectedDateStr).setHours(h, 0, 0, 0));

            // אם זה היום, אל תציג שעות שכבר עברו
            if (isToday && slotTime < now) continue;

            const slotEnd = new Date(slotTime.getTime() + parseInt(formData.duration_minutes) * 60000);

            const isBusy = daySessions?.some(s => {
                const sStart = new Date(s.scheduled_at);
                const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                return (slotTime < sEnd && slotEnd > sStart);
            });

            if (!isBusy) {
                slots.push(slotTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
            }
        }
        setFreeSlots(slots.slice(0, 8));
    };

    const findNextAvailable = async (startTime: Date, duration: number, teacherId: string) => {
        let checkTime = new Date(startTime.getTime() + 30 * 60000);
        const now = new Date();
        if (checkTime < now) {
            checkTime = new Date(now.getTime() + 15 * 60000);
        }
        const limitDays = 7;
        const endLimit = new Date(startTime.getTime() + limitDays * 24 * 60 * 60000);

        const { data: allSessions } = await supabase
            .from('sessions')
            .select('scheduled_at, duration_minutes')
            .eq('teacher_id', teacherId)
            .gte('scheduled_at', startTime.toISOString())
            .lte('scheduled_at', endLimit.toISOString())
            .neq('status', 'canceled');

        while (checkTime < endLimit) {
            const hour = checkTime.getHours();
            if (hour < 8 || hour >= 22) {
                checkTime.setHours(8, 0, 0, 0);
                checkTime.setDate(checkTime.getDate() + 1);
                continue;
            }

            const checkEnd = new Date(checkTime.getTime() + duration * 60000);
            const isBusy = allSessions?.some(s => {
                const sStart = new Date(s.scheduled_at);
                const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                return (checkTime < sEnd && checkEnd > sStart);
            });

            if (!isBusy) return checkTime;
            checkTime = new Date(checkTime.getTime() + 15 * 60000);
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('עליך להיות מחובר');

            const startDate = new Date(formData.scheduled_at);
            if (startDate < new Date()) {
                throw new Error('לא ניתן לקבוע שיעור בזמן שכבר עבר');
            }
            const duration = parseInt(formData.duration_minutes);
            const repeatCount = repeatMode === '4weeks' ? 4 : (repeatMode === '8weeks' ? 8 : 1);

            for (let i = 0; i < repeatCount; i++) {
                const sessionDate = new Date(startDate);
                sessionDate.setDate(startDate.getDate() + (i * 7));

                const endTime = new Date(sessionDate.getTime() + duration * 60000);
                const { data: conflicts } = await supabase
                    .from('sessions')
                    .select('scheduled_at, duration_minutes, students(full_name)')
                    .eq('teacher_id', user.id)
                    .neq('status', 'canceled');

                const conflict = conflicts?.find(s => {
                    const sStart = new Date(s.scheduled_at);
                    const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                    return (sessionDate < sEnd && endTime > sStart);
                });

                if (conflict) {
                    const nextFree = await findNextAvailable(sessionDate, duration, user.id);
                    const studentName = (conflict.students as any)?.full_name || 'תלמיד אחר';
                    const nextStr = nextFree ? ` האופציה הפנויה הבאה היא ב-${nextFree.toLocaleDateString('he-IL')} בשעה ${nextFree.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : '';
                    throw new Error(`חפיפת שיעורים ב-${new Date(conflict.scheduled_at).toLocaleDateString('he-IL')}! ${studentName} כבר רשום בשעה זו.${nextStr}`);
                }
            }

            const sessionsToInsert = Array.from({ length: repeatCount }).map((_, i) => {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + (i * 7));
                return {
                    teacher_id: user.id,
                    student_id: formData.student_id,
                    scheduled_at: d.toISOString(),
                    duration_minutes: duration,
                    summary: formData.summary,
                    homework: formData.homework,
                    status: 'scheduled'
                };
            });

            await supabase.from('sessions').insert(sessionsToInsert);
            setMessage('השיעורים נקבעו בהצלחה!');
            setFormData({ student_id: '', scheduled_at: '', duration_minutes: '60', summary: '', homework: '' });
        } catch (error: any) {
            setMessage('error:' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="schedule-lesson-container">
            <h2>
                <Calendar size={24} className="text-primary" />
                קביעת שיעור חדש
            </h2>
            <form onSubmit={handleSubmit} className="schedule-form">
                <div className="form-group">
                    <label className="form-label">בחרי תלמיד:</label>
                    <select required value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input">
                        <option value="">-- בחרי מהרשימה --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">תאריך:</label>
                        <input
                            type="date"
                            required
                            onChange={(e) => {
                                fetchFreeSlots(e.target.value);
                                const currentHour = formData.scheduled_at.split('T')[1] || '08:00';
                                setFormData({ ...formData, scheduled_at: `${e.target.value}T${currentHour}` });
                            }}
                            className="input"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">שעות פנויות מומלצות:</label>
                    <div className="free-slots-chips">
                        {freeSlots.length > 0 ? freeSlots.map(time => (
                            <button
                                key={time}
                                type="button"
                                className="time-chip"
                                onClick={() => {
                                    const [h, m] = time.split(':');
                                    const d = new Date(formData.scheduled_at || new Date());
                                    d.setHours(parseInt(h), parseInt(m), 0, 0);
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const hours = String(d.getHours()).padStart(2, '0');
                                    const minutes = String(d.getMinutes()).padStart(2, '0');
                                    setFormData({ ...formData, scheduled_at: `${year}-${month}-${day}T${hours}:${minutes}` });
                                }}
                            >
                                {time}
                            </button>
                        )) : <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>בחרי תאריך כדי לראות מתי את פנויה</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">זמן מדויק:</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="datetime-local"
                            required
                            value={formData.scheduled_at}
                            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                            className="input"
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    {loading ? 'בודק חפיפות...' : 'קבע שיעור במערכת'}
                </button>
                {message && (
                    <p className={`status-message ${message.startsWith('error') ? 'error' : 'success'}`}>
                        {message.startsWith('error') ? <AlertCircle size={16} /> : <Check size={16} />}
                        {message.replace('error:', '')}
                    </p>
                )}
            </form>
        </div>
    );
}

