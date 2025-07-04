import { useQuery } from "@tanstack/react-query";
import { Company, CompanyWithJobs } from "@/lib/types/company";
import { Job, JobFilters } from "@/lib/types/job";

interface CompaniesResponse {
  companies: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CompaniesWithJobsResponse {
  companies: CompanyWithJobs[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchCompanies(
  page: number = 1,
  limit: number = 50
): Promise<CompaniesResponse> {
  const response = await fetch(`/api/companies?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to fetch companies");
  }

  return response.json();
}

async function fetchCompaniesWithJobs(
  page: number = 1,
  limit: number = 50,
  jobFilters?: JobFilters
): Promise<CompaniesWithJobsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    includeJobs: "true",
  });

  // Add job filters if provided
  if (jobFilters) {
    if (jobFilters.level) params.append("jobLevel", jobFilters.level);
    if (jobFilters.category) params.append("jobCategory", jobFilters.category);
    if (jobFilters.location) params.append("jobLocation", jobFilters.location);
    if (jobFilters.isActive !== undefined)
      params.append("jobActive", jobFilters.isActive.toString());
    if (jobFilters.search) params.append("jobSearch", jobFilters.search);
  }

  const response = await fetch(`/api/companies?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch companies with jobs");
  }

  return response.json();
}

async function fetchCompanyWithJobs(
  companyId: string
): Promise<CompanyWithJobs> {
  const response = await fetch(`/api/companies/${companyId}?includeJobs=true`);

  if (!response.ok) {
    throw new Error("Failed to fetch company with jobs");
  }

  return response.json();
}

export function useCompanies(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ["companies", page, limit],
    queryFn: () => fetchCompanies(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompaniesWithJobs(
  page: number = 1,
  limit: number = 10,
  jobFilters?: JobFilters
) {
  return useQuery({
    queryKey: ["companies-with-jobs", page, limit, jobFilters],
    queryFn: () => fetchCompaniesWithJobs(page, limit, jobFilters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompanyWithJobs(companyId: string) {
  return useQuery({
    queryKey: ["company-with-jobs", companyId],
    queryFn: () => fetchCompanyWithJobs(companyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!companyId,
  });
}
