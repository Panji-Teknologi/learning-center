"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Award,
  Download,
  Search,
  Calendar,
  User,
  Building,
  RefreshCw,
  Loader2,
  Eye,
  BookOpen,
} from "lucide-react";
import Layout from "@/layout";
import { useCertificates, useCertificateFilters } from "@/hooks/use-certificates";
import { regenerateCertificate } from "@/actions/certificate";
import { toast } from "sonner";

export function CertificatesPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useCertificates();

  const {
    searchTerm,
    setSearchTerm,
    selectedLevel,
    setSelectedLevel,
    sortBy,
    setSortBy,
    filteredCertificates,
  } = useCertificateFilters(data?.certificates || []);

  const certificates = data?.certificates || [];

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-700";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleDownload = async (certificate: typeof certificates[0]) => {
    if (!certificate.pdfUrl) {
      toast.error("Certificate PDF not available");
      return;
    }

    try {
      setDownloadingId(certificate.id);
      window.open(certificate.pdfUrl, "_blank");
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error("Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const handleRegenerate = async (certificateId: string) => {
    try {
      setRegeneratingId(certificateId);
      const result = await regenerateCertificate(certificateId);

      if (result.success) {
        toast.success("Certificate regenerated!");
        refetch();
      } else {
        toast.error(result.error || "Failed to regenerate certificate");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Failed to load certificates
              </h3>
              <p className="text-gray-600 mb-4">
                {error.message ||
                  "Something went wrong while loading your certificates."}
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Certificates
            </h1>
            <p className="text-gray-600">
              You have earned {certificates.length} certificate
              {certificates.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {certificates.length} Total
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "title")}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredCertificates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {certificates.length === 0
                  ? "No certificates yet"
                  : "No certificates found"}
              </h3>
              <p className="text-gray-600 mb-4">
                {certificates.length === 0
                  ? "Complete your first course to earn a certificate!"
                  : "Try adjusting your search or filter criteria."}
              </p>
              {certificates.length === 0 && (
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((certificate: typeof certificates[0]) => (
              <Card
                key={certificate.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {certificate.course.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge
                          className={getLevelColor(certificate.course.level)}
                        >
                          {certificate.course.level}
                        </Badge>
                        {certificate.course.category && (
                          <Badge variant="outline">
                            {certificate.course.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Issued{" "}
                        {new Date(certificate.issueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {certificate.course.teacher.user.name ||
                          "Unknown Instructor"}
                      </span>
                    </div>

                    {certificate.course.teacher.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{certificate.course.teacher.company.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                    ID: {certificate.certificateNumber}
                  </div>

                  <div className="flex gap-2">
                    {certificate.pdfUrl ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(certificate.pdfUrl!)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(certificate)}
                          disabled={downloadingId === certificate.id}
                          className="flex-1"
                        >
                          {downloadingId === certificate.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          {downloadingId === certificate.id
                            ? "Downloading..."
                            : "Download"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRegenerate(certificate.id)}
                        disabled={
                          regeneratingId === certificate.id
                        }
                      >
                        {regeneratingId === certificate.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        {regeneratingId === certificate.id
                          ? "Generating..."
                          : "Generate Certificate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
