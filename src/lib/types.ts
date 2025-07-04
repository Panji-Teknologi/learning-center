import { User } from "next-auth";

// Types for course level
export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

// Types for course status (bisa ditambahkan sesuai kebutuhan)
export type CourseStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

// Enums
export enum PurchaseStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  SINGLE_CHOICE = "SINGLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
}

export enum Level {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

export enum ResourceType {
  PDF = "PDF",
  LINK = "LINK",
  FILE = "FILE",
}

// Interface untuk data course
export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  enrolledCount: number;
  totalChapters: number;
  price: number;
  isPublished: boolean;
  level: CourseLevel;
  updatedAt: string;
  categoryId: string;
  category: Category;
  rating: number;
  reviewCount: number;
  chapters: Chapter[];
  isEnrolled?: boolean;
  teacher?: TeacherWithCompany;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  courses?: Course[];
}

export interface Chapter {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  position: number;
  isPublished: boolean;
  isFree: boolean;
  duration?: number | null; // in minutes
  courseId: string;
  course?: Course;
  userProgress?: UserProgress[];
  resources?: Resource[];
  quizzes?: Quiz[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgress {
  id: string;
  studentId: string;
  student: StudentProfile;
  chapterId: string;
  chapter: Chapter;
  isCompleted: boolean;
  chapterScore?: number | null;
  watchedSeconds: number;
  lastWatchedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  quizAttempts?: QuizAttempt[];
  completedResources?: Resource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  chapterId: string;
  chapter: Chapter;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  passingScore: number;
  chapterId: string;
  chapter: Chapter;
  questions?: Question[];
  attempts?: QuizAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  explanation?: string | null;
  options?: QuestionOption[];
  quizId: string;
  quiz: Quiz;
  answers?: StudentAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
  question: Question;
  selectedBy?: StudentAnswer[];
}

export interface QuizAttempt {
  id: string;
  score: number;
  startedAt: Date;
  completedAt?: Date | null;
  quizId: string;
  quiz: Quiz;
  studentId: string;
  student: StudentProfile;
  userProgressId?: string | null;
  userProgress?: UserProgress | null;
  answers?: StudentAnswer[];
}

export interface StudentAnswer {
  id: string;
  questionId: string;
  question: Question;
  selectedOptionId?: string | null;
  selectedOption?: QuestionOption | null;
  textAnswer?: string | null;
  attemptId: string;
  attempt: QuizAttempt;
  isCorrect: boolean;
  pointsEarned: number;
}

// Profile and Enrollment Interfaces
export interface StudentProfile {
  id: string;
  userId: string;
  user: User;
  enrolledCourses?: EnrolledCourse[];
  certificates?: Certificate[];
  progress?: UserProgress[];
  quizAttempts?: QuizAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  user: User;
  bio?: string | null;
  profileUrl?: string | null;
  expertise: string[];
  courses?: Course[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherWithCompany {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  bio: string | null;
  expertise: string[];
  profileUrl: string | null;
  company: Company | null;
}

export interface Company {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  location: string | null;
  website: string | null;
  industry: string | null;
  isVerified: boolean;
}

export interface CourseWithTeacher extends Course {
  teacher: TeacherWithCompany;
}

export interface EnrolledCourse {
  id: string;
  studentId: string;
  student: StudentProfile;
  courseId: string;
  course: Course;
  amount: number;
  currency: string;
  paymentId?: string | null;
  status: PurchaseStatus;
  validUntil?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  studentId: string;
  student: StudentProfile;
  courseId: string;
  course: Course;
  certificateNumber: string;
  issueDate: Date;
  pdfUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Props untuk komponen Course Card
export interface CourseCardProps {
  course: Course;
  onEdit?: (courseId: Course["id"]) => void;
  onDelete?: (courseId: Course["id"]) => void;
  onPublish?: (courseId: Course["id"]) => void;
}

// Props untuk Course List Container
export interface CourseListProps {
  courses: Course[];
  // viewType: "grid" | "list";
  // onViewChange: (view: "grid" | "list") => void;
  // onSearch?: (query: string) => void;
  // onFilterStatus?: (status: CourseStatus | "all") => void;
  // onFilterLevel?: (level: CourseLevel | "all") => void;
}

export type StudentCourse = {
  teacherCompany: any;
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  level: string;
  language?: string | null;
  duration?: number | null;
  totalSteps: number;
  rating?: number | null;
  reviewCount: number;
  categoryId?: string | null;
  categoryName?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  teacherImage?: string | null;
  chapterCount: number;
  enrolledCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentCourseListProps = {
  courses: StudentCourse[];
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
};

// Type untuk filter options
export interface CourseFilters {
  search?: string;
  status?: CourseStatus | "all";
  level?: CourseLevel | "all";
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

// Interface untuk statistik course
export interface CourseStats {
  totalStudents: number;
  completionRate: number;
  averageRating?: number;
  revenue?: number;
}

// Props untuk Course Table Row
export interface CourseTableRowProps {
  course: Course;
  onAction: (
    action: "edit" | "delete" | "publish" | "chapters" | "quiz",
    courseId: Course["id"]
  ) => void;
}

// Props untuk Course Actions
export interface CourseActionsProps {
  courseId: Course["id"];
  isPublished: boolean;
  onAction: (action: string) => void;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse {
  courses: Course[];
  meta: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
  };
}

export interface LearningObjective {
  id: string;
  text: string;
  position: number;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLearningObjectiveParams {
  text: string;
  position: number;
  courseId: string;
}

export interface UpdateLearningObjectiveParams {
  text?: string;
  position?: number;
}
