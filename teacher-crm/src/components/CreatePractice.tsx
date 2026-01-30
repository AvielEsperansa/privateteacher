import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, Upload, X, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import '../styles/CreatePractice.css';

interface Student {
    id: string;
    full_name: string;
    subject: string;
}

interface Question {
    id: string;
    question_text: string;
    question_image_url: string | null;
    question_type: 'multiple_choice' | 'open';
    options: string[];
    correct_answer: string;
    explanation: string;
}

export default function CreatePractice() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [uploadingImage, setUploadingImage] = useState<string | null>(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('students')
                .select('id, full_name, subject')
                .eq('teacher_id', user.id)
                .order('full_name');

            if (error) throw error;
            if (data) setStudents(data);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            id: Date.now().toString(),
            question_text: '',
            question_image_url: null,
            question_type: 'multiple_choice',
            options: ['', '', '', ''],
            correct_answer: '',
            explanation: ''
        }]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: keyof Question, value: any) => {
        setQuestions(questions.map(q => 
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const updateOption = (questionId: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                newOptions[index] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleImageUpload = async (questionId: string, file: File) => {
        if (!file) return;

        setUploadingImage(questionId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('לא מחובר');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `practice-questions/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('practice-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('practice-images')
                .getPublicUrl(filePath);

            updateQuestion(questionId, 'question_image_url', publicUrl);
        } catch (err: any) {
            setMessage('שגיאה בהעלאת תמונה: ' + err.message);
        } finally {
            setUploadingImage(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) {
            setMessage('אנא בחר תלמיד');
            return;
        }
        if (questions.length === 0) {
            setMessage('אנא הוסף לפחות שאלה אחת');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('לא מחובר');

            const { data: tenantData } = await supabase
                .from('user_tenants')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            if (!tenantData) throw new Error('לא נמצא tenant');

            // שמירת כל השאלות
            const exercisesToInsert = questions.map(q => ({
                tenant_id: tenantData.tenant_id,
                student_id: selectedStudentId,
                subject: students.find(s => s.id === selectedStudentId)?.subject || null,
                question: q.question_text || (q.question_image_url ? 'תמונה' : ''),
                question_image_url: q.question_image_url,
                question_type: q.question_type,
                options: q.question_type === 'multiple_choice' ? JSON.stringify(q.options) : null,
                correct_answer: q.correct_answer,
                explanation: q.explanation || null,
                created_by: user.id,
                difficulty: null
            }));

            const { error } = await supabase
                .from('exercises')
                .insert(exercisesToInsert);

            if (error) throw error;

            setMessage('התרגול נוצר בהצלחה! ✅');
            setSelectedStudentId('');
            setQuestions([]);
        } catch (err: any) {
            setMessage('שגיאה ביצירת התרגול: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-practice-container">
            <div className="practice-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BookOpen size={24} className="text-primary" />
                    <h2>ממשק תרגול</h2>
                </div>
                <p className="text-secondary">צור תרגול מותאם אישית לתלמיד</p>
            </div>

            <form onSubmit={handleSubmit} className="practice-form">
                <div className="form-section">
                    <label className="form-label">בחר תלמיד</label>
                    <select
                        className="input"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                    >
                        <option value="">-- בחר תלמיד --</option>
                        {students.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.full_name} ({s.subject})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="questions-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>שאלות</h3>
                        <button type="button" onClick={addQuestion} className="btn btn-secondary">
                            <Plus size={18} /> הוסף שאלה
                        </button>
                    </div>

                    {questions.length === 0 && (
                        <div className="empty-state">
                            <BookOpen size={48} className="text-muted" />
                            <p>אין שאלות. לחץ על "הוסף שאלה" כדי להתחיל</p>
                        </div>
                    )}

                    {questions.map((question, qIndex) => (
                        <div key={question.id} className="question-card">
                            <div className="question-header">
                                <h4>שאלה {qIndex + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(question.id)}
                                    className="btn-icon"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">סוג שאלה</label>
                                <select
                                    className="input"
                                    value={question.question_type}
                                    onChange={(e) => updateQuestion(question.id, 'question_type', e.target.value as 'multiple_choice' | 'open')}
                                >
                                    <option value="multiple_choice">אמריקאי</option>
                                    <option value="open">שאלה פתוחה</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">טקסט השאלה (אופציונלי)</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={question.question_text}
                                    onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                                    placeholder="הכנס את טקסט השאלה כאן..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">או העלה תמונה של השאלה</label>
                                <div className="image-upload-area">
                                    {question.question_image_url ? (
                                        <div className="image-preview">
                                            <img src={question.question_image_url} alt="Question" />
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion(question.id, 'question_image_url', null)}
                                                className="btn-icon remove-image"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="upload-label">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(question.id, file);
                                                }}
                                                disabled={uploadingImage === question.id}
                                                style={{ display: 'none' }}
                                            />
                                            {uploadingImage === question.id ? (
                                                <span>מעלה...</span>
                                            ) : (
                                                <>
                                                    <Upload size={24} />
                                                    <span>לחץ להעלאת תמונה</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                            </div>

                            {question.question_type === 'multiple_choice' && (
                                <div className="form-group">
                                    <label className="form-label">תשובות אפשריות</label>
                                    {question.options.map((option, optIndex) => (
                                        <div key={optIndex} className="option-input">
                                            <input
                                                type="text"
                                                className="input"
                                                value={option}
                                                onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                                placeholder={`תשובה ${optIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label className="form-label">תשובה נכונה (בחר מספר)</label>
                                        <select
                                            className="input"
                                            value={question.correct_answer}
                                            onChange={(e) => updateQuestion(question.id, 'correct_answer', e.target.value)}
                                        >
                                            <option value="">-- בחר תשובה נכונה --</option>
                                            {question.options.map((opt, idx) => (
                                                opt && (
                                                    <option key={idx} value={opt}>
                                                        {idx + 1}. {opt}
                                                    </option>
                                                )
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {question.question_type === 'open' && (
                                <div className="form-group">
                                    <label className="form-label">תשובה נכונה</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={question.correct_answer}
                                        onChange={(e) => updateQuestion(question.id, 'correct_answer', e.target.value)}
                                        placeholder="הכנס את התשובה הנכונה..."
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">הסבר (אופציונלי)</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    value={question.explanation}
                                    onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                                    placeholder="הסבר על התשובה הנכונה..."
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {message && (
                    <div className={`status-message ${message.includes('שגיאה') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        <Save size={18} />
                        {loading ? 'שומר...' : 'שמור תרגול'}
                    </button>
                </div>
            </form>
        </div>
    );
}
