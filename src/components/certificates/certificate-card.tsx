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
