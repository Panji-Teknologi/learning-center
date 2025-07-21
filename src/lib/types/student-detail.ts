// src/lib/types/student-detail.ts

// Student Detail User Info
export interface StudentDetailUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
}

// Student Basic Info
export interface StudentDetailProfile {
  id: string;
  user: StudentDetailUser;
  createdAt: string;
  updatedAt: string;
}

// Chapter Progress
export interface ChapterProgress {
  id: string;
  isCompleted: boolean;
  watchedSeconds: number;
  lastWatchedAt: string | null;
  completedAt: string | null;
  chapterScore: number | null;
}

// Chapter Info
export interface ChapterInfo {
  id: string;
  title: string;
  position: number;
  duration: number | null;
  userProgress: ChapterProgress[];
}

// Course Category
export interface CourseCategory {
  id: string;
  name: string;
}

// Course with Chapters
export interface CourseWithChapters {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  isPublished: boolean;
  level: string;
  category: CourseCategory | null;
  chapters: ChapterInfo[];
}

// Enrollment with Progress
export interface EnrollmentWithProgress {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  currency: string;
  paymentId: string | null;
  //   status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course: CourseWithChapters;
  // Calculated fields
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  totalChapters: number;
  completedChapters: number;
  watchTimeSeconds: number;
  lastActivity: string | null;
}

// Certificate
export interface StudentCertificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateNumber: string;
  issueDate: string;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    title: string;
  };
}

// Review
export interface StudentReview {
  id: string;
  rating: number;
  comment: string | null;
  studentId: string;
  courseId: string;
  isVerifiedPurchase: boolean;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "HIDDEN";
  helpfulCount: number;
  instructorResponse: string | null;
  instructorResponseDate: string | null;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    title: string;
  };
}

// Quiz Answer
export interface QuizAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  attemptId: string;
  question: {
    id: string;
    text: string;
    points: number;
    type: string;
  };
  selectedOption: {
    id: string;
    text: string;
    isCorrect: boolean;
  } | null;
}

// Quiz Attempt
export interface StudentQuizAttempt {
  id: string;
  score: number;
  startedAt: string;
  completedAt: string | null;
  quizId: string;
  studentId: string;
  userProgressId: string | null;
  answers: QuizAnswer[];
  quiz: {
    id: string;
    title: string;
    description: string | null;
    timeLimit: number | null;
    passingScore: number;
    chapter: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
      };
    };
  };
}

// User Progress
export interface StudentUserProgress {
  id: string;
  studentId: string;
  chapterId: string;
  isCompleted: boolean;
  chapterScore: number | null;
  watchedSeconds: number;
  lastWatchedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  chapter: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
}

// Recent Activity
export interface RecentActivity {
  recentProgress: StudentUserProgress[];
  recentQuizAttempts: StudentQuizAttempt[];
  recentReviews: StudentReview[];
}

// Statistics
export interface StudentDetailStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalWatchTime: number;
  averageProgress: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  totalCertificates: number;
  totalReviews: number;
  averageRatingGiven: number;
}

// Summary
export interface StudentSummary {
  joinDate: string;
  lastActivity: string | null;
  totalWatchTimeFormatted: string;
  performanceLevel: "excellent" | "good" | "average" | "needs_improvement";
}

// Main Student Detail Response
export interface StudentDetailResponse {
  student: StudentDetailProfile;
  enrollments: EnrollmentWithProgress[];
  certificates: StudentCertificate[];
  reviews: StudentReview[];
  quizAttempts: StudentQuizAttempt[];
  quizAttemptsByCourse: Record<string, StudentQuizAttempt[]>;
  progress: StudentUserProgress[];
  recentActivity: RecentActivity;
  stats: StudentDetailStats;
  summary: StudentSummary;
}

// Utility Types for Hooks

// Student Overview for quick display
export interface StudentOverview {
  name: string | null;
  email: string | null;
  image: string | null;
  joinDate: string;
  lastActivity: string | null;
  totalCourses: number;
  completedCourses: number;
  averageProgress: number;
  performanceLevel: "excellent" | "good" | "average" | "needs_improvement";
  totalWatchTime: string;
  certificates: StudentCertificate[];
}

// Course Progress Stats
export interface CourseProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

// Quiz Performance Data
export interface QuizPerformanceData {
  totalAttempts: number;
  averageScore: number;
  recentAttempts: StudentQuizAttempt[];
}

// Achievement Data
export interface AchievementData {
  totalCertificates: number;
  totalReviews: number;
  averageRatingGiven: number;
  recentReviews: StudentReview[];
}
