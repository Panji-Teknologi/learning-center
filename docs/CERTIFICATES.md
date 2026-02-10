# Dokumen Panduan v2: Generate Certificate System

Dokumen ini menjelaskan improvement sistem certificate generation untuk e-learning platform v2, menggunakan **Server Actions** untuk menyederhanakan alur yang sebelumnya kompleks.

---

## 1. Arsitektur Sistem Certificate v2

### 1.1 Konsep Dasar

v2 menggunakan **Server Actions** untuk mutations (generate certificate) dengan akses database langsung melalui service functions. Pendekatan ini mengeliminasi kebutuhan API routes untuk operasi certificate, mengurangi kompleksitas, dan meningkatkan type safety.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Client Components (Server Actions Callers)                             │
│  ├─> CertificateButton (generate trigger)                              │
│  ├─> CertificateList (display all certificates)                        │
│  └─> CertificateCard (individual certificate view)                     │
│                                                                         │
│  Server Actions (Direct Mutations)                                      │
│  ├─> generateCertificate(courseId)                                     │
│  ├─> regenerateCertificate(certificateId)                             │
│  └─> verifyCertificate(certificateNumber)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ async function call
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Certificate Services                                                    │
│  ├─> generateCertificatePDF(data: CertificateData): Promise<string>    │
│  ├─> validateCourseCompletion(studentId, courseId): Promise<boolean>   │
│  ├─> getCertificateById(id): Promise<Certificate | null>               │
│  ├─> getCertificatesByStudent(studentId): Promise<Certificate[]>       │
│  └─> checkCertificateExists(studentId, courseId): Promise<boolean>     │
│                                                                         │
│  Business Logic                                                         │
│  ├─> Course completion validation                                      │
│  ├─> Certificate number generation                                      │
│  ├─> PDF generation & S3 upload                                        │
│  └─> Database record management                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ db query
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Tables                                                                 │
│  ├─> certificates (main certificate records)                           │
│  ├─> user_progress (chapter completion status)                         │
│  ├─> enrolled_courses (enrollment tracking)                            │
│  └─> courses/chapters (course structure)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Mengapa Server Actions?

| Aspect | API Route (v1) | Server Action (v2) |
|--------|----------------|-------------------|
| **Endpoint** | `POST /api/courses/[id]/generate-certificate` | `generateCertificate(courseId)` |
| **Code Size** | ~150 lines per file | ~50 lines per function |
| **Type Safety** | Indirect (fetch + response) | Direct (function return) |
| **Error Handling** | try/catch + response | Simple return objects |
| **Revalidation** | Manual fetch | `revalidatePath()` |

**Key Benefits:**
- Eliminated API routes for mutations
- Direct database access from server
- Native Next.js cache revalidation
- Better TypeScript inference
- Simpler code structure

---

## 2. Data Flow Pattern (v2)

