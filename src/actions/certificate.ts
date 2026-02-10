"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { generateCertificatePDF } from "@/lib/services/certificate-service";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

export async function generateCertificate(courseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { error: "Unauthorized", message: "Please sign in first" };
    }

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

    const validation = await validateCourseCompletion(student.id, courseId);
    if (!validation.isComplete) {
      return {
        error: "Not completed",
        message: validation.message || "Complete all chapters to get certificate"
      };
    }

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

    const pdfUrl = await generateCertificatePDF(certificateData);

    const updatedCertificate = await db.certificate.update({
      where: { id: certificate.id },
      data: { pdfUrl },
    });

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
