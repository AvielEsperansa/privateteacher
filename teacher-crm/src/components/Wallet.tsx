import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/Wallet.css';

interface Stats {
    totalLessons: number;
    completedLessons: number;
    paidAmount: number;
    pendingAmount: number;
    totalEarned: number;
}

export default function Wallet() {
    const [stats, setStats] = useState<Stats>({
        totalLessons: 0,
        completedLessons: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalEarned: 0
    });
    const [loading, setLoading] = useState(true);

    const hourlyRate = 120; // תעריף ממוצע לשעה, נוכל להפוך את זה להגדרה בהמשך

    const fetchWalletStats = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sessions, error } = await supabase
                .from('sessions')
                .select('status, is_paid, duration_minutes')
                .eq('teacher_id', user.id);

            if (error) throw error;

            if (sessions) {
                let paid = 0;
                let pending = 0;
                let completed = 0;

                sessions.forEach(s => {
                    if (s.status === 'done') {
                        completed++;
                        const amount = (s.duration_minutes / 60) * hourlyRate;
                        if (s.is_paid) {
                            paid += amount;
                        } else {
                            pending += amount;
                        }
                    }
                });

                setStats({
                    totalLessons: sessions.length,
                    completedLessons: completed,
                    paidAmount: Math.round(paid),
                    pendingAmount: Math.round(pending),
                    totalEarned: Math.round(paid + pending)
                });
            }
        } catch (err) {
            console.error('Wallet error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletStats();
        // האזנה לשינויים בסטטוס התשלום בטבלה
        const channel = supabase.channel('wallet_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchWalletStats();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return null;

    return (
        <div className="wallet-container">
            <div className="wallet-card total">
                <div className="wallet-info">
                    <span className="wallet-label">סה"כ שיעורים שבוצעו</span>
                    <span className="wallet-balance">{stats.completedLessons}</span>
                </div>
                <div className="wallet-icon">🎓</div>
            </div>

            <div className="wallet-card earned">
                <div className="wallet-info">
                    <span className="wallet-label">הכנסה שנצברה (ברוטו)</span>
                    <span className="wallet-balance">₪{stats.totalEarned}</span>
                </div>
                <div className="wallet-icon">📈</div>
            </div>

            <div className="wallet-card paid">
                <div className="wallet-info">
                    <span className="wallet-label">שולם בפועל</span>
                    <span className="wallet-balance" style={{ color: '#2f855a' }}>₪{stats.paidAmount}</span>
                </div>
                <div className="wallet-icon">💰</div>
            </div>

            <div className="wallet-card pending">
                <div className="wallet-info">
                    <span className="wallet-label">ממתין לגבייה</span>
                    <span className="wallet-balance" style={{ color: '#c53030' }}>₪{stats.pendingAmount}</span>
                </div>
                <div className="wallet-icon">💳</div>
            </div>

            <button onClick={fetchWalletStats} className="refresh-mini" title="רענן נתונים">🔄</button>
        </div>
    );
}
