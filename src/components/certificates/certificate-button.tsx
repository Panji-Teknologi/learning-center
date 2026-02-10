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
    certificate?: { pdfUrl: string | null; certificateNumber: string };
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
