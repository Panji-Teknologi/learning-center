# Quiz System - Migration Guide (API Routes → Server Actions & Server Components)

---

# STUDENT SECTION

## Student API Routes (Current)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/student/quizzes` | GET | Get quizzes (filter by `chapterId` or `quizId`) |
| `/api/student/quiz-attempts` | GET | Get student's attempt history |
| `/api/student/quiz-attempts` | POST | Submit quiz attempt with answers |

---

## Student Server Components

### 1. Quiz List Page

```typescript
// src/app/courses/[courseId]/chapters/[chapterId]/quizzes/page.tsx
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { redirect } from 'next/navigation';
import QuizCard from '@/components/QuizCard';

async function getStudentQuizzes(chapterId: string, userId: string) {
  const studentProfile = await db.studentProfile.findUnique({
    where: { userId }
  });

  if (!studentProfile) return null;

  const quizzes = await db.quiz.findMany({
    where: { chapterId },
    include: {
      questions: { include: { options: true } },
      attempts: {
        where: { studentId: studentProfile.id },
        select: { id: true, score: true, completedAt: true }
      }
    }
  });

  return quizzes.map(quiz => ({
    ...quiz,
    _attemptData: calculateAttemptMetadata(quiz.attempts, quiz.passingScore)
  }));
}

function calculateAttemptMetadata(attempts: any[], passingScore: number) {
  return {
    hasAttempted: attempts.length > 0,
    bestScore: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0,
    totalAttempts: attempts.length,
    hasPassed: attempts.some(a => a.score >= passingScore),
    attemptsRemaining: Math.max(0, 3 - attempts.length)
  };
}

export default async function QuizListPage({
  params
}: {
  params: Promise<{ courseId: string; chapterId: string }>
}) {
  const { courseId, chapterId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const quizzes = await getStudentQuizzes(chapterId, session.user.id);

  if (!quizzes) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quizzes</h1>
      {quizzes.map(quiz => (
        <QuizCard key={quiz.id} quiz={quiz} chapterId={chapterId} />
      ))}
    </div>
  );
}
```

### 2. Quiz Detail Page

```typescript
// src/app/courses/[courseId]/chapters/[chapterId]/quizzes/[quizId]/page.tsx
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { redirect } from 'next/navigation';
import QuizForm from '@/components/QuizForm';
import QuizResult from '@/components/QuizResult';

async function getQuizWithAccess(quizId: string, userId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { options: true } },
      chapter: {
        include: {
          course: {
            include: {
              enrolledStudents: {
                where: { studentId: userId, status: 'COMPLETED' }
              }
            }
          }
        }
      },
      attempts: {
        where: { studentId: userId },
        orderBy: { completedAt: 'desc' },
        take: 3
      }
    }
  });

  if (!quiz) return null;

  const hasAccess = quiz.chapter.isFree ||
    quiz.chapter.course.enrolledStudents.length > 0;

  if (!hasAccess) return { accessDenied: true };

  return {
    ...quiz,
    _attemptData: {
      hasAttempted: quiz.attempts.length > 0,
      bestScore: Math.max(0, ...quiz.attempts.map(a => a.score)),
      totalAttempts: quiz.attempts.length,
      hasPassed: quiz.attempts.some(a => a.score >= quiz.passingScore),
      canRetake: quiz.attempts.length < 3,
      attemptsRemaining: Math.max(0, 3 - quiz.attempts.length)
    }
  };
}

export default async function QuizDetailPage({
  params
}: {
  params: Promise<{ courseId: string; chapterId: string; quizId: string }>
}) {
  const { courseId, chapterId, quizId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const quiz = await getQuizWithAccess(quizId, session.user.id);

  if (!quiz) {
    redirect('/dashboard');
  }

  if ('accessDenied' in quiz) {
    return <div className="p-8 text-center">Access denied to this quiz</div>;
  }

  const attemptsRemaining = quiz._attemptData.attemptsRemaining;
  const lastAttempt = quiz.attempts[0];
  const hasPassed = lastAttempt && lastAttempt.score >= quiz.passingScore;

  if (attemptsRemaining === 0 && !lastAttempt) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">No Attempts Remaining</h1>
        <p>You have used all 3 attempts for this quiz.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        {quiz.description && (
          <p className="text-gray-600 mt-2">{quiz.description}</p>
        )}
        <div className="flex gap-4 mt-4 text-sm text-gray-500">
          <span>Questions: {quiz.questions.length}</span>
          <span>Passing Score: {quiz.passingScore}%</span>
          <span>Attempts Remaining: {attemptsRemaining}</span>
        </div>
      </div>

      {lastAttempt && (
        <QuizResult
          score={lastAttempt.score}
          passed={hasPassed}
          passingScore={quiz.passingScore}
          onRetake={attemptsRemaining > 0}
        />
      )}

      <QuizForm quiz={quiz} />
    </div>
  );
}
```

