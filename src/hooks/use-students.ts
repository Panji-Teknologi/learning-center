// src/hooks/use-students.ts
import { useQuery } from "@tanstack/react-query";
import {
  StudentDetailResponse,
  StudentOverview,
  CourseProgressStats,
  QuizPerformanceData,
  AchievementData,
} from "@/lib/types/student-detail";

// Basic Student Interface (existing)
interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  image?: string;
  enrolledCourses: string[];
  enrollmentDate: string;
  progressPercentage: number;
}

// Existing StudentsResponse Interface
interface StudentsResponse {
  students: Student[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalStudents: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    totalStudents: number;
    averageProgress: number;
    recentStudents: number;
  };
}

// ===== EXISTING HOOKS =====

interface UseStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "enrollmentDate" | "progress";
  sortOrder?: "asc" | "desc";
}

export const useStudents = (params: UseStudentsParams = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    sortBy = "enrollmentDate",
    sortOrder = "desc",
  } = params;

  const query = useQuery<StudentsResponse>({
    queryKey: ["teacher-students", page, limit, search, sortBy, sortOrder],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/teacher/students?${searchParams}`);

      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    students: query.data?.students || [],
    pagination: query.data?.pagination,
    stats: query.data?.stats,
  };
};

// ===== NEW HOOK FOR STUDENT DETAIL =====

/**
 * Hook to fetch comprehensive student details for teacher
 * @param studentId - The ID of the student to fetch details for
 * @returns Query result with comprehensive student data
 */
export const useStudentDetail = (studentId: string | undefined) => {
  return useQuery<StudentDetailResponse>({
    queryKey: ["teacher-student-detail", studentId],
    queryFn: async () => {
      if (!studentId) {
        throw new Error("Student ID is required");
      }

      const response = await fetch(`/api/teacher/students/${studentId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch student details");
      }

      return response.json();
    },
    enabled: !!studentId, // Only run query if studentId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter cache for detailed data
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

// ===== UTILITY HOOKS =====

/**
 * Hook to get student overview statistics
 * @param studentId - The ID of the student
 * @returns Simplified stats for quick overview
 */
export const useStudentOverview = (studentId: string | undefined) => {
  const { data, isLoading, error } = useStudentDetail(studentId);

  return {
    overview: data
      ? ({
          name: data.student.user.name,
          email: data.student.user.email,
          image: data.student.user.image,
          joinDate: data.summary.joinDate,
          lastActivity: data.summary.lastActivity,
          totalCourses: data.stats.totalCourses,
          completedCourses: data.stats.completedCourses,
          averageProgress: data.stats.averageProgress,
          performanceLevel: data.summary.performanceLevel,
          totalWatchTime: data.summary.totalWatchTimeFormatted,
          certificates: data.certificates || [],
        } as StudentOverview)
      : null,
    isLoading,
    error,
  };
};

/**
 * Hook to get student's course progress summary
 * @param studentId - The ID of the student
 * @returns Course progress data optimized for display
 */
export const useStudentCourseProgress = (studentId: string | undefined) => {
  const { data, isLoading, error } = useStudentDetail(studentId);

  return {
    courses: data?.enrollments || [],
    coursesStats: data
      ? ({
          total: data.stats.totalCourses,
          completed: data.stats.completedCourses,
          inProgress: data.stats.inProgressCourses,
          notStarted:
            data.stats.totalCourses -
            data.stats.completedCourses -
            data.stats.inProgressCourses,
        } as CourseProgressStats)
      : null,
    isLoading,
    error,
  };
};

/**
 * Hook to get student's quiz performance data
 * @param studentId - The ID of the student
 * @returns Quiz performance metrics and attempts
 */
export const useStudentQuizPerformance = (studentId: string | undefined) => {
  const { data, isLoading, error } = useStudentDetail(studentId);

  return {
    attempts: data?.quizAttempts || [],
    attemptsByCourse: data?.quizAttemptsByCourse || {},
    performance: data
      ? ({
          totalAttempts: data.stats.totalQuizAttempts,
          averageScore: data.stats.averageQuizScore,
          recentAttempts: data.recentActivity.recentQuizAttempts,
        } as QuizPerformanceData)
      : null,
    isLoading,
    error,
  };
};

/**
 * Hook to get student's achievements and certificates
 * @param studentId - The ID of the student
 * @returns Certificates and achievement data
 */
export const useStudentAchievements = (studentId: string | undefined) => {
  const { data, isLoading, error } = useStudentDetail(studentId);

  return {
    certificates: data?.certificates || [],
    reviews: data?.reviews || [],
    achievements: data
      ? ({
          totalCertificates: data.stats.totalCertificates,
          totalReviews: data.stats.totalReviews,
          averageRatingGiven: data.stats.averageRatingGiven,
          recentReviews: data.recentActivity.recentReviews,
        } as AchievementData)
      : null,
    isLoading,
    error,
  };
};
