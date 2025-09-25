"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
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
  Download,
  Eye,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useStudentCourseProgress,
  useStudentOverview,
} from "@/hooks/use-students";
import clsx from "clsx";
import Image from "next/image";
import React from "react";
import { CourseShimmerDetail } from "./shimmer/course-shimmer-detail";
import { toast } from "sonner";

type TrainingCertificate = {
  id: string | null;
  title: string;
  hasCertificate: boolean;
  certificateNumber: string | null;
  certificateUrl: string | null;
  // untuk tampilan ringkas
  chapters: {
    id: string;
    title: string;
    position: number;
    duration: number | null;
    isCompleted: boolean;
    watchedSeconds: number;
    lastWatchedAt: string | null;
    timeLimit: number;
    attempts: number; // jumlah attempt
  }[];
  // simpan raw chapters lengkap (ada quizzes.attempts)
  rawChapters: any[];
  totalWorkTime: string | null;   // "2 Hari 3 Jam ... (51 Jam)"
  totalWorkMs: number;            // berguna buat sorting
  estTimeHM: string | null;       // contoh: "49 Menit" atau "1 Jam 5 Menit"
  isGood: any;
  verdictLabel: string | null;
  verdictColorCls: string | null;
  deltaText: string | null;
};


const TeacherStudentDetail = () => {
  const params = useParams();
  const studentId = params?.studentId as string;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { overview: student, isLoading } = useStudentOverview(studentId);
  const { courses, certificate: certificates } =
    useStudentCourseProgress(studentId);

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
        <p className="text-lg text-gray-600">Data siswa tidak ditemukan.</p>
      </div>
    );
  }
  const formatWatchTime = (seconds: number) => {
    if (!seconds || seconds <= 0) {
      return "0 menit";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours) parts.push(`${hours} jam`);
    if (minutes) parts.push(`${minutes} menit`);
    if (!hours && !minutes && secs) parts.push(`${secs} detik`);
    return parts.join(" ") || "0 menit";
  };

  const formatDuration = (duration: number | null | undefined) => {
    if (!duration || duration <= 0) {
      return "-";
    }

    const totalSeconds = Math.round(duration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts: string[] = [];
    if (hours) parts.push(`${hours}j`);
    if (minutes) parts.push(`${minutes}m`);
    if (!hours && !minutes && secs) parts.push(`${secs}d`);
    return parts.join(" ") || `${totalSeconds}s`;
  };

  const calculateTrainingStats = () => {
    if (!courses || courses.length === 0) {
      return {
        totalCourses: 0,
        completedCourses: 0,
        averageProgress: 0,
        totalWatchTime: "0 menit",
        firstEnrollmentDate: null as string | null,
        lastActivityDate: null as string | null,
      };
    }

    let progressSum = 0;
    let totalWatchSeconds = 0;
    let firstEnrollment: Date | null = null;
    let lastActivity: Date | null = null;

    courses.forEach((enrollment) => {
      progressSum += enrollment.progress ?? 0;
      totalWatchSeconds += enrollment.watchTimeSeconds || 0;

      const enrollmentDate = enrollment.createdAt
        ? new Date(enrollment.createdAt)
        : null;

      if (enrollmentDate) {
        if (!firstEnrollment || enrollmentDate < firstEnrollment) {
          firstEnrollment = enrollmentDate;
        }
      }

      const activitySource = enrollment.lastActivity || enrollment.updatedAt;
      const activityDate = activitySource ? new Date(activitySource) : null;
      if (activityDate) {
        if (!lastActivity || activityDate > lastActivity) {
          lastActivity = activityDate;
        }
      }
    });

    const totalCourses = courses.length;
    const completedCourses = Math.min(
      certificates?.length ?? 0,
      totalCourses
    );

    return {
      totalCourses,
      completedCourses,
      averageProgress:
        totalCourses > 0 ? Math.round(progressSum / totalCourses) : 0,
      totalWatchTime: formatWatchTime(totalWatchSeconds),
      firstEnrollmentDate: firstEnrollment ?? null,
      lastActivityDate: lastActivity ?? null,
    };
  };

    // --- Helpers ---
  const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

  const formatDurationId = (msTotal: number) => {
    if (!Number.isFinite(msTotal) || msTotal <= 0) return "0 Detik";
    let s = Math.floor(msTotal / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600);  s %= 3600;
    const m = Math.floor(s / 60);    s %= 60;
    const sec = s;
    const parts: string[] = [];
    if (d) parts.push(`${d} Hari`);
    if (h) parts.push(`${h} Jam`);
    if (m) parts.push(`${m} Menit`);
    parts.push(`${sec} Detik`);
    return parts.join(" ");
  };

  const getAttemptSpanMs = (chapters: any[]) => {
    let minStart: Date | null = null;
    let maxEnd: Date | null = null;
    for (const ch of chapters ?? []) {
      for (const q of ch?.quizzes ?? []) {
        for (const a of q?.attempts ?? []) {
          const s = toDate(a?.startedAt);
          const e = toDate(a?.completedAt);
          if (!s || !e) continue;
          if (!minStart || s < minStart) minStart = s;
          if (!maxEnd || e > maxEnd)     maxEnd   = e;
        }
      }
    }
    if (!minStart || !maxEnd) return 0;
    return maxEnd.getTime() - minStart.getTime();
  };

  // Estimasi total waktu = durasi video (menit) + 10 menit baca materi per chapter + waktu quiz
  // Estimasi total waktu = video (detik→menit) + 10 menit baca/chapter + total timeLimit kuis (menit)
  const sumEstimatedTotalMinutes = (chapters: any[]) => {
    return (chapters ?? []).reduce((acc: number, ch: any) => {
      const videoSeconds = ch.duration ?? 0;                // duration disimpan sebagai detik
      const videoMinutes = Math.ceil(videoSeconds / 60);    // normalisasi ke menit (dibulatkan ke atas)

      const readMinutes  = 10; // statis per chapter

      const quizMinutes  = (ch.quizzes ?? []).reduce(
        (qAcc: number, q: any) => qAcc + (q.timeLimit ?? 0), // timeLimit sudah menit
        0
      );

      return acc + videoMinutes + readMinutes + quizMinutes;
    }, 0);
  };

  const formatMinutesToHourMinute = (minutes: number) => {
    if (!minutes || minutes <= 0) return "0 Menit";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h > 0 && m > 0) return `${h} Jam ${m} Menit`;
    if (h > 0 && m === 0) return `${h} Jam`;
    return `${m} Menit`;
  };

  const trainingStats = calculateTrainingStats();

  const trainings: TrainingCertificate[] = (courses ?? []).map((enrollment) => {
    const rawChapters = enrollment.course?.chapters ?? [];

    // --- hitung sekali per course/enrollment ---
    const spanMs = getAttemptSpanMs(rawChapters);
    const totalHours = Math.floor(spanMs / 3600000);
    const totalMinutesRemainder = Math.floor((spanMs % 3600000) / 60000);
    const totalWorkTimeHM =
      spanMs > 0
        ? (totalHours > 0
            ? `${totalHours} Jam ${totalMinutesRemainder} Menit`
            : `${totalMinutesRemainder} Menit`)
        : null;

    // Estimasi
    const estMinutes = sumEstimatedTotalMinutes(rawChapters);
    const estTimeHM = estMinutes > 0 ? formatMinutesToHourMinute(estMinutes) : null;
    
    const estMs = estMinutes * 60 * 1000;
    const isGood = spanMs <= estMs;
    const verdictLabel = isGood ? "Memuaskan" : "Kurang Memuaskan";
    const verdictColorCls = isGood
      ? "text-green-700 bg-green-50 border-green-200"
      : "text-red-700 bg-red-50 border-red-200";

    const deltaMinutes = Math.ceil(Math.abs(spanMs - estMs) / 60000);
    const deltaText = isGood
      ? `Lebih cepat ${deltaMinutes} menit dari estimasi`
      : `Lebih lama ${deltaMinutes} menit dari estimasi`;

    return {
      id: enrollment.certificate?.id ?? null,
      title: enrollment.course?.title || "Pelatihan Tidak Diketahui",
      hasCertificate: Boolean(enrollment.certificate?.pdfUrl),
      certificateNumber: enrollment.certificate?.certificateNumber ?? null,
      certificateUrl: enrollment.certificate?.pdfUrl ?? null,

      chapters: rawChapters.map((chapter: any) => {
        const userProgress = chapter.userProgress?.[0];
        const firstQuiz = chapter.quizzes?.[0];
        return {
          id: chapter.id,
          title: chapter.title,
          position: chapter.position,
          duration: chapter.duration,
          isCompleted: userProgress?.isCompleted ?? false,
          watchedSeconds: userProgress?.watchedSeconds ?? 0,
          lastWatchedAt: userProgress?.lastWatchedAt ?? null,
          timeLimit: firstQuiz?.timeLimit ?? 0,
          attempts: firstQuiz?.attempts?.length ?? 0,
        };
      }),

      rawChapters,
      totalWorkTime: spanMs > 0 ? `${totalWorkTimeHM}` : null,
      totalWorkMs: spanMs,
      estTimeHM,
      isGood,
      verdictLabel,
      verdictColorCls,
      deltaText,
    };
  });


  const joinDateDisplay = trainingStats.firstEnrollmentDate
    ? new Date(trainingStats.firstEnrollmentDate).toLocaleDateString("id-ID")
    : student.joinDate
    ? new Date(student.joinDate).toLocaleDateString("id-ID")
    : "-";

  const lastActivityDisplay = trainingStats.lastActivityDate
    ? new Date(trainingStats.lastActivityDate).toLocaleDateString("id-ID")
    : student.lastActivity
    ? new Date(student.lastActivity).toLocaleDateString("id-ID")
    : "Belum ada aktivitas";

  const computedPerformanceLevel = trainingStats.totalCourses
    ? trainingStats.averageProgress >= 80
      ? "excellent"
      : trainingStats.averageProgress >= 50
      ? "average"
      : "needs_improvement"
    : student.performanceLevel;

  const performanceLabel = computedPerformanceLevel
    ? computedPerformanceLevel.replace("_", " ")
    : "-";

  const handleViewCertificate = async (training: TrainingCertificate) => {
    if (!training.certificateUrl || !training.id) {
      toast.error("Sertifikat belum tersedia.");
      return;
    }

    try {
      const response = await fetch(
        `/api/teacher/certificates/view?certificateId=${training.id}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal membuka sertifikat");
      }

      const { url } = await response.json();

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuka sertifikat"
      );
    }
  };

  const handleDownloadCertificate = async (training: TrainingCertificate) => {
    if (!training.certificateUrl || !training.id) {
      toast.error("Sertifikat belum tersedia.");
      return;
    }

    try {
      setDownloadingId(training.id);

      const response = await fetch(
        `/api/teacher/certificates/download?certificateId=${training.id}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal mengunduh sertifikat");
      }

      const { url } = await response.json();

      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate_${
        training.certificateNumber || training.id
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Sertifikat berhasil diunduh!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengunduh sertifikat"
      );
    } finally {
      setDownloadingId(null);
    }
  };




  console.log("COURSES ", courses );
  console.log("TRAININGS ", trainings );
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6 px-4">
      <Card className="shadow-md rounded-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Image
            src={student?.image || ""}
            alt={student?.name || "Foto Siswa"}
            width={64}
            height={64}
            className="rounded-full border shadow object-cover"
          />
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
            Statistik Siswa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">Tanggal Bergabung</p>
            <p className="font-medium">{joinDateDisplay}</p>
          </div>
          <div>
            <p className="text-gray-500">Aktivitas Terakhir</p>
            <p className="font-medium">{lastActivityDisplay}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Pelatihan</p>
            <p className="font-medium">{trainingStats.totalCourses}</p>
          </div>
          <div>
            <p className="text-gray-500">Selesai</p>
            <p className="font-medium">{trainingStats.completedCourses}</p>
          </div>
          <div>
            <p className="text-gray-500">Rata-rata Progres</p>
            <p className="font-medium">{trainingStats.averageProgress}%</p>
          </div>
          <div>
            <p className="text-gray-500">Waktu Tonton</p>
            <p className="font-medium">{trainingStats.totalWatchTime}</p>
          </div>
          <div className="sm:col-span-2 md:col-span-3">
            <p className="text-gray-500">Tingkat Performa</p>
            <p
              className={clsx("capitalize font-semibold", {
                "text-red-600":
                  computedPerformanceLevel === "needs_improvement",
                "text-yellow-600": computedPerformanceLevel === "average",
                "text-green-600": computedPerformanceLevel === "excellent",
              })}
            >
              {performanceLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">
            Pelatihan Diikuti
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <p className="text-gray-500">Belum mengikuti pelatihan.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="w-12 text-center" />
                    <TableHead>Nama Pelatihan</TableHead>
                    <TableHead>Status Sertifikat</TableHead>
                    <TableHead>Nomor Sertifikat</TableHead>
                    <TableHead>Estimasi Waktu Pengerjaan</TableHead>
                    <TableHead>Aktual Waktu Pengerjaan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((training, index) => (
                    <React.Fragment key={training.id || index}>
                      <TableRow className="hover:bg-gray-50 transition">
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setOpenIndex(openIndex === index ? null : index)
                            }
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
                                ? "Selesai"
                                : "Belum Selesai"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {training.certificateNumber
                                ? training.certificateNumber
                                : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {training.estTimeHM ?? "-"}
                        </TableCell>
                        <TableCell>
                          {training.totalWorkTime ?? "-"}
                        </TableCell>
                        <TableCell>
                          {training.totalWorkMs > 0 && training.certificateNumber != null? (
                          <>
                            <div
                              className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${training.verdictColorCls}`}
                            >
                              {training.isGood === null ? (
                                // ikon minus / placeholder opsional
                                <span className="w-4 h-4 inline-block">–</span>
                              ) : training.isGood ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeWidth="2" d="M9 12l2 2 4-4" />
                                  <path strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
                                  <path strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              <span>{training.verdictLabel}</span>
                            </div>

                            {training.deltaText && (
                              <p className="mt-1 text-xs text-gray-500">{training.deltaText}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}

                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setOpenIndex(openIndex === index ? null : index)
                            }
                            className="px-0 text-blue-600 hover:text-blue-700"
                          >
                            {openIndex === index ? "Sembunyikan" : "Detail"}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {openIndex === index && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="bg-gray-50 p-5 border-t"
                          >
                            <div className="space-y-5 text-sm text-gray-700 animate-fade-in">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">
                                  Sertifikat
                                </p>
                                {training.certificateUrl ? (
                                  <div className="mt-2 flex flex-wrap gap-3">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() =>
                                        handleViewCertificate(training)
                                      }
                                      disabled={!training.certificateUrl}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Lihat Sertifikat
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleDownloadCertificate(training)
                                      }
                                      disabled={
                                        !training.certificateUrl ||
                                        downloadingId === training.id
                                      }
                                    >
                                      {downloadingId === training.id ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4 mr-1" />
                                      )}
                                      {downloadingId === training.id
                                        ? "Mengunduh..."
                                        : "Download"}
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-gray-500 italic">
                                    Sertifikat belum tersedia.
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-gray-800">
                                  Detail Chapter
                                </p>
                                {training.chapters.length > 0 ? (
                                  <div className="mt-3 space-y-2">
                                    {training.chapters
                                      .sort((a, b) => a.position - b.position)
                                      .map((chapter) => (
                                        <div
                                          key={chapter.id}
                                          className="rounded-md border border-gray-200 bg-white/70 p-3"
                                        >
                                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                              <p className="font-medium text-gray-800">
                                                {chapter.position}. {chapter.title}
                                              </p>
                                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                  <Clock className="h-3.5 w-3.5" />
                                                  Durasi Video: {formatDuration(chapter.duration)}
                                                </span>
                                                <span>Ditonton: {formatWatchTime(chapter.watchedSeconds)}</span>
                                                <span>Waktu Quiz: {chapter.timeLimit ?? 0} Menit</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-semibold">
                                              <CheckCircle
                                                className={clsx("h-4 w-4", {
                                                  "text-green-500": chapter.isCompleted,
                                                  "text-gray-400": !chapter.isCompleted,
                                                })}
                                              />
                                              <span className="uppercase tracking-wide text-gray-600">
                                                {chapter.isCompleted ? "Selesai" : "Proses"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}

                                    {(() => {
                                      // --- Hitung nilai & penilaian ---
                                      const estMinutes = sumEstimatedTotalMinutes(training.rawChapters);
                                      const estMs = estMinutes * 60 * 1000;

                                      const spanMs = getAttemptSpanMs(training.rawChapters);
                                      const spanText = formatDurationId(spanMs);
                                      const totalHours = Math.floor(spanMs / (1000 * 60 * 60));

                                      const isGood = spanMs <= estMs;
                                      const verdictLabel = isGood ? "Memuaskan" : "Kurang Memuaskan";
                                      const verdictColorCls = isGood
                                        ? "text-green-700 bg-green-50 border-green-200"
                                        : "text-red-700 bg-red-50 border-red-200";

                                      const deltaMinutes = Math.ceil(Math.abs(spanMs - estMs) / 60000);
                                      const deltaText = isGood
                                        ? `Lebih cepat ${deltaMinutes} menit dari estimasi`
                                        : `Lebih lama ${deltaMinutes} menit dari estimasi`;


                                      return (
                                        <>
                                          <h1 className="text-sm font-semibold text-gray-800 pt-4">
                                            Ringkasan Waktu Penyelesaian
                                          </h1>
                                          <hr style={{ paddingTop: 10 }} />
                                          <p className="mt-2 text-gray-500 italic">
                                            Total estimasi waktu yang dibutuhkan untuk menyelesaikan course ini adalah{" "}
                                            <b>{formatMinutesToHourMinute(estMinutes)}</b>
                                          </p>

                                          <p className={`mt-2 italic`}>
                                            Peserta telah menyelesaikan course ini dengan total waktu selama{" "}
                                            <b>{spanText}</b>. (<b>{totalHours} Jam</b>)
                                          </p>
                                          {training.totalWorkMs > 0 && training.certificateNumber != null? (
                                          <>
                                          <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${verdictColorCls}`}>
                                            {isGood ? (
                                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M9 12l2 2 4-4"/><path strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            ) : (
                                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M15 9l-6 6M9 9l6 6"/><path strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            )}
                                            <span>{verdictLabel}</span>
                                          </div>

                                          <p className="mt-1 text-xs text-gray-500">{deltaText}</p>
                                          </>
                                          ) : null }

                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-gray-500 italic">
                                    Belum ada data chapter untuk kursus ini.
                                  </p>
                                )}

                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
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