### 2.1 Certificate Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Component (User Action)                                  │
│  <CertificateGenerateButton courseId={courseId} />              │
│         │                                                      │
│         │ onClick={() => generateCertificate(courseId)}        │
│         ▼                                                      │
│  Server Action                                                  │
│  "use server";                                                  │
│  async function generateCertificate(courseId) {                 │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. AUTH CHECK                                                  │
│     const session = await auth();                               │
│     if (!session) throw new Error("Unauthorized");              │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GET STUDENT DATA                                            │
│     const student = await getStudentProfile(userId);            │
│     if (!student) throw new Error("Student not found");         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. VALIDATE COURSE COMPLETION                                  │
│     const isComplete = await validateCourseCompletion(          │
│       student.id, courseId                                      │
│     );                                                          │
│     if (!isComplete) throw new Error("Not completed");          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CHECK EXISTING CERTIFICATE                                  │
│     const existing = await checkCertificateExists(              │
│       student.id, courseId                                      │
│     );                                                          │
│     if (existing) return existing;                              │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. GENERATE CERTIFICATE NUMBER                                 │
│     const certNumber = generateCertificateNumber();             │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CREATE DB RECORD                                            │
│     const certificate = await db.certificate.create({           │
│       data: {                                                    │
│         certificateNumber: certNumber,                          │
│         studentId: student.id,                                  │
│         courseId,                                               │
│         issueDate: new Date(),                                  │
│       }                                                         │
│     });                                                         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. PREPARE CERTIFICATE DATA                                    │
│     const data = {                                               │
│       certificate: { id: cert.id, ... },                         │
│       student: { user: { name: student.user.name } },           │
│       course: { title: course.title, ... },                     │
│     };                                                          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. GENERATE PDF & UPLOAD TO S3                                 │
│     const pdfUrl = await generateCertificatePDF(data);          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. UPDATE DB RECORD                                            │
│     const updated = await db.certificate.update({               │
│       where: { id: certificate.id },                             │
│       data: { pdfUrl },                                          │
│     });                                                          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. RETURN RESULT                                              │
│     revalidatePath("/dashboard");                                │
│     return { success: true, certificate: updated };             │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
         Client receives result & UI auto-updates
```

### 2.2 Comparison: Before vs After

| Metric | Before (v1) | After (v2) |
|--------|-------------|------------|
| **Files Required** | 6 | 4 |
| **Lines of Code** | ~500+ | ~200 |
| **API Routes** | 5 | 0 (deleted) |
| **Server Actions** | 0 | 3 |
| **Type Safety** | Indirect | Direct |
| **Error Handling** | try/catch + response | Simple return objects |
| **Code Duplication** | High | None (consolidated) |
| **Bundle Size** | Larger | Smaller |
| **Loading States** | Manual | `useTransition` |
| **Cache Revalidation** | Manual fetch | `revalidatePath()` |

---

## 3. Implementation Guide v2

### 3.1 Directory Structure

```
src/
├── actions/
│   └── certificate.ts              # Server Actions (v2)
│
├── lib/
│   └── services/
│       └── certificate-service.ts  # PDF generation (existing)
│
├── hooks/
│   └── use-certificates.ts         # React Query hooks (read-only)
│
└── components/
    └── certificates/
        ├── certificate-button.tsx  # Generate trigger
        ├── certificate-list.tsx    # Display certificates
        └── certificate-card.tsx    # Individual certificate
```

### 3.2 Step-by-Step Implementation

#### Step 1: Create Server Actions

**File:** `actions/certificate.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { generateCertificatePDF } from "@/lib/services/certificate-service";
import { randomBytes } from "crypto";

/**
 * Generate certificate for a completed course
 */
export async function generateCertificate(courseId: string) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.email) {
      return { error: "Unauthorized", message: "Please sign in first" };
    }

    // 2. Get user & student
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { error: "User not found", message: "User account not found" };
    }

    const student = await db.studentProfile.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!student) {
      return { error: "Student not found", message: "Please complete onboarding" };
    }

    // 3. Check enrollment
    const enrollment = await db.enrolledCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: courseId,
        },
      },
    });

    if (!enrollment) {
      return { error: "Not enrolled", message: "Please enroll in this course first" };
    }

    // 4. Validate course completion
    const validation = await validateCourseCompletion(student.id, courseId);
    if (!validation.isComplete) {
      return {
        error: "Not completed",
        message: validation.message || "Complete all chapters to get certificate"
      };
    }

    // 5. Check existing certificate
    const existingCert = await db.certificate.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: courseId,
        },
      },
    });

    if (existingCert) {
      return {
        success: true,
        certificate: existingCert,
        message: "Certificate already exists"
      };
    }

    // 6. Get course data
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: { user: true, company: true },
        },
        category: true,
      },
    });

    if (!course) {
      return { error: "Course not found", message: "Course does not exist" };
    }

    // 7. Generate certificate & create record
    const certificateNumber = generateCertificateNumber();

    const certificate = await db.certificate.create({
      data: {
        certificateNumber,
        studentId: student.id,
        courseId: courseId,
        issueDate: new Date(),
        pdfUrl: "",
      },
    });

    // 8. Prepare data for PDF
    const certificateData = {
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate,
      },
      student: {
        user: {
          name: student.user.name,
          email: student.user.email,
        },
      },
      course: {
        title: course.title,
        description: course.description,
        level: course.level,
        teacher: {
          user: { name: course.teacher.user.name },
          company: course.teacher.company,
        },
        category: course.category,
      },
    };

    // 9. Generate PDF & update record
    const pdfUrl = await generateCertificatePDF(certificateData);

    const updatedCertificate = await db.certificate.update({
      where: { id: certificate.id },
      data: { pdfUrl },
    });

    // 10. Revalidate & return
    revalidatePath("/dashboard");
    revalidatePath("/certificates");
    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      certificate: updatedCertificate,
      message: "Certificate generated successfully!"
    };

  } catch (error) {
    console.error("[GENERATE_CERTIFICATE]", error);
    return { error: "Failed", message: "An error occurred while generating certificate" };
  }
}