---

## Student Server Actions

```typescript
// src/actions/student/quiz-actions.ts
'use server'

import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const submitAttemptSchema = z.object({
  quizId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string().optional(),
    textAnswer: z.string().optional()
  }))
});

type SubmitAttemptResult =
  | { success: true; score: number; passed: boolean; error?: never }
  | { success: false; error: string; score?: never; passed?: never };

export async function submitQuizAttempt(
  input: z.infer<typeof submitAttemptSchema>
): Promise<SubmitAttemptResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validation = submitAttemptSchema.safeParse(input);

  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  const { quizId, answers } = validation.data;

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!studentProfile) {
    return { success: false, error: 'Student profile not found' };
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { options: true } },
      chapter: {
        include: {
          course: {
            include: {
              enrolledStudents: {
                where: { studentId: studentProfile.id, status: 'COMPLETED' }
              }
            }
          }
        }
      }
    }
  });

  if (!quiz) {
    return { success: false, error: 'Quiz not found' };
  }

  const hasAccess = quiz.chapter.isFree ||
    quiz.chapter.course.enrolledStudents.length > 0;

  if (!hasAccess) {
    return { success: false, error: 'Access denied' };
  }

  const userProgress = await db.userProgress.upsert({
    where: {
      studentId_chapterId: {
        studentId: studentProfile.id,
        chapterId: quiz.chapterId
      }
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      chapterId: quiz.chapterId,
      watchedSeconds: 0,
      isCompleted: false
    }
  });

  const quizAttempt = await db.quizAttempt.create({
    data: {
      quizId,
      studentId: studentProfile.id,
      userProgressId: userProgress.id,
      score: 0,
      startedAt: new Date()
    }
  });

  let totalPoints = 0;
  let earnedPoints = 0;
  const studentAnswers = [];

  for (const answer of answers) {
    const question = quiz.questions.find(q => q.id === answer.questionId);
    if (!question) continue;

    totalPoints += question.points;

    let isCorrect = false;
    let pointsEarned = 0;

    if (
      question.type === 'MULTIPLE_CHOICE' ||
      question.type === 'SINGLE_CHOICE' ||
      question.type === 'TRUE_FALSE'
    ) {
      const correctOption = question.options.find(o => o.isCorrect);
      if (correctOption && answer.selectedOptionId === correctOption.id) {
        isCorrect = true;
        pointsEarned = question.points;
      }
    }

    earnedPoints += pointsEarned;

    studentAnswers.push({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId || null,
      textAnswer: answer.textAnswer || null,
      attemptId: quizAttempt.id,
      isCorrect,
      pointsEarned
    });
  }

  await db.studentAnswer.createMany({ data: studentAnswers });

  const scorePercentage = totalPoints > 0
    ? Math.round((earnedPoints / totalPoints) * 100)
    : 0;

  await db.quizAttempt.update({
    where: { id: quizAttempt.id },
    data: { score: scorePercentage, completedAt: new Date() }
  });

  revalidatePath(`/courses/${quiz.chapter.courseId}/chapters/${quiz.chapterId}`);

  return {
    success: true,
    score: scorePercentage,
    passed: scorePercentage >= quiz.passingScore
  };
}

export async function getAttemptHistory(quizId: string) {
  const session = await auth();

  if (!session?.user) {
    return [];
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!studentProfile) {
    return [];
  }

  return db.quizAttempt.findMany({
    where: { quizId, studentId: studentProfile.id },
    include: {
      answers: {
        include: {
          question: { select: { text: true, explanation: true } },
          selectedOption: { select: { text: true, isCorrect: true } }
        }
      }
    },
    orderBy: { startedAt: 'desc' }
  });
}
```

