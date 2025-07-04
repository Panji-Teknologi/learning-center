"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import CareersShimmer from "./shimmer/careers-shimmer";
import { useTranslations } from "next-intl";
import { useCompaniesWithJobs } from "@/hooks/use-companies";

export default function CareersPage() {
  const t = useTranslations("landing");
  const router = useRouter();

  const { data, isLoading: isLoadingCompanies } = useCompaniesWithJobs();

  const companies = data?.companies ?? [];

  const [selectedTab, setSelectedTab] = useState<string>("all");

  const allJobs = companies.flatMap((company) =>
    company.jobs.map((job, idx) => ({
      ...job,
      companyId: company.id,
      companyName: company.name,
      careersId: `${company.id}-${idx}`,
    }))
  );

  const filteredJobs =
    selectedTab === "all"
      ? allJobs
      : allJobs.filter((job) => job.companyId === selectedTab);

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold mb-12 text-center text-sky-700">
          {t("careers_title")}
        </h2>

        <div className="flex justify-center mb-8">
          <Tabs
            defaultValue="all"
            value={selectedTab}
            onValueChange={setSelectedTab}
          >
            <TabsList className="bg-sky-50 p-1 rounded-full shadow-sm flex flex-wrap gap-2 justify-center">
              <TabsTrigger
                value="all"
                className={clsx(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition",
                  "data-[state=active]:bg-sky-600 data-[state=active]:text-white"
                )}
              >
                {t("careers_allCompanies")}
              </TabsTrigger>

              {companies.map((company) => (
                <TabsTrigger
                  key={company.id}
                  value={company.id}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition",
                    "data-[state=active]:bg-sky-600 data-[state=active]:text-white"
                  )}
                >
                  {company.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingCompanies
            ? Array.from({ length: 6 }).map((_, idx) => (
                <CareersShimmer key={idx} />
              ))
            : filteredJobs.slice(0, 6).map((job, idx) => {
                return (
                  <Card
                    key={idx}
                    onClick={() =>
                      router.push(
                        `/careers/${job.careersId}?company=${encodeURIComponent(
                          job.companyName
                        )}`
                      )
                    }
                    className="cursor-pointer bg-white rounded-2xl border border-sky-100 shadow-md hover:shadow-xl transition-all duration-300 group"
                  >
                    <CardContent className="p-6">
                      <h3 className="text-base text-sky-600 font-semibold mb-1">
                        {job.companyName}
                      </h3>
                      <h5 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-sky-700">
                        {job.title}
                      </h5>
                      <p className="text-sm text-gray-500 mb-1">
                        📍 {job.location}
                      </p>
                      <p className="text-sm text-gray-600 leading-snug">
                        {job.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        <div className="flex justify-center mt-10">
          <Button
            onClick={() => router.push("/careers")}
            className="px-5 py-2 rounded-full bg-sky-100 text-sky-700 text-sm hover:bg-sky-200 transition border border-sky-200"
          >
            {t("careers_see_all")}
          </Button>
        </div>
      </div>
    </section>
  );
}
