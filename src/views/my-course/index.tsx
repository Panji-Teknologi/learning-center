"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useGroupedEnrollments,
  useCancelEnrollment,
} from "@/hooks/use-enrolled-courses";
import { useEnrollmentStats } from "@/hooks/use-student-stats";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BookOpen,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  CreditCard,
  LayoutGrid,
  List,
  Search,
  FileQuestion,
  Loader2,
} from "lucide-react";
import Layout from "@/layout";

// Stats card interface
interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  className?: string;
}

// Stats Card Component
const StatsCard = ({ icon, title, count, className = "" }: StatsCardProps) => (
  <Card className={`${className}`}>
    <CardContent className="flex items-center p-6">
      <div
        className={`rounded-full p-4 mr-4 ${
          title === "Total Courses"
            ? "bg-blue-50"
            : title === "In Progress"
            ? "bg-amber-50"
            : "bg-green-50"
        }`}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-muted-foreground text-sm">{title}</h3>
        <p className="text-3xl font-bold">{count}</p>
      </div>
    </CardContent>
  </Card>
);

const MyCourses = () => {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<string>("all-courses");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("last-updated");
  const [cancellingEnrollmentId, setCancellingEnrollmentId] = useState<
    string | null
  >(null);

  const { enrollments, isLoading, error } = useGroupedEnrollments();
  const cancelEnrollment = useCancelEnrollment(
    cancellingEnrollmentId || undefined
  );

  // Get stats from the hook
  const { stats: enrollmentStats, isLoading: statsLoading } =
    useEnrollmentStats();

  useEffect(() => {
    // If URL has query params for tab, use them
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      switch (tab) {
        case "pending":
          setSelectedTab("pending-payment");
          break;
        case "failed":
          setSelectedTab("failed");
          break;
        case "in-progress":
          setSelectedTab("in-progress");
          break;
        default:
          setSelectedTab("all-courses");
      }
    }
  }, []);

  const handleContinuePayment = (enrollmentId: string, courseId: string) => {
    router.push(
      `/courses/${courseId}/payment?method=pending&enrollment=${enrollmentId}`
    );
  };

  const handleCancelEnrollment = async () => {
    if (cancellingEnrollmentId) {
      await cancelEnrollment.mutateAsync();
      setCancellingEnrollmentId(null);
    }
  };

  // Filter courses based on search query
  const filterCourses = (courses: any[]) => {
    if (!searchQuery) return courses;

    return courses.filter((enrollment) =>
      enrollment.course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Sort courses based on selected order
  const sortCourses = (courses: any[]) => {
    switch (sortOrder) {
      case "last-updated":
        return [...courses].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case "title-asc":
        return [...courses].sort((a, b) =>
          a.course.title.localeCompare(b.course.title)
        );
      case "title-desc":
        return [...courses].sort((a, b) =>
          b.course.title.localeCompare(a.course.title)
        );
      case "progress-asc":
        return [...courses].sort((a, b) => a.progress - b.progress);
      case "progress-desc":
        return [...courses].sort((a, b) => b.progress - a.progress);
      default:
        return courses;
    }
  };

  // Filter and sort all courses
  const allCoursesFiltered = sortCourses(
    filterCourses([
      ...enrollments.completed,
      ...enrollments.pending,
      ...enrollments.failed,
    ])
  );

  // Filter and sort in-progress courses
  const inProgressCoursesFiltered = sortCourses(
    filterCourses(
      enrollments.completed.filter(
        (course) => course.progress > 0 && course.progress < 100
      )
    )
  );

  // Filter and sort pending courses
  const pendingCoursesFiltered = sortCourses(
    filterCourses(enrollments.pending)
  );

  // Filter and sort failed courses
  const failedCoursesFiltered = sortCourses(filterCourses(enrollments.failed));

  // Loading states
  if (isLoading || statsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">
              Track and continue your learning journey
            </p>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        <Skeleton className="h-10 w-full mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We couldn't load your courses. Please try again later.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (enrollmentStats.total === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">
              Track and continue your learning journey
            </p>
          </div>
          <Button onClick={() => router.push("/courses")}>
            Browse Courses
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={<BookOpen className="h-6 w-6 text-blue-500" />}
            title="Total Courses"
            count={0}
          />
          <StatsCard
            icon={<Clock className="h-6 w-6 text-amber-500" />}
            title="In Progress"
            count={0}
          />
          <StatsCard
            icon={<CheckCircle className="h-6 w-6 text-green-500" />}
            title="Completed"
            count={0}
          />
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No courses yet</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            You haven't enrolled in any courses yet. Browse our catalog to find
            something to learn!
          </p>
          <Button onClick={() => router.push("/courses")}>
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-muted-foreground">
              Track and continue your learning journey
            </p>
          </div>
          <Button onClick={() => router.push("/courses")}>
            Browse More Courses
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search your courses..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-updated">Last Updated</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="progress-asc">Progress (Low-High)</SelectItem>
              <SelectItem value="progress-desc">Progress (High-Low)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewType === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewType("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewType("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={<BookOpen className="h-6 w-6 text-blue-500" />}
            title="Total Courses"
            count={enrollmentStats.total}
          />
          <StatsCard
            icon={<Clock className="h-6 w-6 text-amber-500" />}
            title="In Progress"
            count={enrollmentStats.inProgress}
          />
          <StatsCard
            icon={<CheckCircle className="h-6 w-6 text-green-500" />}
            title="Completed"
            count={enrollmentStats.completed}
          />
        </div>

        <Tabs
          defaultValue="all-courses"
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="mb-8">
            <TabsTrigger value="all-courses">All Courses</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="pending-payment">
              Pending Payment
              {enrollments.pending.length > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-900">
                  {enrollments.pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed
              {enrollments.failed.length > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-900">
                  {enrollments.failed.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Courses */}
          <TabsContent value="all-courses" className="space-y-8">
            {allCoursesFiltered.length > 0 ? (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {allCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileQuestion className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">No courses found</h3>
                <p className="text-gray-600 mb-4">
                  No courses match your search criteria.
                </p>
              </div>
            )}
          </TabsContent>

          {/* In Progress */}
          <TabsContent value="in-progress" className="space-y-8">
            {inProgressCoursesFiltered.length > 0 ? (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  No courses in progress
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't started any courses yet or they're still pending
                  payment.
                </p>
                {enrollments.pending.length > 0 ? (
                  <Button onClick={() => setSelectedTab("pending-payment")}>
                    View Pending Courses
                  </Button>
                ) : (
                  <Button onClick={() => router.push("/courses")}>
                    Browse Courses
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Pending Payment */}
          <TabsContent value="pending-payment" className="space-y-8">
            {pendingCoursesFiltered.length > 0 ? (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  No pending payments
                </h3>
                <p className="text-gray-600 mb-4">
                  You don't have any courses with pending payments.
                </p>
                <Button onClick={() => router.push("/courses")}>
                  Browse Courses
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Failed */}
          <TabsContent value="failed" className="space-y-8">
            {failedCoursesFiltered.length > 0 ? (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {failedCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {failedCoursesFiltered.map((enrollment) => (
                    <CourseCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      viewType={viewType}
                      onContinuePayment={handleContinuePayment}
                      onCancelClick={setCancellingEnrollmentId}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">No failed payments</h3>
                <p className="text-gray-600 mb-4">
                  Great! You don't have any courses with failed payments.
                </p>
                <Button onClick={() => setSelectedTab("all-courses")}>
                  View All Courses
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Enrollment Dialog */}
        <AlertDialog
          open={!!cancellingEnrollmentId}
          onOpenChange={(open) => !open && setCancellingEnrollmentId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Enrollment?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this enrollment? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Enrollment</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelEnrollment}
                className="bg-red-600 hover:bg-red-700"
                disabled={cancelEnrollment.isPending}
              >
                {cancelEnrollment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

interface CourseCardProps {
  enrollment: any;
  viewType: "grid" | "list";
  onContinuePayment: (enrollmentId: string, courseId: string) => void;
  onCancelClick: (enrollmentId: string) => void;
}

const CourseCard = ({
  enrollment,
  viewType,
  onContinuePayment,
  onCancelClick,
}: CourseCardProps) => {
  const router = useRouter();

  // Helper to determine card styles based on status
  const getStatusConfig = () => {
    switch (enrollment.status) {
      case "COMPLETED":
        return {
          badge: {
            element:
              enrollment.progress === 100 ? (
                <Badge className="bg-green-100 text-green-800">Completed</Badge>
              ) : enrollment.progress > 0 && enrollment.progress < 100 ? (
                <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  Not Started
                </Badge>
              ),
          },
          actionButton: {
            text:
              enrollment.progress === 100
                ? "Review Course"
                : "Continue Learning",
            onClick: () => router.push(`/my-courses/${enrollment.courseId}`),
            icon: <ArrowRight className="ml-2 h-4 w-4" />,
            variant: "default" as const,
          },
        };
      case "PENDING":
        return {
          badge: {
            element: (
              <Badge className="bg-amber-100 text-amber-800">
                Pending Payment
              </Badge>
            ),
          },
          actionButton: {
            text: "Continue Payment",
            onClick: () =>
              onContinuePayment(enrollment.id, enrollment.courseId),
            icon: <CreditCard className="ml-2 h-4 w-4" />,
            variant: "default" as const,
          },
          secondaryButton: {
            text: "Cancel",
            onClick: () => onCancelClick(enrollment.id),
            variant: "outline" as const,
          },
        };
      case "FAILED":
        return {
          badge: {
            element: (
              <Badge className="bg-red-100 text-red-800">Payment Failed</Badge>
            ),
          },
          actionButton: {
            text: "Try Again",
            onClick: () =>
              router.push(`/courses/${enrollment.courseId}/checkout`),
            icon: <ArrowRight className="ml-2 h-4 w-4" />,
            variant: "outline" as const,
          },
        };
      default:
        return {
          badge: {
            element: <Badge>Unknown</Badge>,
          },
          actionButton: {
            text: "View Details",
            onClick: () => router.push(`/courses/${enrollment.courseId}`),
            icon: <ArrowRight className="ml-2 h-4 w-4" />,
            variant: "outline" as const,
          },
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (viewType === "list") {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Course Image */}
            <div className="relative aspect-video w-full sm:w-48 h-auto rounded-md overflow-hidden">
              <Image
                src={enrollment.course.imageUrl || "/placeholder-course.jpg"}
                alt={enrollment.course.title}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 200px"
              />
              <div className="absolute top-2 right-2">
                {statusConfig.badge.element}
              </div>
            </div>

            {/* Course Details */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  {enrollment.course.title}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground gap-2 mb-3">
                  <span>Level: {enrollment.course.level.toLowerCase()}</span>
                  {enrollment.totalChapters > 0 && (
                    <>
                      <span>•</span>
                      <span>{enrollment.totalChapters} chapters</span>
                    </>
                  )}
                </div>

                {/* Progress bar for active courses */}
                {enrollment.status === "COMPLETED" && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span className="font-medium">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {enrollment.completedChapters}/{enrollment.totalChapters}{" "}
                      chapters completed
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 sm:mt-auto justify-end">
                {statusConfig.secondaryButton && (
                  <Button
                    variant={statusConfig.secondaryButton.variant}
                    onClick={statusConfig.secondaryButton.onClick}
                    size="sm"
                  >
                    {statusConfig.secondaryButton.text}
                  </Button>
                )}
                <Button
                  variant={statusConfig.actionButton.variant}
                  onClick={statusConfig.actionButton.onClick}
                  size="sm"
                >
                  {statusConfig.actionButton.text}
                  {statusConfig.actionButton.icon}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Course Image */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={enrollment.course.imageUrl || "/placeholder-course.jpg"}
          alt={enrollment.course.title}
          className="object-cover transition-all hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 right-2">
          {statusConfig.badge.element}
        </div>
      </div>

      <CardContent className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-semibold line-clamp-2 mb-1">
          {enrollment.course.title}
        </h3>

        <div className="flex items-center text-sm text-muted-foreground gap-2 mb-3">
          <span className="capitalize">
            {enrollment.course.level.toLowerCase()}
          </span>
          {enrollment.totalChapters > 0 && (
            <>
              <span>•</span>
              <span>{enrollment.totalChapters} chapters</span>
            </>
          )}
        </div>

        {/* Only show progress bar for completed (active) enrollments */}
        {enrollment.status === "COMPLETED" && (
          <div className="mt-auto mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-medium">
                {enrollment.progress}% Complete
              </span>
            </div>
            <Progress value={enrollment.progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {enrollment.completedChapters}/{enrollment.totalChapters} chapters
              completed
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            variant={statusConfig.actionButton.variant}
            onClick={statusConfig.actionButton.onClick}
            className="flex-1"
          >
            {statusConfig.actionButton.text}
            {statusConfig.actionButton.icon}
          </Button>

          {statusConfig.secondaryButton && (
            <Button
              variant={statusConfig.secondaryButton.variant}
              onClick={statusConfig.secondaryButton.onClick}
            >
              {statusConfig.secondaryButton.text}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MyCourses;