---

## Student Client Components

```typescript
// src/components/QuizForm.tsx
'use client'

import { useState } from 'react';
import { submitQuizAttempt } from '@/actions/student/quiz-actions';

interface QuizFormProps {
  quiz: QuizWithQuestions;
  onComplete?: (result: { score: number; passed: boolean }) => void;
}

export default function QuizForm({ quiz, onComplete }: QuizFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await submitQuizAttempt({
      quizId: quiz.id,
      answers: quiz.questions.map(q => ({
        questionId: q.id,
        selectedOptionId: answers[q.id]
      }))
    });

    setSubmitting(false);

    if (result.success) {
      onComplete?.({ score: result.score, passed: result.passed });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      {quiz.questions.map((question, index) => (
        <div key={question.id} className="border p-4 rounded">
          <h3 className="font-medium">
            {index + 1}. {question.text}
          </h3>
          <div className="mt-2 space-y-2">
            {question.options.map(option => (
              <label key={option.id} className="flex items-center gap-2">
                <input
                  type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={(e) => setAnswers(prev => ({
                    ...prev,
                    [question.id]: e.target.value
                  }))}
                />
                {option.text}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <div className="text-red-500">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </div>
  );
}
```

```typescript
// src/components/QuizResult.tsx
'use client'

interface QuizResultProps {
  score: number;
  passed: boolean;
  passingScore: number;
  onRetake: boolean;
}

export default function QuizResult({
  score,
  passed,
  passingScore,
  onRetake
}: QuizResultProps) {
  return (
    <div className={`p-6 rounded-lg mb-6 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </h2>
          <p className="mt-1">
            You scored <strong>{score}%</strong> (Passing: {passingScore}%)
          </p>
        </div>
        {onRetake && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
}
```

---

# TEACHER SECTION

## Teacher API Routes (Current)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/teacher/quizzes` | GET | Get all quizzes (filter by `chapterId`) |
| `/api/teacher/quizzes` | POST | Create new quiz |
| `/api/teacher/quizzes/[quizId]` | PATCH | Update quiz details |
| `/api/teacher/quizzes/[quizId]` | DELETE | Delete quiz |
| `/api/teacher/questions` | GET | Get questions (filter by `chapterId` or `quizId`) |
| `/api/teacher/questions` | POST | Create question |
| `/api/teacher/question-options` | POST | Create question option |
| `/api/teacher/question-options/[optionId]` | GET | Get single option |
| `/api/teacher/question-options/[optionId]` | PATCH | Update option |
| `/api/teacher/question-options/[optionId]` | DELETE | Delete option |

---

## Teacher Server Components

### 1. Quiz List Page

```typescript
// src/app/teacher/quizzes/page.tsx
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { redirect } from 'next/navigation';
import QuizTable from '@/components/teacher/QuizTable';
import CreateQuizButton from '@/components/teacher/CreateQuizButton';

async function getTeacherQuizzes(chapterId?: string) {
  return db.quiz.findMany({
    where: chapterId ? { chapterId } : {},
    include: {
      questions: { include: { options: true } },
      chapter: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export default async function TeacherQuizPage({
  searchParams
}: {
  searchParams: Promise<{ chapterId?: string }>
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { chapterId } = await searchParams;
  const quizzes = await getTeacherQuizzes(chapterId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Quizzes</h1>
        <CreateQuizButton chapterId={chapterId} />
      </div>
      <QuizTable quizzes={quizzes} />
    </div>
  );
}
```

### 2. Quiz Editor Page

