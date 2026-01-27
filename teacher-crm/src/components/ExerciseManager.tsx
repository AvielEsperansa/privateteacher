import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Camera, Keyboard, Save, X, Sparkles, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/ExerciseManager.css';

interface Props {
    studentId: string;
    sessionId?: string;
    onSave?: () => void;
}

export default function ExerciseManager({ studentId, sessionId: initialSessionId, onSave }: Props) {
    const [inputMode, setInputMode] = useState<'text' | 'image' | null>(null);
    const [questionText, setQuestionText] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [explanation, setExplanation] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || '');
    const [sessions, setSessions] = useState<any[]>([]);

    useEffect(() => {
        const fetchSessions = async () => {
            const { data } = await supabase
                .from('sessions')
                .select('id, scheduled_at')
                .eq('student_id', studentId)
                .order('scheduled_at', { ascending: false })
                .limit(10);
            if (data) setSessions(data);
        };
        fetchSessions();
    }, [studentId]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not logged in');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `exercise-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('practice-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('practice-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('נא להתחבר למערכת');

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const { error } = await supabase
                .from('exercises')
                .insert([{
                    teacher_id: user.id,
                    student_id: studentId,
                    question: questionText || (imageUrl ? 'שאלה בתמונה' : ''),
                    question_image_url: imageUrl,
                    question_type: 'open',
                    correct_answer: correctAnswer,
                    explanation: explanation || null,
                    // הסרנו את created_by שלא קיים
                    subject: 'כללי',
                    topic: 'תרגול אישי',
                    difficulty: 'medium',
                    grade: 'כללי',
                    session_id: selectedSessionId || null
                }]);

            if (error) throw error;

            setSaveStatus('success');
            if (onSave) onSave();

            setTimeout(() => {
                setSaveStatus('idle');
                setQuestionText('');
                setCorrectAnswer('');
                setExplanation('');
                setImageFile(null);
                setImagePreview(null);
                setInputMode(null);
            }, 1500);

        } catch (error: any) {
            console.error('Error saving exercise:', error);
            const errorMsg = error.message || error.details || JSON.stringify(error);
            setSaveStatus('error');
            alert('שגיאה בשמירה: ' + errorMsg);
        }
    };

    return (
        <div className="exercise-manager-wrapper-simple">
            <AnimatePresence mode="wait">
                {!inputMode ? (
                    <motion.div
                        key="selector"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mode-selector-simple"
                    >
                        <button className="mode-btn-simple image" onClick={() => setInputMode('image')}>
                            <Camera size={28} />
                            <span>צלמי תרגיל</span>
                        </button>

                        <button className="mode-btn-simple text" onClick={() => setInputMode('text')}>
                            <Keyboard size={28} />
                            <span>הקלידי תרגיל</span>
                        </button>
                    </motion.div>
                ) : (
                    <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="simple-exercise-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="form-header-simple">
                            <button type="button" className="close-btn-simple" onClick={() => setInputMode(null)}>
                                <X size={20} />
                            </button>
                            <h4>{inputMode === 'image' ? 'צילום תרגיל' : 'הקלדת תרגיל'}</h4>
                        </div>

                        {inputMode === 'image' ? (
                            <div className="image-capture-simple">
                                {!imagePreview ? (
                                    <label className="capture-label-simple">
                                        <Camera size={40} />
                                        <p>לחצי לצילום התרגיל</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageSelect}
                                            hidden
                                        />
                                    </label>
                                ) : (
                                    <div className="preview-container-simple">
                                        <img src={imagePreview} alt="Preview" />
                                        <button type="button" className="retry-btn-simple" onClick={() => { setImagePreview(null); setImageFile(null); }}>
                                            <Trash2 size={16} /> שינוי תמונה
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                className="simple-textarea"
                                placeholder="כתבי את התרגיל כאן..."
                                rows={4}
                                value={questionText}
                                onChange={e => setQuestionText(e.target.value)}
                                required
                            />
                        )}

                        <div className="simple-fields">
                            <div className="field-group-simple">
                                <label>תשובה סופית</label>
                                <input
                                    type="text"
                                    className="simple-input"
                                    placeholder="מה התשובה הנכונה?"
                                    value={correctAnswer}
                                    onChange={e => setCorrectAnswer(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field-group-simple">
                                <label>שיוך לשיעור (אופציונלי)</label>
                                <select
                                    className="simple-input"
                                    value={selectedSessionId}
                                    onChange={e => setSelectedSessionId(e.target.value)}
                                >
                                    <option value="">ללא שיוך לשיעור ספציפי</option>
                                    {sessions.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {new Date(s.scheduled_at).toLocaleDateString('he-IL')} - {new Date(s.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field-group-simple">
                                <label>הסבר או דגשים (אופציונלי)</label>
                                <textarea
                                    className="simple-input"
                                    placeholder="על מה כדאי לשים לב?"
                                    rows={2}
                                    value={explanation}
                                    onChange={e => setExplanation(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`simple-submit-btn ${saveStatus}`}
                            disabled={saveStatus !== 'idle'}
                        >
                            {saveStatus === 'idle' && <><Save size={20} /> שלחי לתלמיד</>}
                            {saveStatus === 'saving' && <span className="loader-simple"></span>}
                            {saveStatus === 'success' && <><Check size={20} /> נשלח!</>}
                            {saveStatus === 'error' && <>שגיאה</>}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}
