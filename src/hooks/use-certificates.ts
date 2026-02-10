"use client";

import { useState } from "react";
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

/**
 * Helper hook for certificate filters
 */
export function useCertificateFilters(certificates: Certificate[]) {
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
}
