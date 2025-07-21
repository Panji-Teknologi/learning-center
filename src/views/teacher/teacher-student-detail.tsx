"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Eye,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useStudentCourseProgress,
  useStudentOverview,
} from "@/hooks/use-students";
import clsx from "clsx";
import React from "react";
import { CourseShimmerDetail } from "./shimmer/course-shimmer-detail";
import { useTranslations } from "next-intl";
import {
  Avatar,
  AvatarFallback,
  AvatarImage as AvaImage,
} from "@/components/ui/avatar";
import { useCertificateManager } from "@/hooks/use-certificates";
import { StudentCertificate } from "@/lib/types/student-detail";

const TeacherStudentDetail = () => {
  const t = useTranslations("teacher_student_detail");

  const params = useParams();
  const studentId = params?.studentId as string;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [verifiedCertUrl, setVerifiedCertUrl] = useState<string>("");

  const [selectedCertificateId, setSelectedCertificateId] = useState<
    string | null
  >(null);
  const [selectedCertificateURL, setSelectedCertificateURL] = useState<
    string | null
  >(null);

  const { overview: student, isLoading } = useStudentOverview(studentId);

  const certificates = student?.certificates;

  const { courses } = useStudentCourseProgress(studentId);

  const { downloadCertificate, viewCertificate, downloadingId } =
    useCertificateManager();

  useEffect(() => {
    const prepareCertificate = async () => {
      const certUrl = await viewCertificate({
        certificateId: selectedCertificateId ?? "",
        pdfUrl: selectedCertificateURL ?? "",
        directView: false,
      });
      setVerifiedCertUrl(certUrl);
    };
    if (selectedCertificateId && selectedCertificateURL) {
      prepareCertificate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCertificateId, selectedCertificateURL]);

  const openCertificate = () => {
    if (verifiedCertUrl) {
      window.open(verifiedCertUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-6 px-4">
        <CourseShimmerDetail />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg text-gray-600">{t("not_found")}</p>
      </div>
    );
  }

  const trainings =
    courses.map((course: any) => {
      const certificate = certificates?.find(
        (cert: any) => cert.courseId === course.course?.id
      );
      return {
        id: course.course?.id,
        title: course.course?.title || t("course_not_found"),
        hasCertificate: !!certificate,
        description: course.course?.description || t("no_description"),
        certificateUrl: certificate?.pdfUrl || null,
        certificateId: certificate?.id || null,
        imageUrl: course.course?.imageUrl || "",
        certificate,
      };
    }) || [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const onOpenTable = (training: { id: string }, index: number) => {
    const certificate = certificates?.find(
      (cert: any) => cert.courseId === training.id
    );
    const certificateId = certificate?.id;
    const certificateUrl = certificate?.pdfUrl;

    setSelectedCertificateId(certificateId as string);
    setSelectedCertificateURL(certificateUrl as string);

    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-6 px-4">
      <Card className="shadow-md rounded-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvaImage
              src={student.image ?? ""}
              alt={student?.name || t("photo_student")}
            />
            <AvatarFallback>{getInitials(student.name ?? "")}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-800">
              {student.name}
            </CardTitle>
            <p className="text-sm text-gray-500">{student.email}</p>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">
            {t("student_stats")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">{t("joined_date")}</p>
            <p className="font-medium">
              {new Date(student.joinDate).toLocaleDateString("id-ID")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">{t("last_activity")}</p>
            <p className="font-medium">
              {student.lastActivity
                ? new Date(student.lastActivity).toLocaleDateString("id-ID")
                : t("no_activity")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">{t("total_courses")}</p>
            <p className="font-medium">{student.totalCourses}</p>
          </div>
          <div>
            <p className="text-gray-500">{t("completed_courses")}</p>
            <p className="font-medium">{student.completedCourses}</p>
          </div>
          <div>
            <p className="text-gray-500">{t("average_progress")}</p>
            <p className="font-medium">{student.averageProgress}%</p>
          </div>
          <div>
            <p className="text-gray-500">{t("watch_time")}</p>
            <p className="font-medium">{student.totalWatchTime}</p>
          </div>
          <div className="sm:col-span-2 md:col-span-3">
            <p className="text-gray-500">{t("performance_level")}</p>
            <p
              className={clsx("capitalize font-semibold", {
                "text-red-600":
                  student.performanceLevel === "needs_improvement",
                "text-yellow-600": student.performanceLevel === "average",
                "text-green-600": student.performanceLevel === "excellent",
              })}
            >
              {t(`performance_${student.performanceLevel}` as any)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">
            {t("title_training")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <p className="text-gray-500">{t("no_training")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="w-12 text-center" />
                    <TableHead>{t("table_title")}</TableHead>
                    <TableHead>{t("table_certificate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((training, index) => {
                    return (
                      <React.Fragment key={index}>
                        <TableRow className="hover:bg-gray-50 transition">
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onOpenTable(training, index)}
                              className="p-0"
                            >
                              {openIndex === index ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>{training.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle
                                className={clsx("w-4 h-4", {
                                  "text-green-500": training.hasCertificate,
                                  "text-gray-400": !training.hasCertificate,
                                })}
                              />
                              <span>
                                {training.hasCertificate
                                  ? t("certificate_available")
                                  : t("certificate_unavailable")}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {openIndex === index && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="bg-gray-50 p-4 border-t"
                            >
                              <div className="space-y-3 text-sm text-gray-700 animate-fade-in">
                                <div>
                                  <strong>{t("description")}:</strong>
                                  <p className="text-gray-600">
                                    {training.description}
                                  </p>
                                </div>
                                {training.hasCertificate ? (
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="size-40 overflow-auto">
                                      {verifiedCertUrl && (
                                        <iframe
                                          src={verifiedCertUrl as string}
                                          width="100%"
                                          height="100%"
                                          style={{
                                            border: "none",
                                            transform: "scale(1.5",
                                            transformOrigin: "top",
                                          }}
                                        />
                                      )}
                                    </div>
                                    <div className="flex gap-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openCertificate}
                                        disabled={!selectedCertificateURL}
                                        className="flex-1"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />{" "}
                                        {t("button_view_certificate")}
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                          downloadCertificate(
                                            training?.certificate as StudentCertificate
                                          )
                                        }
                                        disabled={
                                          !selectedCertificateURL ||
                                          downloadingId ===
                                            selectedCertificateId
                                        }
                                      >
                                        {downloadingId ===
                                        selectedCertificateId ? (
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4 mr-1" />
                                        )}
                                        {t("button_download")}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">
                                    {t("certificate_not_available")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherStudentDetail;