/**
 * Regenerate certificate (for re-download or PDF refresh)
 */
export async function regenerateCertificate(certificateId: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { error: "Unauthorized" };
    }

    const certificate = await db.certificate.findUnique({
      where: { id: certificateId },
      include: {
        student: { include: { user: true } },
        course: {
          include: {
            teacher: { include: { user: true, company: true } },
            category: true,
          },
        },
      },
    });

    if (!certificate) {
      return { error: "Certificate not found" };
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (certificate.student.userId !== user?.id) {
      return { error: "Access denied" };
    }

    const certificateData = {
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate,
      },
      student: {
        user: {
          name: certificate.student.user.name,
          email: certificate.student.user.email,
        },
      },
      course: {
        title: certificate.course.title,
        description: certificate.course.description,
        level: certificate.course.level,
        teacher: {
          user: { name: certificate.course.teacher.user.name },
          company: certificate.course.teacher.company,
        },
        category: certificate.course.category,
      },
    };

    const pdfUrl = await generateCertificatePDF(certificateData);

    const updated = await db.certificate.update({
      where: { id: certificateId },
      data: { pdfUrl },
    });

    revalidatePath("/dashboard");
    revalidatePath("/certificates");

    return { success: true, certificate: updated };

  } catch (error) {
    console.error("[REGENERATE_CERTIFICATE]", error);
    return { error: "Failed to regenerate certificate" };
  }
}

/**
 * Verify certificate by certificate number (public endpoint)
 */
