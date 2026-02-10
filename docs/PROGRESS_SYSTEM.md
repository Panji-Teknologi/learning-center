# Dokumentasi Sistem Progress & Perhitungan Score

Dokumen ini menjelaskan logika sistem perhitungan progress course, chapter, dan quiz. Digunakan sebagai referensi untuk pengembangan project v2.

---

## 1. Arsitektur Sistem (v2)

> **Catatan v2:** v2 menggunakan **Server Components** untuk data fetching dengan akses database langsung melalui service functions. Dokumen ini fokus pada konsep dan logika bisnis, tanpa terikat pada implementasi spesifik.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Pages (Server Components)                                             │
│  └─> CoursePage, ChapterPage, DashboardPage                            │
│                                                                         │
│  UI Components                                                         │
│  └─> ProgressBar, QuizScoreDisplay, CompletionBadge, ChapterCard       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ async data call
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Core Services                                                         │
│  ├─> calculateChapterScore(studentId, chapterId)                      │
│  ├─> updateUserProgress(studentId, chapterId, data)                   │
│  ├─> getChapterProgress(studentId, chapterId)                         │
│  ├─> getCourseProgress(studentId, courseId)                            │
│  ├─> canAccessChapter(studentId, chapterId)                           │
│  └─> checkCourseCompletion(studentId, courseId)                       │
│                                                                         │
│  Business Logic                                                        │
│  ├─> Score calculation                                                 │
│  ├─> Prerequisite validation                                            │
│  ├─> Completion detection                                               │
│  └─> Certificate generation                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ db query
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Core Tables                                                           │
│  ├─> courses, chapters, quizzes                                        │
│  ├─> user_progress, quiz_attempts                                      │
│  └─> certificates, enrolled_courses                                    │
│                                                                         │
│  Access Method                                                         │
│  └─> Direct query via ORM/Query Builder                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Data Flow Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│  Server Page Component                                           │
│  export default async function Page({ params }) {               │
│    const data = await serviceFunction(params.id);              │
│    return <Component data={data} />;                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Service Function (async)                                       │
│  async function serviceFunction(id: string) {                   │
│    const result = await db.query(...);                         │
│    return calculate(result);                                    │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database Query                                                  │
│  SELECT ... FROM ... WHERE ...                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Request/Response Patterns

**Fetching Progress:**

```
// Single Chapter
GET DATA: calculateChapterScore(studentId, chapterId)
RETURN: { totalQuizzes, passedQuizzes, chapterScore, isCompleted }

// Course Overview  
GET DATA: getCourseProgress(studentId, courseId)
RETURN: { chapters: [{ chapterId, score, completed, quizzes: [...] }] }

// Access Check
GET DATA: canAccessChapter(studentId, chapterId)
RETURN: { canAccess: boolean, reason: string, requiredChapter?: string }
```

**Mutations (via Server Actions):**

```
// Submit Quiz
POST: submitQuizAttempt(quizId, answers)
  → calculate score
  → update quiz_attempts
  → recalculate chapter score
  → update user_progress
  → revalidatePath()

// Update Progress
POST: markChapterComplete(chapterId, watchedSeconds)
  → update user_progress
  → check course completion
  → revalidatePath()
```

### 1.3 Key Service Interfaces

```typescript
// Domain Types (v2)
interface ChapterScoreResult {
  chapterId: string;
  totalQuizzes: number;
  passedQuizzes: number;
  score: number;
  isCompleted: boolean;
}

interface ChapterAccessResult {
  canAccess: boolean;
  reason: string;
  requiredChapterId?: string;
}

interface CourseProgressResult {
  courseId: string;
  chapters: ChapterProgressItem[];
  stats: {
    totalChapters: number;
    completedChapters: number;
    averageScore: number;
    completionPercentage: number;
  };
}

interface ChapterProgressItem {
  chapterId: string;
  title: string;
  position: number;
  score: number;
  isCompleted: boolean;
  quizzes: QuizProgressItem[];
  canAccess: boolean;
}

interface QuizProgressItem {
  quizId: string;
  title: string;
  bestScore: number;
  attempts: number;
  isPassed: boolean;
}
```

### 1.4 Data Invalidation Strategy

```typescript
// Server Action untuk mutations
async function mutationAction(formData: FormData) {
  "use server";
  
  // Execute mutation
  await performMutation(...);
  
  // Revalidate related pages
  revalidatePath("/dashboard");
  revalidatePath("/courses/[courseId]");
  revalidatePath("/courses/[courseId]/chapters/[chapterId]");
}
```

---

## 2. Perhitungan Score Per Chapter

### 2.1 Rumus Dasar

```
Chapter Score = (Jumlah Quiz Passed / Total Quiz) × 100
```

### 2.2 Kriteria Quiz Passed

Sebuah quiz dianggap **PASSED** jika:

```
Student memiliki minimal 1 attempt dengan:
    attempt.score ≥ quiz.passingScore
```

### 2.3 Kriteria Chapter Completed

```
Chapter Status: COMPLETED
    IF Chapter Score ≥ 65
    ELSE NOT COMPLETED
```

### 2.4 Kasus Khusus: Chapter Tanpa Quiz

```typescript
if (totalQuizzes === 0) {
  return {
    chapterId,
    totalQuizzes: 0,
    passedQuizzes: 0,
    chapterScore: 100,      // Auto 100
    isCompleted: true,       // Auto completed
  };
}
```

### 2.5 Contoh Perhitungan

#### Case 1: Chapter dengan 3 Quiz
```
Quiz 1: passingScore = 70, attempts = [{score: 85}] → PASSED
Quiz 2: passingScore = 70, attempts = [{score: 65}] → PASSED
Quiz 3: passingScore = 70, attempts = [{score: 50}] → NOT PASSED

Result:
  Total Quizzes   = 3
  Passed Quizzes  = 2
  Chapter Score   = (2/3) × 100 = 67
  Status          = COMPLETED (karena 67 ≥ 65)
```

#### Case 2: Chapter dengan 1 Quiz
```
Quiz 1: passingScore = 80, attempts = [{score: 75}] → NOT PASSED

Result:
  Total Quizzes   = 1
  Passed Quizzes  = 0
  Chapter Score   = (0/1) × 100 = 0
  Status          = NOT COMPLETED
```

#### Case 3: Chapter tanpa Quiz
```
Result:
  Total Quizzes   = 0
  Passed Quizzes  = 0
  Chapter Score   = 100
  Status          = COMPLETED
```

---

## 3. Alur Perhitungan Chapter

### 3.1 Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                    START: Student Quiz Attempt                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              calculateChapterScore(studentId, chapterId)         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           Ambil Semua Quiz di Chapter                            │
│           WHERE chapterId = input.chapterId                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌────────────────────┴────────────────────┐
              │           Total Quiz = 0 ?               │
              └────────────────────┬────────────────────┘
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
              ┌─────────────┐                ┌─────────────────┐
              │ YES         │                │ NO              │
              │ Score = 100 │                │ Loop setiap     │
              │ Completed   │                │ Quiz            │
              │ = true      │                └────────┬────────┘
              └─────────────┘                         ▼
                                        ┌─────────────────────┐
                                        │ Cek: ada attempt     │
                                        │ dengan score ≥       │
                                        │ passingScore ?       │
                                        └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │ Increment           │
                                        │ passedQuizzes jika  │
                                        │ kondisi terpenuhi   │
                                        └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │ Hitung Chapter      │
                                        │ Score = (passed/    │
                                        │ total) × 100        │
                                        └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │ isCompleted =       │
                                        │ score ≥ 65          │
                                        └─────────────────────┘
```

### 3.2 Service Implementation

```typescript
async function calculateChapterScore(
  studentId: string,
  chapterId: string
): Promise<ChapterScoreResult> {
  // 1. Get all quizzes in chapter with student's attempts
  const quizzes = await db.quiz.findMany({
    where: { chapterId },
    include: {
      attempts: {
        where: { studentId },
        select: { score: true },
      },
    },
  });

  const totalQuizzes = quizzes.length;

  // 2. Handle quiz-lesson case
  if (totalQuizzes === 0) {
    return {
      chapterId,
      totalQuizzes: 0,
      passedQuizzes: 0,
      score: 100,
      isCompleted: true,
    };
  }

  // 3. Count passed quizzes
  let passedQuizzes = 0;
  for (const quiz of quizzes) {
    const hasPassed = quiz.attempts.some(
      (attempt) => attempt.score >= quiz.passingScore
    );
    if (hasPassed) passedQuizzes++;
  }

  // 4. Calculate score and status
  const score = Math.round((passedQuizzes / totalQuizzes) * 100);
  const isCompleted = score >= 65;

  return { chapterId, totalQuizzes, passedQuizzes, score, isCompleted };
}
```

---

## 4. Update User Progress

### 4.1 Upsert Logic

Setiap kali chapter score dihitung, sistem melakukan **upsert** ke tabel `user_progress`:

```typescript
async function updateChapterProgress(
  studentId: string,
  chapterId: string,
  watchedSeconds?: number
): Promise<void> {
  // 1. Calculate current score
  const calculation = await calculateChapterScore(studentId, chapterId);

  // 2. Upsert progress record
  await db.userProgress.upsert({
    where: { studentId_chapterId: { studentId, chapterId } },
    update: {
      score: calculation.score,
      isCompleted: calculation.isCompleted,
      completedAt: calculation.isCompleted ? new Date() : null,
      watchedSeconds: watchedSeconds ?? 0,
      updatedAt: new Date(),
    },
    create: {
      studentId,
      chapterId,
      score: calculation.score,
      isCompleted: calculation.isCompleted,
      completedAt: calculation.isCompleted ? new Date() : null,
      watchedSeconds: watchedSeconds ?? 0,
    },
  });
}
```

### 4.2 Struktur Tabel user_progress

```sql
CREATE TABLE user_progress (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID    NOT NULL REFERENCES student_profiles(id),
  chapter_id      UUID    NOT NULL REFERENCES chapters(id),
  score           INTEGER NOT NULL DEFAULT 0,
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMP NULL,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  notes           TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(student_id, chapter_id)
);
```

---

## 5. Progress Keseluruhan Course

### 5.1 Rumus Perhitungan

```typescript
async function getCourseProgressSummary(
  studentId: string,
  courseId: string
): Promise<CourseProgressResult> {
  // 1. Get all chapters with progress
  const chapters = await getChaptersWithProgress(studentId, courseId);

  // 2. Calculate statistics
  const totalChapters = chapters.length;
  const completedChapters = chapters.filter((ch) => ch.isCompleted).length;

  const averageScore = totalChapters > 0
    ? Math.round(chapters.reduce((sum, ch) => sum + ch.score, 0) / totalChapters)
    : 0;

  const completionPercentage = totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  return {
    courseId,
    chapters,
    stats: {
      totalChapters,
      completedChapters,
      averageScore,
      completionPercentage,
    },
  };
}
```

### 5.2 Contoh Perhitungan Course

```
Course: "Introduction to React"
Chapters: 5

Chapter 1: Score = 100, Completed = true
Chapter 2: Score = 85,  Completed = true
Chapter 3: Score = 67,  Completed = true
Chapter 4: Score = 0,   Completed = false
Chapter 5: Score = 0,   Completed = false

Result:
  Total Chapters        = 5
  Completed Chapters    = 3
  Average Score         = (100 + 85 + 67 + 0 + 0) / 5 = 50
  Completion Percentage = (3/5) × 100 = 60%
```

---

## 6. Sistem Akses Chapter (Prerequisite)

### 6.1 Aturan Akses

```
Chapter dapat diakses JIKA:
  1. Chapter position = 1 (chapter pertama), ATAU
  2. Chapter isFree = true, ATAU
  3. Chapter SEBELUMNYA sudah completed DAN score ≥ 65
```

### 6.2 Flowchart Akses

```
┌─────────────────────────────────────────────────────────────────┐
│              START: Student ingin akses chapter                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              get targetChapter by chapterId                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│          Apakah chapter sudah completed sebelumnya?              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
              ┌─────────────┐             ┌─────────────────┐
              │ YES         │             │ Check posisi    │
              │ ALLOW        │             │ position === 1? │
              │ ACCESS      │             └─────────────────┘
              └─────────────┘                      │
                                   ┌──────────────┴──────────────┐
                                   ▼                              ▼
                             ┌─────────────┐            ┌─────────────────┐
                             │ NO           │            │ YES?            │
                             │             │            │ ALLOW ACCESS    │
                             │             │            │ (First chapter) │
                             │             │            └─────────────────┘
                             └─────────────┘                      │
                                   │                   ┌───────────┴───────────┐
                                   ▼                   ▼                       ▼
                             ┌─────────────┐     ┌─────────────────┐   ┌─────────────────┐
                             │ NO           │     │ Check isFree?   │   │ NO              │
                             │             │     └─────────────────┘   │                 │
                             │             │              │           │ Get previous    │
                             │             │    ┌─────────┴─────────┐   │ chapter         │
                             │             │    ▼                   │   └─────────────────┘
                             │             │┌─────────────────────┐│          │
                             │             ││ YES?                ││          ▼
                             │             ││ ALLOW ACCESS        ││┌─────────────────────┐│
                             │             ││ (Free chapter)      │││ Previous completed?││
                             │             │└─────────────────────┘││ & score ≥ 65?      ││
                             │             │          │           │└─────────────────────┘│
                             │             │          │           │          │            │
                             │             │    ┌─────┴─────┐       │    ┌─────┴─────┐     │
                             │             │    ▼           │       │    ▼           │     │
                             │             │┌─────────────────┐│┌─────────────────────┐│
                             │             ││ NO              │││ YES?                ││
                             │             ││ Get previous    │││ ALLOW ACCESS        ││
                             │             ││ chapter         │││ (Prerequisite met)  ││
                             │             │└─────────────────┘│└─────────────────────┘│
                             │             │    │           │          │            │
                             │             │    ▼           │          ▼            │
                             │             │┌─────────────────┐│┌─────────────────────┐│
                             │             ││ Previous        │││ DENY ACCESS         ││
                             │             ││ completed?      │││ (Must complete      ││
                             │             ││ & score ≥ 65?   │││ previous first)     ││
                             │             │└─────────────────┘│└─────────────────────┘│
                             │             │    │           │                       │
                             │             │    ▼           │                       │
                             │             │┌─────────────────┐│                       │
                             │             ││ ALLOW ACCESS    ││                       │
                             │             ││ (Prerequisite   ││                       │
                             │             ││ met)            ││                       │
                             │             │└─────────────────┘│                       │
                             │             │    │           │                       │
                             │             │    ▼           │                       │
                             │             │┌─────────────────┐│                       │
                             │             ││ DENY ACCESS     ││                       │
                             │             ││ (Must complete  ││                       │
                             │             ││ previous)       ││                       │
                             │             │└─────────────────┘│                       │
                             └─────────────┴───────────────────┘                       │
```

### 6.3 Service Implementation

```typescript
async function canAccessChapter(
  studentId: string,
  targetChapterId: string
): Promise<ChapterAccessResult> {
  // 1. Get target chapter
  const targetChapter = await db.chapter.findUnique({
    where: { id: targetChapterId },
  });

  // 2. Check if already completed
  const currentProgress = await db.userProgress.findUnique({
    where: { studentId_chapterId: { studentId, chapterId: targetChapterId } },
  });

  if (currentProgress?.isCompleted) {
    return { canAccess: true, reason: "Chapter already completed" };
  }

  // 3. First chapter or free chapter - always accessible
  if (targetChapter.position === 1 || targetChapter.isFree) {
    return { canAccess: true, reason: "First chapter or free chapter" };
  }

  // 4. Get previous chapter
  const previousChapter = await db.chapter.findFirst({
    where: {
      courseId: targetChapter.courseId,
      position: targetChapter.position - 1,
    },
  });

  if (!previousChapter) {
    return { canAccess: true, reason: "No previous chapter required" };
  }

  // 5. Check previous chapter progress
  const previousProgress = await db.userProgress.findUnique({
    where: { studentId_chapterId: { studentId, chapterId: previousChapter.id } },
  });

  const isPreviousCompleted =
    previousProgress?.isCompleted && (previousProgress.score ?? 0) >= 65;

  return {
    canAccess: isPreviousCompleted,
    reason: isPreviousCompleted
      ? "Previous chapter completed"
      : "Must complete previous chapter first",
    requiredChapterId: isPreviousCompleted ? undefined : previousChapter.id,
  };
}
```

---

## 7. Course Completion & Certificate Generation

### 7.1 Kondisi Course Completed

```
Course dianggap COMPLETED jika:
  SEMUA chapter di course sudah completed
  DAN
  SEMUA chapter memiliki score ≥ 65
```

### 7.2 Flowchart Completion & Certificate

```
┌─────────────────────────────────────────────────────────────────┐
│           trigger: checkCourseCompletion()                       │
│           params: studentId, courseId                            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Ambil SEMUA chapter di course                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│         Ambil progress untuk semua chapter                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌────────────────────┴────────────────────┐
              │  Semua chapter completed & score ≥ 65?    │
              └────────────────────┬────────────────────┘
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
              ┌─────────────┐                ┌─────────────────┐
              │ YES         │                │ NO              │
              │             │                │ Stop            │
              │             │                └─────────────────┘
              └──────┬──────┘
                     ▼
              ┌─────────────────────────────────────────────────┐
              │     Cek apakah certificate sudah ada?           │
              └────────────────────┬───────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              ┌─────────────┐                 ┌─────────────────┐
              │ YES         │                 │ NO              │
              │ (Sudah ada) │                 │ Generate        │
              │ STOP        │                 │ Certificate     │
              └─────────────┘                 └────────┬────────┘
                                                      ▼
                                        ┌─────────────────────────┐
                                        │ Update enrollment        │
                                        │ status = COMPLETED       │
                                        └─────────────────────────┘
```

### 7.3 Service Implementation

```typescript
async function checkAndHandleCourseCompletion(
  studentId: string,
  courseId: string
): Promise<void> {
  // 1. Get all chapters
  const chapters = await db.chapter.findMany({
    where: { courseId },
    select: { id: true },
  });

  if (chapters.length === 0) return;

  // 2. Get all chapter progress
  const chapterProgress = await db.userProgress.findMany({
    where: {
      studentId,
      chapterId: { in: chapters.map((ch) => ch.id) },
    },
    select: { chapterId: true, isCompleted: true, score: true },
  });

  // 3. Check if all chapters completed with passing score
  const completedChapters = chapterProgress.filter(
    (p) => p.isCompleted && (p.score ?? 0) >= 65
  );

  const isAllCompleted = completedChapters.length === chapters.length;

  if (!isAllCompleted) return;

  // 4. Check if certificate already exists
  const existingCert = await db.certificate.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });

  if (existingCert) return;

  // 5. Generate certificate and update enrollment
  await generateCertificate(studentId, courseId);

  await db.enrolledCourse.updateMany({
    where: { studentId, courseId },
    data: { status: "COMPLETED", updatedAt: new Date() },
  });
}
```

---

## 8. Server Component Implementation Patterns

### 8.1 Course Overview Page Pattern

```typescript
// app/courses/[courseId]/page.tsx

