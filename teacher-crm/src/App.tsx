import { useState } from 'react'
import './styles/App.css'
import AddStudent from './components/AddStudent'
import StudentList from './components/StudentList'
import ScheduleLesson from './components/ScheduleLesson'
import LessonList from './components/LessonList'
import StudentArea from './components/StudentArea'

function App() {
  const [activeTab, setActiveTab] = useState<'daily' | 'folders' | 'student'>('daily');

  return (
    <div className="App">
      {/* תפריט ניווט עליון */}
      <header className="app-header">
        <h1 className="app-title" onClick={() => setActiveTab('daily')} style={{ cursor: 'pointer' }}>
          מורהפרטי
        </h1>
        <nav className="app-nav">
          <button
            className={`nav-item ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            🏠 ניהול שוטף
          </button>
          <button
            className={`nav-item ${activeTab === 'folders' ? 'active' : ''}`}
            onClick={() => setActiveTab('folders')}
          >
            📁 תיקי תלמידים
          </button>
          <button
            className={`nav-item ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
            style={{ border: '2px dashed #646cff', marginLeft: '10px' }}
          >
            🎓 אזור תלמיד (תצוגה)
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'daily' && (
          <div className="tab-content">
            <div className="forms-section">
              <AddStudent />
              <ScheduleLesson />
            </div>
            <div className="dashboard-section">
              <LessonList />
            </div>
          </div>
        )}

        {activeTab === 'folders' && (
          <div className="tab-content">
            <StudentList />
          </div>
        )}

        {activeTab === 'student' && (
          <div className="tab-content">
            <StudentArea />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
