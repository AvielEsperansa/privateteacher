# 🍎 Private Tutor Management SaaS

A management platform for private educators that automates scheduling, student tracking, and business workflows — so teachers can focus on teaching instead of admin work.

> ⚠️ B2B tool for tutors — not a student marketplace.

---

## 🌟 Features

- 📅 Centralized lesson management (upcoming, completed, canceled)
- 👨‍🎓 Student CRM with progress tracking and history
- 🤖 AI-powered lesson summaries and content generation
- 🔄 Real-time data sync with Supabase
- 🛡️ Fully type-safe (TypeScript)

---

## 🛠️ Setup

### Prerequisites
- Node.js (v18+)
- npm / yarn
- Supabase project

### Installation

```bash
git clone https://github.com/AvielEsperansa/privateteacher.git
cd privateteacher
npm install
Environment Variables

Create a .env file:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_optional_ai_key
Run
npm run dev

📖 Usage
Add students via the Students tab
Track lessons in the dashboard
Use AI inside lesson view for summaries and planning

🚀 Roadmap
Payments & invoicing
Calendar integrations
Mobile support
Advanced analytics
