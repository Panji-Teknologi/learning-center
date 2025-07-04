"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCompanyWithJobs } from "@/hooks/use-companies";
import CareersDetailSkeleton from "./careers-skeleton";

export default function CareerDetailView() {
  const t = useTranslations("careers");

  const searchParams = useSearchParams();
  const companyName = searchParams.get("company");

  const params = useParams();
  const careersId = params.careersId as string;

  const [companyId, jobIndexStr] = careersId?.split("-") ?? [];
  const jobIndex = parseInt(jobIndexStr);

  const { data, isLoading } = useCompanyWithJobs(companyId);

  const job = data?.jobs?.[jobIndex];

  const router = useRouter();

  if (isLoading) {
    return <CareersDetailSkeleton />;
  }

  if (!job) {
    return (
      <div className="py-20 text-center text-gray-600">
        <p>{t("detail_not_found")}</p>
        <Button className="mt-4" onClick={() => router.back()}>
          {t("back_to_all")}
        </Button>
      </div>
    );
  }

  return (
    <section className="bg-white px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-md border border-sky-200">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-sky-800">
                    {job.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {companyName} &middot; 📍 {job.location}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge className="bg-sky-100 text-sky-700 border border-sky-300">
                    {job.category}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    {t("level")} {job.level}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300">
                    {t("salary")} Rp {job.salary.toLocaleString("id-ID")}
                  </Badge>
                </div>

                <div className="text-gray-700 leading-relaxed text-sm">
                  <h3 className="font-semibold mb-2 text-sky-700 text-base">
                    {t("detail_description")}
                  </h3>
                  <p className="whitespace-pre-line">{job.description}</p>
                </div>

                <div className="pt-4">
                  <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white">
                    {t("apply_now")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-md border border-sky-200">
              <CardContent className="p-6">
                <div className="bg-sky-50 border-b-2 border-sky-500 px-4 py-2 mb-4 rounded-t-md">
                  <h3 className="text-lg font-semibold text-sky-700">
                    {t("detail_additional_info")}
                  </h3>
                </div>

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {job?.benefits?.split(",").map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 capitalize"
                    >
                      <CheckCircle className="text-sky-500" size={18} />
                      <span>{benefit.trim()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
