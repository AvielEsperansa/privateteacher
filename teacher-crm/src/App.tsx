import { useState, useEffect } from 'react'
import { BrowserRouter as Router, useNavigate, Navigate, useLocation } from 'react-router-dom'
import './styles/App.css'
import AddStudent from './components/AddStudent'
import StudentList from './components/StudentList'
import ScheduleLesson from './components/ScheduleLesson'
import LessonList from './components/LessonList'
import StudentArea from './components/StudentArea'
import Wallet from './components/Wallet'
import Auth from './components/Auth'
import TeacherSettings from './components/TeacherSettings'
import { supabase } from './lib/supabaseClient'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'lessons' | 'add' | 'wallet' | 'folders' | 'student' | 'settings'>('lessons');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  if (loading) return <div className="loading-screen">טוען...</div>;

  // Landing Page
  if (location.pathname === '/') {
    return (
      <div className="landing-container">
        <div className="landing-card">
          <h1>ברוכים הבאים ל-מורהפרטי 🎓</h1>
          <p>בחר את סוג הכניסה שלך:</p>
          <div className="landing-buttons">
            <button className="landing-btn teacher" onClick={() => navigate('/teacher')}>🏢 כניסת מורים</button>
            <button className="landing-btn student" onClick={() => navigate('/student')}>📖 אזור תלמיד</button>
          </div>
          <p className="landing-footer">ניהול שוטף, תיקי תלמידים ומעקב שיעורים במקום אחד</p>
        </div>
      </div>
    );
  }

  // Student Area
  if (location.pathname === '/student') {
    return (
      <div className="student-standalone">
        <StudentArea />
      </div>
    );
  }

  // Teacher Auth
  if (!user && location.pathname.startsWith('/teacher')) {
    return (
      <div className="teacher-auth-wrapper">
        <Auth />
      </div>
    );
  }

  // Teacher Dashboard
  if (location.pathname.startsWith('/teacher')) {
    return (
      <div className="App">
        <header className="app-header">
          <h1 className="app-title" onClick={() => { setActiveTab('lessons'); navigate('/teacher'); }} style={{ cursor: 'pointer' }}>מורהפרטי</h1>
          <nav className="app-nav">
            <button className={`nav-item ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => setActiveTab('lessons')}>📅 שיעורים</button>
            <button className={`nav-item ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>➕ רישום וקביעה</button>
            <button className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>💰 ארנק</button>
            <button className={`nav-item ${activeTab === 'folders' ? 'active' : ''}`} onClick={() => setActiveTab('folders')}>📁 תיקי תלמידים</button>
            <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ הגדרות</button>
          </nav>
          <div className="user-section">
            <button onClick={handleLogout} className="logout-btn">יציאה</button>
          </div>
        </header>

        <main className="app-main">
          {/* לשונית שיעורים - רק הרשימה */}
          {activeTab === 'lessons' && (
            <div className="tab-content">
              <div className="dashboard-section">
                <LessonList />
              </div>
            </div>
          )}

          {/* לשונית הוספה - רק הטפסים */}
          {activeTab === 'add' && (
            <div className="tab-content">
              <div className="forms-section">
                <AddStudent />
                <ScheduleLesson />
              </div>
            </div>
          )}

          {/* ארנק */}
          {activeTab === 'wallet' && (
            <div className="tab-content">
              <Wallet />
            </div>
          )}

          {/* תיקי תלמידים */}
          {activeTab === 'folders' && (
            <div className="tab-content">
              <StudentList />
            </div>
          )}

          {/* הגדרות */}
          {activeTab === 'settings' && (
            <div className="tab-content">
              <TeacherSettings />
            </div>
          )}
        </main>
      </div>
    );
  }

  return <Navigate to="/" />;
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