```typescript
// src/app/teacher/quizzes/[quizId]/page.tsx
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { redirect } from 'next/navigation';
import QuizEditor from '@/components/teacher/QuizEditor';

export default async function QuizEditorPage({
  params
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { createdAt: 'asc' }
      },
      chapter: { select: { title: true } }
    }
  });

  if (!quiz) {
    redirect('/teacher/quizzes');
  }

  return (
    <QuizEditor
      quiz={quiz}
      onUpdateQuestion={async (questionId, data) => {
        'use server'
        await db.question.update({ where: { id: questionId }, data });
        revalidatePath(`/teacher/quizzes/${quizId}`);
      }}
      onDeleteQuestion={async (questionId) => {
        'use server'
        await db.question.delete({ where: { id: questionId } });
        revalidatePath(`/teacher/quizzes/${quizId}`);
      }}
      onAddOption={async (questionId, option) => {
        'use server'
        await db.questionOption.create({
          data: { ...option, questionId }
        });
        revalidatePath(`/teacher/quizzes/${quizId}`);
      }}
      onDeleteOption={async (optionId) => {
        'use server'
        await db.questionOption.delete({ where: { id: optionId } });
        revalidatePath(`/teacher/quizzes/${quizId}`);
      }}
    />
  );
}
```

---

## Teacher Server Actions

```typescript
// src/actions/teacher/quiz-actions.ts
'use server'

import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  passingScore: z.number().min(0).max(100).default(70),
  chapterId: z.string()
});

const updateQuizSchema = z.object({
  quizId: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  passingScore: z.number().min(0).max(100).optional()
});

export async function createQuiz(input: z.infer<typeof createQuizSchema>) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const validation = createQuizSchema.safeParse(input);

  if (!validation.success) {
    return { error: 'Invalid input', details: validation.error.format() };
  }

  const quiz = await db.quiz.create({
    data: validation.data
  });

  revalidatePath('/teacher/quizzes');

  return { success: true, quiz };
}

export async function updateQuiz(input: z.infer<typeof updateQuizSchema>) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const { quizId, ...data } = input;

  const quiz = await db.quiz.update({
    where: { id: quizId },
    data
  });

  revalidatePath('/teacher/quizzes');
  revalidatePath(`/teacher/quizzes/${quizId}`);

  return { success: true, quiz };
}

export async function deleteQuiz(quizId: string) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  await db.quiz.delete({
    where: { id: quizId }
  });

  revalidatePath('/teacher/quizzes');

  return { success: true };
}

export async function createQuestion(input: {
  text: string;
  type: string;
  points?: number;
  explanation?: string;
  quizId: string;
}) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const question = await db.question.create({
    data: input
  });

  revalidatePath(`/teacher/quizzes/${input.quizId}`);

  return { success: true, question };
}

export async function updateQuestion(input: {
  questionId: string;
  text?: string;
  type?: string;
  points?: number;
  explanation?: string;
}) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const { questionId, ...data } = input;

  const question = await db.question.update({
    where: { id: questionId },
    data
  });

  revalidatePath(`/teacher/quizzes`);

  return { success: true, question };
}

export async function deleteQuestion(questionId: string) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  await db.question.delete({
    where: { id: questionId }
  });

  revalidatePath('/teacher/quizzes');

  return { success: true };
}

export async function createQuestionOption(input: {
  text: string;
  isCorrect: boolean;
  questionId: string;
}) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const option = await db.questionOption.create({
    data: input
  });

  revalidatePath('/teacher/quizzes');

  return { success: true, option };
}

export async function updateQuestionOption(input: {
  optionId: string;
  text?: string;
  isCorrect?: boolean;
}) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const { optionId, ...data } = input;

  const option = await db.questionOption.update({
    where: { id: optionId },
    data
  });

  revalidatePath('/teacher/quizzes');

  return { success: true, option };
}

export async function deleteQuestionOption(optionId: string) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  await db.questionOption.delete({
    where: { id: optionId }
  });

  revalidatePath('/teacher/quizzes');

  return { success: true };
}
```

