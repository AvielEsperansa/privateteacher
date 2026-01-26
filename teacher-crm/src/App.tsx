import { useState, useEffect } from 'react'
import { BrowserRouter as Router, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  UserPlus,
  Wallet as WalletIcon,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  GraduationCap,
  BookOpen
} from 'lucide-react'
import './styles/App.css'
import AddStudent from './components/AddStudent'
import StudentList from './components/StudentList'
import ScheduleLesson from './components/ScheduleLesson'
import LessonList from './components/LessonList'
import StudentArea from './components/StudentArea'
import Wallet from './components/Wallet'
import Auth from './components/Auth'
import TeacherSettings from './components/TeacherSettings'
import CreatePractice from './components/CreatePractice'
import { supabase } from './lib/supabaseClient'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'lessons' | 'schedule' | 'register' | 'wallet' | 'folders' | 'student' | 'settings' | 'practice'>('lessons');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
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

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const selectTab = (tab: any) => {
    setActiveTab(tab);
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        style={{ width: 40, height: 40, border: '4px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%' }}
      />
      <span>טוען מערכת...</span>
    </div>
  );

  // Landing Page ... (truncated)
  if (location.pathname === '/') {
    return (
      <div className="landing-wrapper">
        <nav className="landing-nav">
          <div className="logo-section">
            <GraduationCap size={32} color="#4f46e5" />
            <span className="logo-text">מורהפרטי</span>
          </div>
          <div className="nav-links">
            <button className="btn btn-secondary" onClick={() => navigate('/student')}>אזור תלמיד</button>
            <button className="btn btn-primary" onClick={() => navigate('/teacher')}>כניסת מורים</button>
          </div>
        </nav>

        <main className="landing-hero">
          <div className="hero-content">

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              נהלי את מרכז הלמידה <span className="highlight">במקצועיות</span> ללא מאמץ
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              מורהפרטי מעניקה לך את כל הכלים לניהול התלמידים, המערכת והתשלומים בממשק אחד חכם, מעוצב וקל לשימוש.
            </motion.p>
            <motion.div
              className="hero-buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/teacher')}>התחלת התנסות חינם</button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/student')}>כניסה כתלמיד</button>
            </motion.div>
          </div>
          <div className="hero-visual">
            <div className="blob-bg"></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="main-hero-image-wrap"
            >
              <img
                src="/assets/hero-visual.png"
                alt="Teacher CRM Dashboard"
                className="hero-main-image"
              />
            </motion.div>
          </div>
        </main>


      </div>
    );
  }

  // Student Area
  if (location.pathname === '/student') {
    return <StudentArea />;
  }

  // Teacher Auth
  if (!user && location.pathname.startsWith('/teacher')) {
    return (
      <div className="teacher-auth-container">
        <Auth />
      </div>
    );
  }

  // Teacher Dashboard
  if (location.pathname.startsWith('/teacher')) {
    const navItems = [
      { id: 'lessons', label: 'יומן שיעורים', icon: Calendar },
      { id: 'schedule', label: 'קביעת שיעור', icon: Calendar },
      { id: 'register', label: 'רישום תלמיד', icon: UserPlus },
      { id: 'practice', label: 'ממשק תרגול', icon: BookOpen },
      { id: 'wallet', label: 'ארנק', icon: WalletIcon },
      { id: 'folders', label: 'תיקי תלמידים', icon: FolderOpen },
      { id: 'settings', label: 'הגדרות', icon: Settings },
    ];

    return (
      <div className="app-container">
        <div
          className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <GraduationCap size={28} color="#4f46e5" />
              <span>מורהפרטי</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item: any) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => selectTab(item.id)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button onClick={handleLogout} className="sidebar-item logout">
              <LogOut size={20} />
              <span>יציאה</span>
            </button>
          </div>
        </aside>


        <main className="main-content">
          <header className="header">
            <div className="header-right">
              <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={24} />
              </button>
              <h2 className="header-title">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
            </div>
            <div className="header-left">
              <div className="user-profile">
                <div className="user-avatar">
                  {(user?.user_metadata?.full_name || user?.email)?.[0].toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <span className="user-role">מורה</span>
                </div>
              </div>
            </div>
          </header>

          <div className="content-area">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-content"
              >
                {activeTab === 'lessons' && <div className="dashboard-section"><LessonList /></div>}
                {activeTab === 'schedule' && (
                  <div className="dashboard-section card">
                    <ScheduleLesson />
                  </div>
                )}
                {activeTab === 'register' && (
                  <div className="dashboard-section card">
                    <AddStudent />
                  </div>
                )}
                {activeTab === 'practice' && <CreatePractice />}
                {activeTab === 'wallet' && <Wallet />}
                {activeTab === 'folders' && <StudentList />}
                {activeTab === 'settings' && <TeacherSettings />}
              </motion.div>
            </AnimatePresence>
          </div>
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

