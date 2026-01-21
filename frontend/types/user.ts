// User types - ready for backend integration

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  coursesCompleted: number;
  coursesInProgress: number;
  totalLearningHours: number;
  certificationsEarned: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessedAt: string;
  enrolledAt: string;
}

export interface UserActivity {
  id: string;
  type: 'course_started' | 'course_completed' | 'lesson_completed' | 'certificate_earned' | 'quiz_passed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  user: UserProfile;
  stats: UserStats;
  recentCourses: UserCourse[];
  recentActivity: UserActivity[];
}