---

## Teacher Client Components

```typescript
// src/components/teacher/CreateQuizForm.tsx
'use client'

import { useState } from 'react';
import { createQuiz } from '@/actions/teacher/quiz-actions';
import { useRouter } from 'next/navigation';

export default function CreateQuizForm({ chapterId }: { chapterId?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    const result = await createQuiz({
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || undefined,
      passingScore: Number(formData.get('passingScore')) || 70,
      timeLimit: Number(formData.get('timeLimit')) || undefined,
      chapterId: chapterId || (formData.get('chapterId') as string)
    });

    setLoading(false);

    if (result.success) {
      router.push(`/teacher/quizzes/${result.quiz.id}`);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input name="title" required className="border p-2 w-full rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea name="description" className="border p-2 w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Time Limit (min)</label>
          <input
            name="timeLimit"
            type="number"
            min="1"
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Passing Score (%)</label>
          <input
            name="passingScore"
            type="number"
            min="0"
            max="100"
            defaultValue="70"
            className="border p-2 w-full rounded"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded w-full"
      >
        {loading ? 'Creating...' : 'Create Quiz'}
      </button>
    </form>
  );
}
```

```typescript
// src/components/teacher/QuizEditor.tsx
'use client'

import { useState } from 'react';
import { updateQuiz, deleteQuiz } from '@/actions/teacher/quiz-actions';

interface QuizEditorProps {
  quiz: QuizWithRelations;
  onUpdateQuestion: (questionId: string, data: any) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onAddOption: (questionId: string, option: any) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
}

export default function QuizEditor({
  quiz,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddOption,
  onDeleteOption
}: QuizEditorProps) {
  const [editingQuiz, setEditingQuiz] = useState(false);

  async function handleUpdateQuiz(formData: FormData) {
    await updateQuiz({
      quizId: quiz.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      passingScore: Number(formData.get('passingScore'))
    });
    setEditingQuiz(false);
  }

  async function handleDeleteQuiz() {
    if (confirm('Are you sure you want to delete this quiz?')) {
      await deleteQuiz(quiz.id);
      window.location.href = '/teacher/quizzes';
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="text-gray-500">{quiz.chapter.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingQuiz(!editingQuiz)}
            className="px-4 py-2 border rounded"
          >
            Edit Quiz
          </button>
          <button
            onClick={handleDeleteQuiz}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {editingQuiz && (
        <form action={handleUpdateQuiz} className="bg-gray-50 p-4 rounded mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input
                name="title"
                defaultValue={quiz.title}
                className="border p-2 w-full rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                name="description"
                defaultValue={quiz.description || ''}
                className="border p-2 w-full rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Passing Score (%)</label>
              <input
                name="passingScore"
                type="number"
                min="0"
                max="100"
                defaultValue={quiz.passingScore}
                className="border p-2 w-full rounded"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Save Changes
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Questions ({quiz.questions.length})</h2>
          <button className="px-4 py-2 bg-green-600 text-white rounded">
            Add Question
          </button>
        </div>

        {quiz.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={(data) => onUpdateQuestion(question.id, data)}
            onDelete={() => onDeleteQuestion(question.id)}
            onAddOption={(option) => onAddOption(question.id, option)}
            onDeleteOption={(optionId) => onDeleteOption(optionId)}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  onAddOption,
  onDeleteOption
}: any) {
  const [addingOption, setAddingOption] = useState(false);

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-gray-500 text-sm">Q{index + 1}</span>
          <h3 className="font-medium">{question.text}</h3>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            <span>{question.type}</span>
            <span>{question.points} pts</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="text-blue-600">Edit</button>
          <button onClick={onDelete} className="text-red-600">Delete</button>
        </div>
      </div>

      {question.options.length > 0 && (
        <div className="mt-3 space-y-1">
          {question.options.map((option: any) => (
            <div key={option.id} className="flex items-center gap-2 text-sm">
              <span className={option.isCorrect ? 'text-green-600 font-medium' : ''}>
                {option.isCorrect ? '✓' : '○'} {option.text}
              </span>
              <button
                onClick={() => onDeleteOption(option.id)}
                className="text-red-500 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {addingOption ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await onAddOption({
              text: formData.get('text') as string,
              isCorrect: formData.get('isCorrect') === 'on'
            });
            setAddingOption(false);
          }}
          className="mt-3 flex gap-2"
        >
          <input name="text" placeholder="Option text" required className="border p-2 rounded" />
          <label className="flex items-center gap-2">
            <input name="isCorrect" type="checkbox" />
            Correct
          </label>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">
            Add
          </button>
          <button
            type="button"
            onClick={() => setAddingOption(false)}
            className="px-3 py-2 border rounded"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAddingOption(true)}
          className="mt-3 text-sm text-blue-600"
        >
          + Add Option
        </button>
      )}
    </div>
  );
}
```

