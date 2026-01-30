import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageSquare, Send, Bot, User, Sparkles, MinusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import '../styles/AIChat.css';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export default function AIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'שלום! אני העוזר החכם שלך. איך אוכל לעזור לך בלימודים היום?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            console.log('Attempting to call Gemini AI...');

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: "אתה עוזר הוראה אישי חכם ומעודד. ענה בעברית ידידותית. חשוב: אל תציג את תהליך החשבה שלך (THOUGHT), רק את התשובה הסופית."
            });

            const chat = model.startChat({
                history: messages
                    .filter((msg, index) => !(index === 0 && msg.role === 'model')) // Remove welcome message from history
                    .map(msg => ({
                        role: msg.role === 'model' ? 'model' : 'user',
                        parts: [{ text: msg.text }],
                    })),
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            let text = response.text();

            // Clean up the response - gemini-2.5-flash includes chain-of-thought reasoning
            if (text.includes('THOUGHT:')) {
                // Find where the actual Hebrew response starts
                const lines = text.split('\n');
                let responseLines = [];
                let foundResponse = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    // Skip THOUGHT lines and numbered list markers
                    if (line.startsWith('THOUGHT:') || line.match(/^\d+\.\s*\*\*/)) {
                        continue;
                    }

                    // Check if line contains Hebrew text
                    if (/[\u0590-\u05FF]/.test(line)) {
                        foundResponse = true;
                    }

                    // Once we found the response, collect all remaining lines
                    if (foundResponse) {
                        responseLines.push(line);
                    }
                }

                text = responseLines.join(' ').trim();
            }

            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (error: any) {
            console.error('Gemini AI Detailed Error:', error);
            let errorMessage = 'מצטער, נתקלתי בשגיאה בחיבור לבינה המלאכותית. ';

            if (error.message?.includes('API_KEY_INVALID')) {
                errorMessage += 'נראה שמפתח ה-API אינו תקין.';
            } else if (error.message?.includes('quota')) {
                errorMessage += 'חרגת ממכסת הבקשות החינמית.';
            }

            setMessages(prev => [...prev, { role: 'model', text: errorMessage + ' אנא נסה שוב מאוחר יותר.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-chat-wrapper">
            {!isOpen ? (
                <button className="ai-chat-toggle" onClick={() => setIsOpen(true)}>
                    <Sparkles className="sparkle-icon" />
                    <span>עזרה מהבינה המלאכותית</span>
                    <MessageSquare size={24} />
                </button>
            ) : (
                <div className="ai-chat-window animate-slide-up">
                    <header className="ai-chat-header">
                        <div className="ai-chat-title">
                            <div className="ai-avatar">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h3>עוזר לימודי חכם</h3>
                                <span className="status-online">מחובר ומוכן לעזור</span>
                            </div>
                        </div>
                        <div className="ai-chat-actions">
                            <button onClick={() => setIsOpen(false)} title="מזער">
                                <MinusCircle size={20} />
                            </button>
                        </div>
                    </header>

                    <div className="ai-chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message-bubble ${msg.role}`}>
                                <div className="message-icon">
                                    {msg.role === 'model' ? <Bot size={14} /> : <User size={14} />}
                                </div>
                                <div className="message-text">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-bubble model loading">
                                <div className="typing-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="ai-chat-input" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="שאל אותי משהו..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
