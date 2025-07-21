import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET_NAME, s3Client } from "@/lib/s3";
import db from "@/lib/db/db";

/**
 * GET: Generate a secure signed URL for certificate viewing
 * Required query params: certificateId
 * Returns: { url: string, expiresIn: number }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateId = searchParams.get("certificateId");

    if (!certificateId) {
      return NextResponse.json(
        { error: "Missing required parameter: certificateId" },
        { status: 400 }
      );
    }

    // Authentication required
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get certificate and verify ownership
    const certificate = await db.certificate.findUnique({
      where: { id: certificateId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        teacherProfile: true,
        studentProfile: true,
      },
    });

    const isTeacher = user?.teacherProfile !== null;
    // Verify the certificate belongs to the current user
    if (certificate.student.user.email !== session.user.email && !isTeacher) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!certificate.pdfUrl) {
      return NextResponse.json(
        { error: "Certificate PDF not available" },
        { status: 404 }
      );
    }

    // Extract S3 key from the full URL
    // Example: "https://is3.cloudhost.id/e-learning/certificates/cert_CERT-202507-0001_1751641894006.pdf"
    // Expected bucket: "e-learning/"
    // Expected key: "certificates/cert_CERT-202507-0001_1751641894006.pdf"
    const url = new URL(certificate.pdfUrl);
    const fullPath = url.pathname.substring(1); // Remove leading slash

    // Remove bucket name from path to get the key
    const bucketName = "e-learning/";
    let key = fullPath;
    if (fullPath.startsWith(bucketName)) {
      key = fullPath.substring(bucketName.length);
    }

    // Generate signed URL for viewing (inline display)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `inline; filename="certificate_${certificate.certificateNumber}.pdf"`,
      ResponseContentType: "application/pdf",
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 1800, // 30 minutes for viewing
    });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 1800,
    });
  } catch (error) {
    console.error("[CERTIFICATE_VIEW]", error);
    return NextResponse.json(
      { error: "Failed to generate certificate view URL" },
      { status: 500 }
    );
  }
}
