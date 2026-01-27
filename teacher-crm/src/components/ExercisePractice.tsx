import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';
import '../styles/ExercisePractice.css';

interface Exercise {
    id: string;
    subject: string;
    grade: string;
    topic: string;
    difficulty: string;
    question?: string;
    question_text?: string;
    question_image_url?: string;
    correct_answer: string;
    explanation?: string;
    session_id?: string;
}

interface Props {
    sessionId?: string;
    onBack?: (lastResults?: any[]) => void;
}

export default function ExercisePractice({ sessionId, onBack }: Props) {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [score, setScore] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [showDetailedResults, setShowDetailedResults] = useState(false);
    const [sessionResults, setSessionResults] = useState<any[]>([]);
    const [student, setStudent] = useState<any>(null);

    useEffect(() => {
        const data = sessionStorage.getItem('studentData');
        if (data) {
            const s = JSON.parse(data);
            setStudent(s);
            fetchPersonalizedExercises(s.id);
        }
    }, [sessionId]);

    const fetchPersonalizedExercises = async (studentId: string) => {
        setIsLoading(true);
        let query = supabase
            .from('exercises')
            .select('*, exercise_attempts(*)')
            .eq('student_id', studentId);

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (data && data.length > 0) {
            setExercises(data);

            // בדיקה אם כל התרגילים כבר בוצעו
            const allAttempted = data.every(ex => (ex.exercise_attempts?.length || 0) > 0);
            if (allAttempted) {
                const results = data.map(ex => {
                    const lastAttempt = ex.exercise_attempts[ex.exercise_attempts.length - 1];
                    return {
                        ...ex,
                        userAnswer: lastAttempt.student_answer,
                        isCorrect: lastAttempt.is_correct
                    };
                });
                setSessionResults(results);
                setScore(results.filter(r => r.isCorrect).length);
                setIsFinished(true);
                setShowDetailedResults(true);
            }
        } else {
            setExercises([]);
        }
        setIsLoading(false);
        if (error) console.error('Error fetching exercises:', error);
    };

    const checkAnswer = async () => {
        if (!userAnswer.trim()) {
            alert('אנא הזן תשובה');
            return;
        }

        const currentExercise = exercises[currentIndex];
        const correct = userAnswer.trim().toLowerCase() === currentExercise.correct_answer.toLowerCase();

        setIsCorrect(correct);
        setShowResult(true);
        setTotalAttempts(totalAttempts + 1);
        if (correct) setScore(score + 1);

        // שמירה לרשימת התוצאות המקומית כדי להציג בסוף
        setSessionResults(prev => [...prev, {
            ...currentExercise,
            userAnswer,
            isCorrect: correct
        }]);

        // Save attempt to database
        if (student) {
            const { error } = await supabase.from('exercise_attempts').insert([{
                exercise_id: currentExercise.id,
                student_id: student.id,
                student_answer: userAnswer,
                is_correct: correct,
            }]);

            if (error) {
                console.error('Error saving attempt:', error);
                alert('שגיאה בשמירת התשובה: ' + error.message);
            }
        }
    };

    const nextExercise = async () => {
        if (currentIndex < exercises.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setUserAnswer('');
            setShowResult(false);
        } else {
            // נוודה שהכל נשמר לפני שעוברים למסך הסיום
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 300));
            setIsFinished(true);
            setIsLoading(false);
        }
    };

    if (isFinished) {
        const finalScore = Math.round((score / exercises.length) * 100);
        return (
            <div className="exercise-practice animate-fade-in" style={{ textAlign: 'center', padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
                <Trophy size={80} className="text-primary" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px rgba(var(--primary-rgb), 0.3))' }} />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>🎉 תרגול הושלם!</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>הנה תוצאות התרגול שלך:</p>

                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>הציון הסופי שלך:</div>
                    <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary)' }}>{finalScore}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{score}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>נכונות</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }}></div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{exercises.length}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>סה"כ שאלות</div>
                        </div>
                    </div>
                </div>

                {!showDetailedResults ? (
                    <button
                        onClick={() => setShowDetailedResults(true)}
                        className="btn btn-secondary"
                        style={{ display: 'block', margin: '0 auto 2rem', padding: '0.75rem 2rem' }}
                    >
                        🔎 צפייה בפירוט התוצאות
                    </button>
                ) : (
                    <div className="detailed-results" style={{ textAlign: 'right', marginBottom: '2.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>סיכום תשובות:</h3>
                        {sessionResults.map((res, idx) => (
                            <div key={idx} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '12px', border: `1px solid ${res.isCorrect ? '#def7ec' : '#fde2e2'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 700 }}>שאלה {idx + 1}:</span>
                                    <span style={{ color: res.isCorrect ? '#03543f' : '#9b1c1c', fontWeight: 800 }}>
                                        {res.isCorrect ? '✅ נכון' : '❌ טעות'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{res.question || res.question_text}</p>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <div><strong>התשובה שלך:</strong> {res.userAnswer}</div>
                                    {!res.isCorrect && <div><strong>התשובה הנכונה:</strong> {res.correct_answer}</div>}
                                    {res.explanation && <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{res.explanation}</div>}
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowDetailedResults(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1.5rem' }}
                        >
                            הסתר פירוט
                        </button>
                    </div>
                )}

                <button
                    onClick={() => onBack ? onBack(sessionResults) : window.location.reload()}
                    className="btn btn-primary"
                    style={{ padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '16px', width: '100%', maxWidth: '400px' }}
                >
                    סיום וחזרה ללוח הבקרה
                </button>
            </div>
        );
    }

    const currentExercise = exercises[currentIndex];

    return (
        <div className="exercise-practice">
            {exercises.length === 0 ? (
                <div className="exercise-selector">
                    <div className="selector-header">
                        <BookOpen size={48} />
                        <h2>📚 אין תרגילים ממתינים</h2>
                        <p>המורה עדיין לא הוסיפה עבורך תרגילים לשיעור זה.</p>
                        <button onClick={() => onBack ? onBack() : window.location.reload()} className="btn btn-secondary" style={{ marginTop: '2rem' }}>חזור ללוח הבקרה</button>
                    </div>
                </div>
            ) : (
                <div className="exercise-container">
                    <div className="exercise-header">
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button onClick={() => onBack ? onBack(sessionResults) : window.location.reload()} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>יציאה</button>
                            <span>תרגיל {currentIndex + 1} מתוך {exercises.length}</span>
                        </div>
                        <span className="score">ציון: {score}/{totalAttempts}</span>
                    </div>

                    <div className="progress-bar" style={{ margin: '1rem 0' }}>
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
                        />
                    </div>

                    <div className="exercise-content">
                        <div className="exercise-question">
                            {currentExercise.question_image_url ? (
                                <img
                                    src={currentExercise.question_image_url}
                                    alt="שאלה"
                                    className="question-image"
                                />
                            ) : (
                                <p className="question-text">{currentExercise.question || currentExercise.question_text}</p>
                            )}
                        </div>

                        {!showResult ? (
                            <div className="answer-section">
                                <label>התשובה שלך:</label>
                                <input
                                    type="text"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                                    placeholder="הקלד את התשובה כאן..."
                                    autoFocus
                                />
                                <button className="check-button" onClick={checkAnswer}>
                                    ✓ בדוק תשובה
                                </button>
                            </div>
                        ) : (
                            <div className={`result-section ${isCorrect ? 'correct' : 'incorrect'}`}>
                                {isCorrect ? (
                                    <>
                                        <CheckCircle size={48} />
                                        <h3>🎉 מעולה! תשובה נכונה!</h3>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={48} />
                                        <h3>😔 לא נכון</h3>
                                        <p>התשובה הנכונה: <strong>{currentExercise.correct_answer}</strong></p>
                                        {currentExercise.explanation && (
                                            <div className="explanation">
                                                <strong>💡 הסבר:</strong>
                                                <p>{currentExercise.explanation}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                                <button className="next-button" onClick={nextExercise}>
                                    {currentIndex < exercises.length - 1 ? (
                                        <>השאלון הבא <ArrowRight size={20} /></>
                                    ) : (
                                        <>סיום <Trophy size={20} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
