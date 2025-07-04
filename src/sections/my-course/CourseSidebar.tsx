"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatVideoDuration } from "@/utils/formatVideoDuration";
import {
  BookOpen,
  Clock,
  FileText,
  Award,
  CheckCircle,
  Clock1,
  PartyPopper,
  Star,
} from "lucide-react";
import { CourseImageCard, AvatarImage } from "@/components/media/SecureImage";
import StudentQuizzes from "./StudentQuizzes";
import { Resource } from "@/lib/types/resource";
import { useState } from "react";
import ResourceDrawer from "./ResourceDrawer";
import { useStudentResources } from "@/hooks/use-resources";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

interface CourseSidebarProps {
  course: any;
  currentChapter: any;
  chapters: any[];
}

export default function CourseSidebar({
  course,
  currentChapter,
  chapters,
}: CourseSidebarProps) {
  const searchParams = useSearchParams();
  const playChapterId = searchParams.get("play") as string;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null
  );

  const { data } = useStudentResources(playChapterId);

  // Get current chapter resources and quizzes
  const resources = data?.resources || [];

  const handleOpenResource = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedResourceId(null);
  };

  // Calculate progress
  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(
    (ch) => ch.userProgress?.isCompleted
  ).length;
  const progressPercentage =
    totalChapters > 0
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;

  console.log("progressPercentage : ", progressPercentage);
  console.log("chapters : ", chapters);
  console.log("currentChapter : ", currentChapter);

  return (
    <div className="space-y-6">
      {/* Course Info Card */}
      <Card>
        <CardContent className="p-4">
          {/* Course Thumbnail */}
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
            <CourseImageCard
              imageKey={course.imageUrl}
              courseId={course.id}
              courseTitle={course.title}
              className="aspect-video w-full"
            />
          </div>

          {/* Course Details */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm line-clamp-2">
                {course.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {course.description}
              </p>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{formatVideoDuration(course.duration || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-muted-foreground" />
                <span>{totalChapters} bab</span>
              </div>
            </div>

            <Separator />

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Progres</span>
                <span className="text-muted-foreground">
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completedChapters}/{totalChapters} bab selesai
              </p>
            </div>

            {/* Course Category & Level */}
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {course.category?.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {course.level.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Congratulations Card */}
      {progressPercentage === 100 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
              <PartyPopper className="h-4 w-4" />
              Selamat!
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-yellow-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Kursus Berhasil Diselesaikan!
                </span>
              </div>

              <p className="text-xs text-yellow-600">
                Luar biasa! Anda telah menyelesaikan 100% dari semua materi
                dalam kursus ini. Pengetahuan dan keterampilan baru siap untuk
                dipraktikkan!
              </p>

              <Button
                size="sm"
                variant="outline"
                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <Star className="h-3 w-3 mr-1" />
                Review Course
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificate Card */}
      {progressPercentage === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <Award className="h-4 w-4" />
              Sertifikat
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Dapatkan Sertifikat Anda
                </span>
              </div>

              <p className="text-xs text-green-600 pb-3">
                Unduh sertifikat penyelesaian kursus sebagai bukti pencapaian
                Anda.
              </p>

              <Link href={`/certificate/${course.id}`}>
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Lihat Sertifikat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Card */}
      <StudentQuizzes chapterId={currentChapter?.id} />

      {/* Resources Card */}
      {resources.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Materi Chapter
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {resources.map((resource: Resource, index: number) => (
                <div
                  key={resource.id}
                  className="flex flex-col p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-md font-medium">{resource.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {resource.summary || "Tidak ada deskripsi"}
                    </p>
                  </div>
                  <div className="flex items-center mt-4">
                    <div className="flex items-center justify-between w-full">
                      <p className="text-xs">Waktu Baca</p>
                      <div className="flex items-center gap-1">
                        <Clock1 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {resource.readTime} menit
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      handleOpenResource(resource.id);
                    }}
                  >
                    Baca Materi
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Instructor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Instruktur</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <Avatar>
              {course?.teacher?.profileUrl ? (
                <AvatarImage
                  imageKey={course.teacher?.profileUrl}
                  userName={course.teacher?.user?.name || "Instruktur"}
                  size={40}
                  className="flex-shrink-0"
                />
              ) : (
                <AvatarFallback className="rounded-lg">
                  {course.teacher?.user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {course.teacher?.user?.name || "Instruktur"}
              </p>
              <p className="text-xs text-muted-foreground">Instruktur Kursus</p>
            </div>
          </div>

          {/* Company Info */}
          {course.teacher?.company && (
            <div className="flex items-center gap-3 mt-3 p-2 rounded-lg bg-gray-100">
              <Avatar className="h-6 w-6">
                {course.teacher.company.logoUrl ? (
                  <AvatarImage
                    imageKey={course.teacher.company.logoUrl}
                    userName={course.teacher.company.name}
                    size={24}
                    className="rounded-sm"
                  />
                ) : (
                  <AvatarFallback className="text-xs rounded-sm">
                    {course.teacher.company.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-xs text-muted-foreground">
                {course.teacher.company.name}
              </p>
            </div>
          )}

          {course.teacher?.bio && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-3">
              {course.teacher.bio}
            </p>
          )}
        </CardContent>
      </Card>

      <ResourceDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        resourceId={selectedResourceId}
      />
    </div>
  );
}
