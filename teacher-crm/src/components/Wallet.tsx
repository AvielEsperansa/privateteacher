import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, CreditCard, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import '../styles/Wallet.css';

interface Stats {
    todayLessons: number;
    paidToday: number;
    pendingToday: number;
    totalEarnedOverall: number;
}

export default function Wallet() {
    const [stats, setStats] = useState<Stats>({
        todayLessons: 0,
        paidToday: 0,
        pendingToday: 0,
        totalEarnedOverall: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchWalletStats = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sessions, error } = await supabase
                .from('sessions')
                .select('status, is_paid, duration_minutes, scheduled_at, students(hourly_rate)')
                .eq('teacher_id', user.id)
                .neq('status', 'canceled');

            if (error) throw error;

            if (sessions) {
                let paidTodaySum = 0;
                let pendingTodaySum = 0;
                let totalOverall = 0;
                let lessonsTodayCount = 0;

                const now = new Date();
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date();
                endOfToday.setHours(23, 59, 59, 999);

                sessions.forEach((s: any) => {
                    const sessionDate = new Date(s.scheduled_at);
                    const rate = s.students?.hourly_rate || 120;
                    const amount = (s.duration_minutes / 60) * rate;

                    // הכנסה שנצברה - סה"כ מכל הימים (רק מה ששולם)
                    if (s.is_paid) {
                        totalOverall += amount;
                    }

                    const isToday = sessionDate >= startOfToday && sessionDate <= endOfToday;

                    if (isToday) {
                        // שולם בפועל היום
                        if (s.is_paid) {
                            paidTodaySum += amount;
                        } else {
                            // ממתין לגבייה היום
                            pendingTodaySum += amount;
                        }

                        // שיעורים שעברו כבר היום
                        if (sessionDate <= now) {
                            lessonsTodayCount++;
                        }
                    }
                });

                setStats({
                    todayLessons: lessonsTodayCount,
                    paidToday: Math.round(paidTodaySum),
                    pendingToday: Math.round(pendingTodaySum),
                    totalEarnedOverall: Math.round(totalOverall)
                });
            }
        } catch (err) {
            console.error('Wallet error:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletStats();
        const channel = supabase.channel('wallet_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchWalletStats(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Activity className="animate-pulse text-muted" size={48} />
        </div>
    );

    const statItems = [
        { label: 'שיעורים שבוצעו היום', value: stats.todayLessons, icon: Activity, type: 'total' },
        { label: 'סה"כ הכנסות (ששולמו)', value: `₪${stats.totalEarnedOverall}`, icon: CreditCard, type: 'earned' },
        { label: 'שולם בפועל (היום)', value: `₪${stats.paidToday}`, icon: CheckCircle, type: 'paid' },
        { label: 'ממתין לגבייה (היום)', value: `₪${stats.pendingToday}`, icon: Clock, type: 'pending' },
    ];

    return (
        <div className="wallet-section animate-fade-in">
            <div className="wallet-grid">
                {statItems.map((item, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-info">
                            <span className="stat-label">{item.label}</span>
                            <span className="stat-value">{item.value}</span>
                        </div>
                        <div className={`stat-icon-wrapper ${item.type}`}>
                            <item.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="refresh-container">
                <button onClick={() => fetchWalletStats()} className="btn btn-secondary">
                    <RefreshCw size={16} style={{ marginLeft: '8px' }} />
                    רענן נתונים
                </button>
            </div>
        </div>
    );
}

