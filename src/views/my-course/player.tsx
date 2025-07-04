"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCourse } from "@/hooks/use-course";
import { useChaptersQuery } from "@/hooks/use-chapters-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import CourseOverview from "@/sections/my-course/CourseOverview";
import ChapterPlayer from "@/sections/my-course/ChapterPlayer";
import CourseSidebar from "@/sections/my-course/CourseSidebar";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Layout from "@/layout";
import { useQueryClient } from "@tanstack/react-query";
import { useCourseProgress } from "@/hooks/use-chapter-progress";

export default function MyCoursePlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const courseId = params.courseId as string;
  const playChapterId = searchParams.get("play") as string;
  const queryClient = useQueryClient();

  // Fetch course data
  const {
    data: courseData,
    isLoading: courseLoading,
    error: courseError,
  } = useCourse(courseId);
  const { data: chaptersData, isLoading: chaptersLoading } = useChaptersQuery({
    courseId,
    page: 1,
    limit: 100, // Get all chapters
  });

  const { data: courseProgressData } = useCourseProgress(courseId);

  const course = courseData?.course;
  const chapters = chaptersData?.chapters || [];
  const isEnrolled = course?.isEnrolled;

  // State for current chapter
  const [currentChapter, setCurrentChapter] = useState<any>(null);

  // Find current chapter when playChapterId changes
  useEffect(() => {
    if (playChapterId && chapters.length > 0) {
      const chapter = chapters.find((ch: any) => ch.id === playChapterId);
      setCurrentChapter(chapter || null);
    } else {
      setCurrentChapter(null);
    }
  }, [playChapterId, chapters]);

  // Navigation functions
  const handleChapterSelect = (chapterId: string) => {
    const url = `/my-courses/${courseId}?play=${chapterId}`;
    queryClient.invalidateQueries({
      queryKey: ["student-resources", chapterId],
    });

    router.push(url);
  };

  const handleNextChapter = () => {
    if (!currentChapter) return;

    const currentIndex = chapters.findIndex(
      (ch: any) => ch.id === currentChapter.id
    );
    const nextChapter = chapters[currentIndex + 1];

    if (nextChapter) {
      handleChapterSelect(nextChapter.id);
    }
  };

  const handlePreviousChapter = () => {
    if (!currentChapter) return;

    const currentIndex = chapters.findIndex(
      (ch: any) => ch.id === currentChapter.id
    );
    const prevChapter = chapters[currentIndex - 1];

    if (prevChapter) {
      handleChapterSelect(prevChapter.id);
    }
  };

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!session && !courseLoading) {
      router.push("/");
    }
  }, [session, courseLoading, router]);

  // Loading state
  if (courseLoading || chaptersLoading || !session) {
    return <CoursePlayerSkeleton />;
  }

  // Error state
  if (courseError || !course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load course. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not enrolled state
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need to enroll in this course to access the content.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/my-courses")}
            >
              My Courses
            </Button>
            <Button onClick={() => router.push(`/courses/${courseId}`)}>
              View Course
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Main Content */}
        <div className="container mx-auto max-w-7xl px-4 pb-6 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.push("/my-courses")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Courses
          </Button>
          {playChapterId && currentChapter ? (
            // Chapter Player View
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Content - Chapter Player */}
              <div className="lg:col-span-8 xl:col-span-9">
                <ChapterPlayer
                  course={course}
                  chapter={currentChapter}
                  chapters={courseProgressData?.courseProgress || []}
                  onNextChapter={handleNextChapter}
                  onPreviousChapter={handlePreviousChapter}
                  onChapterSelect={handleChapterSelect}
                  courseId={courseId}
                />
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 xl:col-span-3">
                <CourseSidebar
                  course={course}
                  currentChapter={currentChapter}
                  chapters={courseProgressData?.courseProgress || []}
                />
              </div>
            </div>
          ) : (
            // Course Overview
            <div className="max-w-7xl mx-auto">
              <CourseOverview
                course={course}
                chapters={courseProgressData?.courseProgress || []}
                onChapterSelect={handleChapterSelect}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Loading skeleton component
function CoursePlayerSkeleton() {
  return (
    <Layout>
      <div className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9">
              <Skeleton className="w-full aspect-video rounded-lg mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="w-full h-64 rounded-lg" />
              <Skeleton className="w-full h-32 rounded-lg" />
              <Skeleton className="w-full h-48 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
