export type UserRole = 'OWNER' | 'TEACHER' | 'STUDENT';
export type SessionStatus = 'scheduled' | 'done' | 'canceled';
export type InteractionType = 'exercise_generation' | 'explanation';

export interface Tenant {
    id: string;
    name: string;
    plan: string;
    created_at: string;
}

export interface UserTenant {
    id: string;
    user_id: string;
    tenant_id: string;
    role: UserRole;
    created_at: string;
}

export interface Student {
    id: string;
    tenant_id: string;
    full_name: string;
    email: string | null;
    grade: string | null;
    level: string | null;
    notes: string | null;
    created_at: string;
    user_id: string | null;
}

export interface Lesson {
    id: string;
    tenant_id: string;
    title: string;
    subject: string | null;
    content: string | null;
    created_by: string | null;
    created_at: string;
}

export interface Session {
    id: string;
    tenant_id: string;
    student_id: string;
    teacher_id: string | null;
    scheduled_at: string;
    duration_minutes: number;
    status: SessionStatus;
    summary: string | null;
    homework: string | null;
    created_at: string;
}

export interface Exercise {
    id: string;
    tenant_id: string;
    student_id: string | null;
    subject: string | null;
    difficulty: number | null;
    question: string;
    question_image_url: string | null;
    question_type: 'multiple_choice' | 'open' | null;
    options: string[] | string | null;
    correct_answer: string | null;
    explanation: string | null;
    created_by: string | null;
    created_at: string;
}

export interface ExerciseAttempt {
    id: string;
    exercise_id: string;
    student_id: string;
    answer: string | null;
    is_correct: boolean | null;
    time_spent_seconds: number | null;
    created_at: string;
}

export interface AIInteraction {
    id: string;
    tenant_id: string;
    student_id: string | null;
    type: InteractionType;
    prompt: string | null;
    response: string | null;
    created_at: string;
}