---

# SHARED SECTION

## Entity Relationships

```
Course
  └── Chapter
        └── Quiz
              ├── Question
              │     └── QuestionOption
              └── QuizAttempt
                    └── StudentAnswer
```

## Access Control Flow

```
Student Access to Quiz:
1. Check if chapter.isFree = true, OR
2. Check if student has COMPLETED enrollment in the course
```

## Attempt Limits & Scoring

| Rule | Value |
|------|-------|
| Max Attempts | 3 per quiz |
| Retake Eligibility | `totalAttempts < 3` |
| Passing Threshold | `score >= quiz.passingScore` |
| Score Calculation | `(earnedPoints / totalPoints) * 100` |

## Key Fields

### Quiz
- `id`, `title`, `description`, `timeLimit`, `passingScore`
- `chapterId` (FK)

### Question
- `id`, `text`, `type` (MULTIPLE_CHOICE, SINGLE_CHOICE, TRUE_FALSE, TEXT, NUMBER)
- `points`, `explanation`
- `quizId` (FK)

### QuestionOption
- `id`, `text`, `isCorrect`
- `questionId` (FK)

### QuizAttempt
- `id`, `score`, `startedAt`, `completedAt`
- `quizId` (FK), `studentId` (FK), `userProgressId` (FK)

### StudentAnswer
- `id`, `textAnswer`, `selectedOptionId`, `isCorrect`, `pointsEarned`
- `attemptId` (FK), `questionId` (FK)

## Service Integration

```typescript
// src/lib/services/quiz-score-service.ts
export async function updateUserProgressScore(studentId: string, chapterId: string) {
  // Calculates and updates chapter progress score
  // Called after each quiz submission
}
```

## Best Practices

### 1. Authentication Pattern

```typescript
// src/lib/auth-helpers.ts
import { auth } from '@/lib/auth';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireStudentProfile(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId }
  });
  if (!profile) {
    throw new Error('Student profile not found');
  }
  return profile;
}
```

### 2. Reusable Validation

```typescript
// src/lib/validations/quiz.ts
import { z } from 'zod';

export const questionOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean()
});

export const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'TEXT', 'NUMBER']),
  points: z.number().min(1).default(1),
  explanation: z.string().optional(),
  options: z.array(questionOptionSchema).min(2)
});

export const quizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  passingScore: z.number().min(0).max(100).default(70),
  chapterId: z.string(),
  questions: z.array(questionSchema).optional()
});
```

### 3. Error Handling

```typescript
// src/lib/actions.ts
export function actionError(error: unknown, fallbackMessage: string) {
  console.error(error);
  return { error: fallbackMessage };
}
```

---

## Migration Checklist

- [ ] Move GET handlers to Server Components
- [ ] Create Server Actions for POST/PATCH/DELETE
- [ ] Replace `revalidatePath` for cache invalidation
- [ ] Move auth checks to action entry points
- [ ] Create type-safe input schemas with Zod
- [ ] Convert client-side fetch to component props
- [ ] Add loading states with `useState` or `useTransition`
- [ ] Implement error boundaries for graceful failures
- [ ] Update import paths from `/api/*` to `/actions/*`
- [ ] Remove unused API route files
