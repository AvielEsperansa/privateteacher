import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import '../styles/LessonList.css';
import StudentProfile from './StudentProfile';

interface Session {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: 'scheduled' | 'done' | 'canceled';
    summary: string;
    homework: string;
    is_paid: boolean;
    student_id: string;
    students: {
        full_name: string;
        phone_number: string;
        subject: string;
    };
}

export default function LessonList() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const fetchSessions = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sessions')
                .select(`
                    id,
                    scheduled_at,
                    duration_minutes,
                    status,
                    summary,
                    homework,
                    is_paid,
                    student_id,
                    students (full_name, phone_number, subject)
                `)
                .eq('teacher_id', user.id);

            if (error) throw error;
            setSessions(data as any || []);
        } catch (error: any) {
            console.error('Error fetching sessions:', error.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // Convert sessions to FullCalendar events
    const events = sessions.map(session => {
        const start = new Date(session.scheduled_at);
        const end = new Date(start.getTime() + session.duration_minutes * 60000);

        let backgroundColor = '#6366f1'; // primary - scheduled
        let borderColor = '#6366f1';

        if (session.status === 'done') {
            backgroundColor = '#10b981'; // green
            borderColor = '#10b981';
        } else if (session.status === 'canceled') {
            backgroundColor = '#ef4444'; // red
            borderColor = '#ef4444';
        }

        if (!session.is_paid && session.status === 'done') {
            borderColor = '#f59e0b'; // orange border for unpaid
        }

        const startTime = new Date(session.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(new Date(session.scheduled_at).getTime() + session.duration_minutes * 60000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        return {
            id: session.id,
            title: `${session.students.full_name} (${startTime}-${endTime})`,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor,
            borderColor,
            extendedProps: {
                student_id: session.student_id,
                subject: session.students.subject,
                status: session.status,
                is_paid: session.is_paid,
                summary: session.summary,
                homework: session.homework,
                phone: session.students.phone_number,
                duration_minutes: session.duration_minutes
            }
        };
    });

    const handleEventClick = (info: any) => {
        setSelectedStudentId(info.event.extendedProps.student_id);
    };

    // Handle dragging event to new time
    const handleEventDrop = async (info: any) => {
        const sessionId = info.event.id;
        const newStart = info.event.start;
        const duration = info.event.extendedProps.duration_minutes || 60;
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for conflicts
            const { data: conflicts } = await supabase
                .from('sessions')
                .select('id, scheduled_at, duration_minutes, students(full_name)')
                .eq('teacher_id', user.id)
                .neq('id', sessionId)
                .neq('status', 'canceled');

            const hasConflict = conflicts?.some(s => {
                const sStart = new Date(s.scheduled_at);
                const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                return (newStart < sEnd && newEnd > sStart);
            });

            if (hasConflict) {
                info.revert();
                alert('חפיפת זמנים! כבר קיים שיעור בשעה הזו.');
                return;
            }

            const toLocalISO = (date: Date) => {
                const pad = (num: number) => String(num).padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
            };

            const { error } = await supabase
                .from('sessions')
                .update({ scheduled_at: toLocalISO(newStart) })
                .eq('id', sessionId);

            if (error) throw error;
            fetchSessions(true); // Silent refresh
        } catch (err) {
            console.error('Error updating session time:', err);
            info.revert(); // revert the change on error
            alert('שגיאה בעדכון מועד השיעור');
        }
    };

    // Handle resizing event (changing duration)
    const handleEventResize = async (info: any) => {
        const sessionId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end;
        const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for conflicts
            const { data: conflicts } = await supabase
                .from('sessions')
                .select('id, scheduled_at, duration_minutes, students(full_name)')
                .eq('teacher_id', user.id)
                .neq('id', sessionId)
                .neq('status', 'canceled');

            // Re-checking conflict logic for resize
            const actualHasConflict = conflicts?.some(s => {
                const sStart = new Date(s.scheduled_at);
                const sEnd = new Date(sStart.getTime() + s.duration_minutes * 60000);
                const resizeStart = new Date(newStart);
                const resizeEnd = new Date(newStart.getTime() + newDuration * 60000);
                return (resizeStart < sEnd && resizeEnd > sStart);
            });

            if (actualHasConflict) {
                info.revert();
                alert('חפיפת זמנים! שינוי משך השיעור עולה על חשבון שיעור אחר.');
                return;
            }

            const toLocalISO = (date: Date) => {
                const pad = (num: number) => String(num).padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
            };

            const { error } = await supabase
                .from('sessions')
                .update({
                    scheduled_at: toLocalISO(newStart),
                    duration_minutes: newDuration
                })
                .eq('id', sessionId);

            if (error) throw error;
            fetchSessions(true); // Silent refresh
        } catch (err) {
            console.error('Error updating session duration:', err);
            info.revert();
            alert('שגיאה בעדכון משך השיעור');
        }
    };

    if (loading) return <div className="loading-spinner">טוען לוח שנה...</div>;

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h2>📅 לוח שנה ויומן שיעורים</h2>
                <button onClick={() => fetchSessions()} className="refresh-button">🔄 רענן</button>
            </div>

            <div className="calendar-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
                    <span>מתוכנן</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                    <span>בוצע</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#10b981', border: '2px solid #f59e0b' }}></span>
                    <span>בוצע - ממתין לתשלום</span>
                </div>
                <div className="legend-item">
                    <span style={{ fontSize: '0.9rem' }}>💡 גרור שיעורים לשינוי מועד • משוך קצוות לשינוי משך</span>
                </div>
            </div>

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                buttonText={{
                    today: 'היום',
                    month: 'חודש',
                    week: 'שבוע',
                    day: 'יום',
                    list: 'רשימה'
                }}
                events={events}
                eventClick={handleEventClick}
                editable={true}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                height="auto"
                locale="he"
                direction="rtl"
                slotMinTime="08:00:00"
                slotMaxTime="21:00:00"
                allDaySlot={false}
                nowIndicator={true}
                eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                }}
                slotLabelFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                }}
            />

            {selectedStudentId && (
                <StudentProfile
                    studentId={selectedStudentId}
                    onClose={() => { setSelectedStudentId(null); fetchSessions(true); }}
                />
            )}
        </div>
    );
}
