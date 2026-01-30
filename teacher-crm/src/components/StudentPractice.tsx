import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import '../styles/StudentPractice.css';

interface Exercise {
    id: string;
    question: string;
    question_image_url: string | null;
    question_type: 'multiple_choice' | 'open';
    options: string[] | null;
    correct_answer: string;
    explanation: string | null;
    created_at: string;
}

interface PracticeResult {
    exerciseId: string;
    isCorrect: boolean;
    userAnswer: string;
}

export default function StudentPractice() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, PracticeResult>>({});
    const [isChecked, setIsChecked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState<string | null>(null);

    useEffect(() => {
        checkStudentLogin();
    }, []);

    const checkStudentLogin = async () => {
        // בדיקה אם התלמיד כבר מחובר (מהקומפוננטה StudentArea)
        const studentData = sessionStorage.getItem('studentData');
        if (studentData) {
            const student = JSON.parse(studentData);
            setStudentId(student.id);
            fetchExercises(student.id);
        } else {
            setLoading(false);
        }
    };

    const fetchExercises = async (sid: string) => {
        try {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .eq('student_id', sid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                // המרת options מ-JSON אם צריך
                const formattedData = data.map(ex => ({
                    ...ex,
                    options: ex.options ? (typeof ex.options === 'string' ? JSON.parse(ex.options) : ex.options) : null
                }));
                setExercises(formattedData);
            }
        } catch (err) {
            console.error('Error fetching exercises:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (exerciseId: string, answer: string) => {
        setAnswers({ ...answers, [exerciseId]: answer });
    };

    const handleCheckAnswers = async () => {
        if (!studentId) return;

        const newResults: Record<string, PracticeResult> = {};

        exercises.forEach(exercise => {
            const userAnswer = answers[exercise.id] || '';
            let isCorrect = false;

            if (exercise.question_type === 'multiple_choice') {
                isCorrect = userAnswer.trim() === exercise.correct_answer.trim();
            } else {
                // לשאלות פתוחות - השוואה פשוטה (ניתן לשפר)
                isCorrect = userAnswer.trim().toLowerCase() === exercise.correct_answer.trim().toLowerCase();
            }

            newResults[exercise.id] = {
                exerciseId: exercise.id,
                isCorrect,
                userAnswer
            };

            // שמירת הניסיון בבסיס הנתונים
            supabase.from('exercise_attempts').insert({
                exercise_id: exercise.id,
                student_id: studentId,
                student_answer: userAnswer,
                is_correct: isCorrect,
                time_spent_seconds: null
            }).then(({ error }) => {
                if (error) console.error('Error saving attempt in legacy component:', error);
            });
        });

        setResults(newResults);
        setIsChecked(true);
    };

    const resetPractice = () => {
        setAnswers({});
        setResults({});
        setIsChecked(false);
    };

    if (loading) {
        return (
            <div className="practice-loading">
                <div className="spinner"></div>
                <p>טוען תרגולים...</p>
            </div>
        );
    }

    if (!studentId) {
        return (
            <div className="practice-error">
                <AlertCircle size={48} />
                <p>יש להתחבר תחילה כאזור תלמיד</p>
            </div>
        );
    }

    if (exercises.length === 0) {
        return (
            <div className="practice-empty">
                <BookOpen size={48} className="text-muted" />
                <h3>אין תרגולים זמינים</h3>
                <p>המורה עדיין לא יצר תרגולים עבורך</p>
            </div>
        );
    }

    const correctCount = Object.values(results).filter(r => r.isCorrect).length;
    const totalCount = exercises.length;

    return (
        <div className="student-practice-container">
            <div className="practice-header">
                <div>
                    <h2>📚 תרגול</h2>
                    <p className="text-secondary">ענה על השאלות ולחץ על "בדיקה"</p>
                </div>
                {isChecked && (
                    <div className="practice-score">
                        <span>תוצאה: {correctCount}/{totalCount}</span>
                    </div>
                )}
            </div>

            <div className="exercises-list">
                {exercises.map((exercise, index) => {
                    const userAnswer = answers[exercise.id] || '';
                    const result = results[exercise.id];
                    const showResult = isChecked && result;

                    return (
                        <div key={exercise.id} className={`exercise-card ${showResult ? (result.isCorrect ? 'correct' : 'incorrect') : ''}`}>
                            <div className="exercise-header">
                                <h3>שאלה {index + 1}</h3>
                                {showResult && (
                                    <div className={`result-badge ${result.isCorrect ? 'success' : 'error'}`}>
                                        {result.isCorrect ? (
                                            <><CheckCircle size={18} /> נכון!</>
                                        ) : (
                                            <><XCircle size={18} /> שגוי</>
                                        )}
                                    </div>
                                )}
                            </div>

                            {exercise.question_image_url && (
                                <div className="question-image">
                                    <img src={exercise.question_image_url} alt="Question" />
                                </div>
                            )}

                            {exercise.question && (
                                <div className="question-text">
                                    <p>{exercise.question}</p>
                                </div>
                            )}

                            <div className="answer-section">
                                {exercise.question_type === 'multiple_choice' && exercise.options ? (
                                    <div className="multiple-choice-options">
                                        {exercise.options.map((option, optIndex) => (
                                            <label key={optIndex} className={`option-label ${showResult && userAnswer === option ? (result.isCorrect ? 'selected-correct' : 'selected-incorrect') : ''}`}>
                                                <input
                                                    type="radio"
                                                    name={`exercise-${exercise.id}`}
                                                    value={option}
                                                    checked={userAnswer === option}
                                                    onChange={(e) => handleAnswerChange(exercise.id, e.target.value)}
                                                    disabled={isChecked}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea
                                        className="input open-answer"
                                        rows={4}
                                        value={userAnswer}
                                        onChange={(e) => handleAnswerChange(exercise.id, e.target.value)}
                                        placeholder="הכנס את תשובתך כאן..."
                                        disabled={isChecked}
                                    />
                                )}
                            </div>

                            {showResult && (
                                <div className={`result-details ${result.isCorrect ? 'success' : 'error'}`}>
                                    <div className="result-info">
                                        <p><strong>התשובה שלך:</strong> {userAnswer || '(לא ענה)'}</p>
                                        {!result.isCorrect && (
                                            <p><strong>התשובה הנכונה:</strong> {exercise.correct_answer}</p>
                                        )}
                                    </div>
                                    {exercise.explanation && (
                                        <div className="explanation">
                                            <strong>הסבר:</strong>
                                            <p>{exercise.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="practice-actions">
                {!isChecked ? (
                    <button onClick={handleCheckAnswers} className="btn btn-primary btn-lg">
                        <CheckCircle size={20} />
                        בדיקת תשובות
                    </button>
                ) : (
                    <button onClick={resetPractice} className="btn btn-secondary btn-lg">
                        <Clock size={20} />
                        תרגול מחדש
                    </button>
                )}
            </div>
        </div>
    );
}