export async function verifyCertificate(certificateNumber: string) {
  try {
    const certificate = await db.certificate.findUnique({
      where: { certificateNumber },
      include: {
        student: { include: { user: { select: { name: true } } } },
        course: {
          select: {
            title: true,
            level: true,
            teacher: {
              select: {
                user: { select: { name: true } },
                company: { select: { name: true } },
              }
            },
            category: { select: { name: true } },
          },
        },
      },
    });

    if (!certificate) {
      return { valid: false, message: "Certificate not found" };
    }

    return {
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate.toISOString(),
        studentName: certificate.student.user.name,
        courseTitle: certificate.course.title,
        courseLevel: certificate.course.level,
        category: certificate.course.category?.name || "",
        instructor: certificate.course.teacher.user.name,
        institution: certificate.course.teacher.company?.name || "PT TSI",
      },
    };

  } catch (error) {
    console.error("[VERIFY_CERTIFICATE]", error);
    return { valid: false, message: "Verification failed" };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCertificateNumber(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

async function validateCourseCompletion(
  studentId: string,
  courseId: string
): Promise<{ isComplete: boolean; message?: string }> {
  const totalChapters = await db.chapter.count({
    where: { courseId },
  });

  if (totalChapters === 0) {
    return { isComplete: false, message: "Course has no chapters" };
  }

  const completedProgress = await db.userProgress.findMany({
    where: {
      studentId,
      chapter: { courseId },
      isCompleted: true,
    },
  });

  const completedCount = completedProgress.filter(
    (p) => (p.chapterScore ?? 0) >= 65
  ).length;

  if (completedCount < totalChapters) {
    return {
      isComplete: false,
      message: `Complete ${totalChapters - completedCount} more chapter(s) to finish`
    };
  }

  return { isComplete: true };
}
```

#### Step 2: Create Certificate Button Component

**File:** `components/certificates/certificate-button.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { generateCertificate } from "@/actions/certificate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CertificateButtonProps {
  courseId: string;
  isCompleted: boolean;
  hasCertificate?: boolean;
}

export function CertificateButton({
  courseId,
  isCompleted,
  hasCertificate,
}: CertificateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    certificate?: { pdfUrl: string; certificateNumber: string };
  }>({});

  const handleGenerate = () => {
    startTransition(async () => {
      const response = await generateCertificate(courseId);

      if (response.error) {
        toast.error(response.message || response.error);
        setResult({ error: response.error });
      } else if (response.success) {
        toast.success(response.message || "Certificate generated!");

        if (response.certificate?.pdfUrl) {
          window.open(response.certificate.pdfUrl, "_blank");
        }

        setResult({
          success: true,
          certificate: response.certificate
        });
      }
    });
  };

  if (!isCompleted) {
    return (
      <Button disabled variant="outline" className="w-full">
        Complete course to get certificate
      </Button>
    );
  }

  if (hasCertificate || result.success) {
    return (
      <div className="space-y-2">
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Downloading..." : "Download Certificate"}
        </Button>
        {result.certificate?.pdfUrl && (
          <p className="text-xs text-muted-foreground text-center">
            Certificate: {result.certificate.certificateNumber}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isPending ? "Generating..." : "Generate Certificate"}
      </Button>
      {result.error && (
        <p className="text-xs text-red-500 text-center">{result.error}</p>
      )}
    </div>
  );
}
```

#### Step 3: Create Certificate List Component (Server Component)

**File:** `components/certificates/certificate-list.tsx`

```typescript
import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CertificateCard } from "./certificate-card";
import { Skeleton } from "@/components/ui/skeleton";

async function getCertificates(userId: string) {
  const student = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!student) return [];

  return db.certificate.findMany({
    where: { studentId: student.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          level: true,
          category: { select: { name: true } },
          teacher: {
            select: {
              user: { select: { name: true } },
              company: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { issueDate: "desc" },
  });
}

function CertificateSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export async function CertificateList() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await getCertificates(session.user.id);

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No certificates yet</h3>
        <p className="text-muted-foreground mt-2">
          Complete courses to earn certificates
        </p>
        <Link
          href="/courses"
          className="text-primary hover:underline mt-4 inline-block"
        >
          Browse courses →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {certificates.map((cert) => (
        <CertificateCard key={cert.id} certificate={cert} />
      ))}
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">My Certificates</h1>

      <Suspense fallback={<CertificateSkeleton />}>
        <CertificateList />
      </Suspense>
    </div>
  );
}
```

#### Step 4: Create Certificate Card Component

**File:** `components/certificates/certificate-card.tsx`

```typescript
"use client";

import { regenerateCertificate } from "@/actions/certificate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";

interface CertificateCardProps {
  certificate: {
    id: string;
    certificateNumber: string;
    issueDate: Date;
    pdfUrl: string | null;
    course: {
      id: string;
      title: string;
      level: string;
      category: { name: string } | null;
      teacher: {
        user: { name: string | null };
        company: { name: string } | null;
      };
    };
  };
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  const handleDownload = () => {
    if (certificate.pdfUrl) {
      window.open(certificate.pdfUrl, "_blank");
    }
  };

  const handleRegenerate = async () => {
    const result = await regenerateCertificate(certificate.id);

    if (result.success) {
      toast.success("Certificate regenerated!");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to regenerate");
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="line-clamp-1">{certificate.course.title}</CardTitle>
            <CardDescription>{certificate.course.category?.name}</CardDescription>
          </div>
          <Badge variant="outline">{certificate.course.level}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Certificate ID</span>
            <span className="font-mono">{certificate.certificateNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issued</span>
            <span>{new Date(certificate.issueDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Instructor</span>
            <span>{certificate.course.teacher.user.name}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {certificate.pdfUrl ? (
          <>
            <Button onClick={handleDownload} className="flex-1" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleRegenerate}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button onClick={handleRegenerate} className="w-full" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 4. Hooks Refactoring (Read-Only)

Mutations now handled by Server Actions. Hooks only for read operations:

**File:** `hooks/use-certificates.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";

export interface Certificate {
  id: string;
  certificateNumber: string;
  issueDate: string;
  pdfUrl: string | null;
  course: {
    id: string;
    title: string;
    level: string;
    category: { name: string } | null;
    teacher: {
      user: { name: string | null };
      company: { name: string } | null;
    };
  };
}

/**
 * Fetch all certificates for current user
 */
export function useCertificates() {
  return useQuery<{ certificates: Certificate[] }>({
    queryKey: ["certificates"],
    queryFn: async () => {
      const response = await fetch("/api/certificates");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in");
        }
        throw new Error("Failed to load certificates");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single certificate
 */
export function useCertificate(certificateId: string | null) {
  return useQuery<{ certificate: Certificate }>({
    queryKey: ["certificate", certificateId],
    queryFn: async () => {
      if (!certificateId) throw new Error("ID required");

      const response = await fetch(`/api/certificates/${certificateId}`);
      if (!response.ok) throw new Error("Not found");

      return response.json();
    },
    enabled: !!certificateId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Verify certificate (public)
 */
export function useCertificateVerification(certificateNumber: string | null) {
  return useQuery<{
    valid: boolean;
    message?: string;
    certificate?: {
      certificateNumber: string;
      issueDate: string;
      studentName: string;
      courseTitle: string;
      courseLevel: string;
      category: string;
      instructor: string;
      institution: string;
    };
  }>({
    queryKey: ["verify", certificateNumber],
    queryFn: async () => {
      if (!certificateNumber) throw new Error("Number required");

      const response = await fetch(`/api/certificates/verify/${certificateNumber}`);

      if (response.status === 404) {
        return { valid: false, message: "Certificate not found" };
      }

      if (!response.ok) throw new Error("Verification failed");

      return response.json();
    },
    enabled: !!certificateNumber,
    retry: false,
  });
}
```

---

## 5. Migration Checklist

### Before Starting

- [ ] Backup existing certificate routes and hooks
- [ ] Review `certificate-service.tsx` for any custom logic
- [ ] Test existing API routes work before migration

### Migration Steps

1. **Create `actions/certificate.ts`**
   - Copy logic from API route
   - Add Server Action decorators
   - Consolidate helper functions

2. **Update UI Components**
   - Replace `useMutation` with Server Action calls
   - Use `useTransition` for loading states
   - Remove `fetch()` calls for certificate operations

3. **Simplify Hooks**
   - Remove mutation hooks (`useCertificateRegenerate`, etc.)
   - Keep only read hooks (`useCertificates`, `useCertificate`)
   - Delete unused API routes

4. **Test Flow**
   - Generate new certificate
   - Verify completion validation works
   - Test PDF download
   - Check revalidation works

5. **Cleanup**
   - Delete old API route files
   - Remove unused imports
   - Verify TypeScript compilation

---

## 6. API Routes to Remove

After migration, delete these files:

| File | Action |
|------|--------|
| `src/app/api/courses/[courseId]/generate-certificate/route.ts` | DELETE |
| `src/app/api/certificates/route.ts` | DELETE |
| `src/app/api/certificates/[id]/route.ts` | DELETE |
| `src/app/api/certificates/regenerate/route.ts` | DELETE |
| `src/app/api/certificates/download/route.ts` | DELETE (if only for certs) |
| `src/app/api/certificates/view/route.ts` | DELETE (if only for certs) |
| `src/hooks/use-certificates.ts` | KEEP (simplified) |

---

## 7. Error Handling Strategy

```typescript
// Server Action errors are returned as objects
const result = await generateCertificate(courseId);

if (result.error) {
  switch (result.error) {
    case "Unauthorized":
      // Redirect to login
      break;
    case "Not completed":
      // Show progress requirement
      break;
    default:
      // Show generic error
  }
}
```

---

## 8. Performance Considerations

### Caching Strategy

```typescript
// Server Action with caching
export async function getCertificate(id: string) {
  "use server";

  const cached = await getCachedCertificate(id);
  if (cached) return cached;

  const cert = await db.certificate.findUnique({ /* ... */ });
  await setCachedCertificate(id, cert, 600); // 10 minutes

  return cert;
}
```

### Batch Operations

```typescript
// Generate multiple certificates at once
export async function generateBulkCertificates(courseIds: string[]) {
  "use server";

  const results = await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        return await generateCertificate(courseId);
      } catch (error) {
        return { courseId, error: true };
      }
    })
  );

  revalidatePath("/dashboard");
  return results;
}
```

---

## 9. Quick Reference

### Available Server Actions

```typescript
import {
  generateCertificate,      // Generate cert for completed course
  regenerateCertificate,   // Regenerate PDF
  verifyCertificate,       // Public verification
} from "@/actions/certificate";
```

### Usage in Components

```typescript
// Simple button form
<form action={generateCertificate.bind(null, courseId)}>
  <button type="submit">Generate</button>
</form>

// With loading state
<button
  onClick={() => startTransition(() => generateCertificate(id))}
  disabled={isPending}
>
  {isPending ? "Generating..." : "Generate"}
</button>

// With result handling
const [result, setResult] = useState({});
startTransition(async () => {
  const res = await generateCertificate(id);
  setResult(res);
});
```

### Revalidation Paths

```typescript
// After certificate operations
revalidatePath("/dashboard");           // Main dashboard
revalidatePath("/certificates");        // Certificate list
revalidatePath(`/courses/${courseId}`); // Course detail
```

---

*Document version: 1.0*
*Last updated: February 2026*
*Based on PROGRESS_SYSTEM.md pattern*
*For v2 e-learning platform migration*