import { getCourseProgressSummary } from "@/lib/services/progress";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CourseStats from "@/components/course-stats";
import ChapterList from "@/components/chapter-list";

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const studentProfile = await getStudentProfile(session.user.id);
  if (!studentProfile) redirect("/onboarding");

  const progress = await getCourseProgressSummary(studentProfile.id, params.courseId);

  return (
    <div className="container">
      <h1 className="text-2xl font-bold">Course Progress</h1>

      <CourseStats
        totalChapters={progress.stats.totalChapters}
        completedChapters={progress.stats.completedChapters}
        averageScore={progress.stats.averageScore}
        completionPercentage={progress.stats.completionPercentage}
      />

      <ChapterList chapters={progress.chapters} courseId={params.courseId} />
    </div>
  );
}
```

### 8.2 Chapter Page dengan Access Check

```typescript
// app/courses/[courseId]/chapters/[chapterId]/page.tsx

import { canAccessChapter, getChapterContent } from "@/lib/services/progress";
import ChapterLocked from "@/components/chapter-locked";
import QuizSection from "@/components/quiz-section";
import VideoPlayer from "@/components/video-player";

export default async function ChapterPage({
  params
}: {
  params: { courseId: string; chapterId: string };
}) {
  const studentId = await getCurrentStudentId();

  // 1. Check akses
  const access = await canAccessChapter(studentId, params.chapterId);

  if (!access.canAccess) {
    return <ChapterLocked reason={access.reason} requiredChapter={access.requiredChapterId} />;
  }

  // 2. Get content
  const content = await getChapterContent(params.chapterId);

  return (
    <div>
      <h1>{content.title}</h1>
      <VideoPlayer videoUrl={content.videoUrl} />
      <QuizSection quizzes={content.quizzes} chapterId={params.chapterId} />
    </div>
  );
}
```

### 8.3 Server Actions untuk Mutations

```typescript
// actions/progress.ts

