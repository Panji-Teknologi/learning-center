import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  pdf,
  Image,
} from "@react-pdf/renderer";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";

interface CertificateData {
  certificate: {
    id: string;
    certificateNumber: string;
    issueDate: Date;
  };
  student: {
    user: {
      name: string | null;
      email: string | null;
    };
  };
  course: {
    title: string;
    description: string | null;
    level: string;
    teacher: {
      user: {
        name: string | null;
      };
      company?: {
        name: string;
        logoUrl: string | null;
      } | null;
    };
    category?: {
      name: string;
    } | null;
  };
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Helvetica",
  },
  border: {
    border: "3px solid #1e40af",
    borderRadius: 8,
    padding: 20,
    height: "100%",
    position: "relative",
  },
  innerBorder: {
    border: "1px solid #1e40af",
    borderRadius: 4,
    padding: 25,
    height: "100%",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
    textAlign: "center",
  },
  decorativeLine: {
    width: 150,
    height: 2,
    backgroundColor: "#f59e0b",
    marginBottom: 20,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  certifyText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 15,
    textAlign: "center",
  },
  studentName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 15,
    textAlign: "center",
  },
  completionText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 15,
    textAlign: "center",
    maxWidth: "80%",
  },
  courseDetails: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 15,
    textAlign: "center",
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 10,
    textAlign: "center",
  },
  certificateId: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  signatureSection: {
    alignItems: "center",
    minWidth: 120,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10,
  },
  signatureLine: {
    width: 100,
    height: 1,
    backgroundColor: "#000000",
  },
  logoSection: {
    alignItems: "center",
    marginTop: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
    textAlign: "center",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 60,
    color: "#f8f9fa",
    opacity: 0.1,
    fontWeight: "bold",
    zIndex: -1,
  },
});

// Helper function to get secure image URL
async function getSecureImageUrl(imageKey: string): Promise<string | null> {
  if (!imageKey) return null;

  try {
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600, // 1 hour
    });

    return signedUrl;
  } catch (error) {
    console.error("Error generating secure image URL:", error);
    return null;
  }
}

// Certificate Document Component
const CertificateDocument: React.FC<{
  data: CertificateData;
  companyLogoUrl?: string | null;
}> = ({ data, companyLogoUrl }) => {
  const studentName = data.student.user.name || "Student";
  const courseTitle = data.course.title;
  const courseLevel =
    data.course.level.charAt(0).toUpperCase() +
    data.course.level.slice(1).toLowerCase();
  const categoryName = data.course.category?.name || "General";
  const instructorName = data.course.teacher.user.name || "Instructor";
  const companyName = data.course.teacher.company?.name || "Learning Center";

  const issueDate = new Date(data.certificate.issueDate);
  const formattedDate = issueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            {/* Watermark */}
            <Text style={styles.watermark}>CERTIFIED</Text>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>CERTIFICATE OF COMPLETION</Text>
              <View style={styles.decorativeLine} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.certifyText}>This is to certify that</Text>
              <Text style={styles.studentName}>{studentName}</Text>
              <Text style={styles.completionText}>
                has successfully completed the online course
              </Text>
              <Text style={styles.courseTitle}>{courseTitle}</Text>
              <Text style={styles.courseDetails}>
                Level: {courseLevel} | Category: {categoryName}
              </Text>
              <Text style={styles.dateText}>Issued on {formattedDate}</Text>
              <Text style={styles.certificateId}>
                Certificate ID: {data.certificate.certificateNumber}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              {/* Instructor Signature */}
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Instructor:</Text>
                <Text style={styles.signatureName}>{instructorName}</Text>
                <View style={styles.signatureLine} />
              </View>

              {/* Company Logo and Name */}
              <View style={styles.logoSection}>
                {companyLogoUrl && (
                  <Image style={styles.logo} src={companyLogoUrl} />
                )}
                <Text style={styles.companyName}>{companyName}</Text>
              </View>

              {/* Company Signature */}
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Issued by:</Text>
                <Text style={styles.signatureName}>{companyName}</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function generateCertificatePDF(
  data: CertificateData
): Promise<string> {
  try {
    // Create PDF document
    // Get secure company logo URL if available
    let companyLogoUrl: string | null = null;
    if (data.course.teacher.company?.logoUrl) {
      companyLogoUrl = await getSecureImageUrl(
        data.course.teacher.company.logoUrl
      );
    }
    // Create PDF document with secure logo URL
    const doc = (
      <CertificateDocument data={data} companyLogoUrl={companyLogoUrl} />
    );

    // Generate PDF buffer
    const pdfBlob = await pdf(doc).toBlob();
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const fileName = `certificates/cert_${
      data.certificate.certificateNumber
    }_${Date.now()}.pdf`;
    const uploadResult = await uploadToS3(
      pdfBuffer,
      fileName,
      "application/pdf"
    );

    return uploadResult.Location || uploadResult.url;
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    throw new Error("Failed to generate certificate PDF");
  }
}

// Helper function to validate certificate data
export function validateCertificateData(data: any): data is CertificateData {
  return (
    data &&
    data.certificate &&
    data.student &&
    data.course &&
    data.student.user &&
    data.course.teacher
  );
}

// Upload PDF buffer to S3
async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ Location?: string; url: string }> {
  try {
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "max-age=31536000", // 1 year cache
      Metadata: {
        uploadedAt: new Date().toISOString(),
        type: "certificate",
      },
    });

    await s3Client.send(uploadCommand);

    // Return the URL where the file can be accessed
    const url = `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    return {
      Location: url,
      url: url,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload certificate to S3");
  }
}

// Function to regenerate certificate (if needed)
export async function regenerateCertificate(certificateId: string) {
  // Implementation for regenerating certificates
  // Useful for updating certificate templates or fixing issues
}
