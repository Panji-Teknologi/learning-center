import { Suspense } from "react";
import Link from "next/link";
import db from "@/lib/db/db";
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

  const userId = session.user.id;
  if (!userId) redirect("/login");

  const certificates = await getCertificates(userId);

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