"use server";

import { revalidatePath } from "next/cache";
import { calculateAndSaveChapterScore } from "@/lib/services/progress";

export async function submitQuizResult(formData: FormData) {
  const attemptId = formData.get("attemptId") as string;
  const score = parseInt(formData.get("score") as string);

  await saveQuizAttempt(attemptId, score);

  // Revalidate
  revalidatePath("/dashboard");
  revalidatePath("/courses/*");

  return { success: true };
}

export async function completeChapter(formData: FormData) {
  const chapterId = formData.get("chapterId") as string;
  const watchedSeconds = parseInt(formData.get("watchedSeconds") as string);
  const studentId = await getCurrentStudentId();

  await calculateAndSaveChapterScore(studentId, chapterId, watchedSeconds);

  revalidatePath("/dashboard");
  revalidatePath(`/courses/*/chapters/${chapterId}`);
}
```

---

## 9. Configuration Summary

| Configuration | Default | Description |
|---------------|---------|-------------|
| `quizPassingScore` | 70 | Minimum score to pass a quiz |
| `chapterPassingScore` | 65 | Minimum chapter score for completion |
| `quiz-lesson score` | 100 | Auto score if chapter has no quiz |
| `courseCompletionThreshold` | 100% | All chapters must be completed |

---

## 10. v2 Considerations

### 10.1 Recommended Improvements

1. **Weighted Quiz Score**
   - Different quizzes with different weights
   - Example: Final chapter quiz more important than mid-chapter quiz

2. **Minimum Attempt Requirement**
   - Require minimum X attempts before being considered passed
   - Or use highest score from all attempts

3. **Flexible Passing Threshold**
   - Per-quiz passing score configurable per course/chapter
   - Not hardcoded values

4. **Partial Chapter Completion**
   - Can complete per lesson instead of per chapter
   - More granular progress tracking

5. **Grace Period**
   - Student can access next chapter even if not fully passed
   - With warning or certain limits

### 10.2 Schema Recommendations for v2

```sql
-- Course Configuration Table
CREATE TABLE course_config (
  id                      UUID    PRIMARY KEY,
  course_id               UUID    NOT NULL REFERENCES courses(id),
  chapter_passing_score   INTEGER NOT NULL DEFAULT 65,
  quiz_passing_score      INTEGER NOT NULL DEFAULT 70,
  min_quiz_attempts       INTEGER NULL,
  allow_grace_access      BOOLEAN NOT NULL DEFAULT false,
  grace_score_threshold   INTEGER NULL,
  use_weighted_quizzes    BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Quiz with weight support
CREATE TABLE quizzes (
  id              UUID    PRIMARY KEY,
  chapter_id      UUID    NOT NULL REFERENCES chapters(id),
  title           VARCHAR NOT NULL,
  passing_score   INTEGER NOT NULL DEFAULT 70,
  weight          INTEGER NOT NULL DEFAULT 1,
  position        INTEGER NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 11. Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    courses   │ 1    N  │   chapters   │ 1    N  │    quizzes   │
├──────────────┤◄───────►├──────────────┤◄───────►├──────────────┤
│ id           │         │ id           │         │ id           │
│ title        │         │ course_id    │         │ chapter_id   │
│              │         │ title        │         │ title        │
│              │         │ position     │         │ passing_score│
└──────────────┘         │ isFree       │         │ weight       │
                         │ video_url    │         └──────┬───────┘
                         └──────────────┘               │
                               │                         │ N
                               │ N                       ▼
                               ▼                  ┌──────────────┐
┌──────────────┐         ┌──────────────┐       │ quiz_attempts│
│ certificates │         │ user_progress │       ├──────────────┤
├──────────────┤         ├──────────────┤       │ id           │
│ id           │         │ id           │       │ quiz_id      │
│ student_id   │         │ student_id    │       │ student_id   │
│ course_id    │         │ chapter_id    │       │ score        │
│ cert_number  │         │ score         │       │ started_at   │
│ pdf_url      │         │ is_completed  │       │ completed_at │
│ issue_date   │         │ completed_at  │       └──────────────┘
└──────────────┘         └──────────────┘
```

---

*Document version: 2.0*
*Last updated: February 2026*
*Note: Architecture documentation for Next.js Server Components (v2)*
