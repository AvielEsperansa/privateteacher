import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Wallet() {
    const [balance, setBalance] = useState(0);
    const [pending, setPending] = useState(0);

    const fetchBalance = async () => {
        const { data, error } = await supabase
            .from('lessons')
            .select('price, is_paid, lesson_date');

        if (!error && data) {
            const now = new Date();
            const paid = data.filter(l => l.is_paid).reduce((sum, l) => sum + (l.price || 0), 0);

            // "ממתין לתשלום" - רק עבור שיעורים שלא שולמו וגם כבר התקיימו (או קורים עכשיו)
            const unpaid = data.filter(l => {
                const lessonDate = new Date(l.lesson_date);
                return !l.is_paid && lessonDate <= now;
            }).reduce((sum, l) => sum + (l.price || 0), 0);

            setBalance(paid);
            setPending(unpaid);
        }
    };

    useEffect(() => {
        fetchBalance();

        // האזנה לשינויים בזמן אמת בשיעורים כדי לעדכן את הארנק
        const subscription = supabase
            .channel('wallet-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => {
                fetchBalance();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            textAlign: 'center'
        }}>
            <div>
                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>💰 סך הכל שהרווחת</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2d3748' }}>₪{balance}</div>
            </div>

            <div style={{ width: '1px', height: '50px', background: '#e2e8f0' }}></div>

            <div>
                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⏳ ממתין לתשלום</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#e53e3e' }}>₪{pending}</div>
            </div>
        </div>
    );
}
