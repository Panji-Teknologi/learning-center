"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StudentCertificate } from "@/lib/types/student-detail";

// Types
export interface Certificate {
  id: string;
  certificateNumber: string;
  issueDate: string;
  pdfUrl: string | null;
  course: {
    id: string;
    title: string;
    level: string;
    category: {
      name: string;
    } | null;
    teacher: {
      user: {
        name: string | null;
      };
      company: {
        name: string;
      } | null;
    };
  };
}

export interface CertificateVerification {
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
}

type CertificatesResponse = {
  certificates: Certificate[];
};

// Main hook for fetching all certificates
export const useCertificates = () => {
  return useQuery<CertificatesResponse>({
    queryKey: ["certificates"],
    queryFn: async () => {
      const response = await fetch("/api/certificates");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view your certificates");
        }
        throw new Error("Failed to load certificates");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message.includes("sign in")) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Hook for fetching single certificate
export const useCertificate = (certificateId: string | null) => {
  return useQuery<{ certificate: Certificate }>({
    queryKey: ["certificate", certificateId],
    queryFn: async () => {
      if (!certificateId) throw new Error("Certificate ID required");

      const response = await fetch(`/api/certificates/${certificateId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Certificate not found");
        }
        if (response.status === 403) {
          throw new Error("Access denied");
        }
        throw new Error("Failed to load certificate");
      }

      return response.json();
    },
    enabled: !!certificateId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for certificate verification (public)
export const useCertificateVerification = (
  certificateNumber: string | null
) => {
  return useQuery<CertificateVerification>({
    queryKey: ["certificate-verify", certificateNumber],
    queryFn: async () => {
      if (!certificateNumber) throw new Error("Certificate number required");

      const response = await fetch(
        `/api/certificates/verify/${certificateNumber}`
      );

      if (!response.ok) {
        // For verification, 404 means invalid certificate
        if (response.status === 404) {
          return {
            valid: false,
            message: "Certificate not found or invalid",
          };
        }
        throw new Error("Error verifying certificate");
      }

      return response.json();
    },
    enabled: !!certificateNumber,
    staleTime: 30 * 60 * 1000, // 30 minutes (certificates don't change often)
  });
};

// Hook for certificate regeneration
export const useCertificateRegenerate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateId: string) => {
      const response = await fetch("/api/certificates/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ certificateId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to regenerate certificate");
      }

      return response.json();
    },
    onSuccess: (data, certificateId) => {
      toast.success("Certificate regenerated successfully!");

      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({
        queryKey: ["certificate", certificateId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to regenerate certificate");
    },
  });
};

// Comprehensive hook for certificate management
export const useCertificateManager = () => {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const certificates = useCertificates();
  const regenerateMutation = useCertificateRegenerate();

  // Download certificate
  const downloadCertificate = async (
    certificate: Certificate | StudentCertificate
  ) => {
    if (!certificate.pdfUrl) {
      toast.error("Certificate PDF not available");
      return;
    }

    try {
      setDownloadingId(certificate.id);

      // Get pre-signed URL for download
      const response = await fetch(
        `/api/certificates/download?certificateId=${certificate.id}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get download URL");
      }

      const { url } = await response.json();

      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate_${certificate.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download certificate"
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // View certificate in new tab
  const viewCertificate = async ({
    pdfUrl,
    certificateId,
    directView = true,
  }: {
    pdfUrl: string;
    certificateId: string;
    directView?: boolean;
  }) => {
    if (!pdfUrl) {
      toast.error("Certificate PDF not available");
      return;
    }

    try {
      // Get pre-signed URL for viewing
      const response = await fetch(
        `/api/certificates/view?certificateId=${certificateId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get view URL");
      }

      const { url } = await response.json();

      if (directView) {
        window.open(url, "_blank");
      }
      return url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to view certificate"
      );
    }
  };

  // Share certificate
  const shareCertificate = async (certificate: Certificate) => {
    try {
      setSharingId(certificate.id);

      const shareData = {
        title: "My Course Certificate",
        text: `I earned a certificate for completing "${certificate.course.title}"!`,
        url: `${window.location.origin}/certificates/verify/${certificate.certificateNumber}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Certificate verification link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Failed to share certificate");
      }
    } finally {
      setSharingId(null);
    }
  };

  // Regenerate certificate
  const regenerateCertificate = (certificateId: string) => {
    regenerateMutation.mutate(certificateId);
  };

  // Refresh certificates
  const refreshCertificates = () => {
    queryClient.invalidateQueries({ queryKey: ["certificates"] });
  };

  return {
    // Data
    certificates: certificates.data?.certificates || [],
    isLoading: certificates.isLoading,
    error: certificates.error,

    // Actions
    downloadCertificate,
    viewCertificate,
    shareCertificate,
    regenerateCertificate,
    refreshCertificates,

    // States
    downloadingId,
    sharingId,
    isRegenerating: regenerateMutation.isPending,
    regeneratingId: regenerateMutation.variables,

    // Utilities
    refetch: certificates.refetch,
  };
};

// Helper hook for certificate filters
export const useCertificateFilters = (certificates: Certificate[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  const filteredCertificates = certificates
    .filter((cert) => {
      const matchesSearch =
        cert.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel =
        selectedLevel === "all" ||
        cert.course.level === selectedLevel.toUpperCase();
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        );
      }
      return a.course.title.localeCompare(b.course.title);
    });

  return {
    searchTerm,
    setSearchTerm,
    selectedLevel,
    setSelectedLevel,
    sortBy,
    setSortBy,
    filteredCertificates,
  };
};
