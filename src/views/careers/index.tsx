"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import clsx from "clsx";
import CareersShimmer from "@/views/landing/shimmer/careers-shimmer";
import { useTranslations } from "next-intl";
import { useCompaniesWithJobs } from "@/hooks/use-companies";
import { Input } from "@/components/ui/input";

const categories = [
  "Bisnis & Manajemen",
  "Desain & Kreatif",
  "Pengembangan Diri",
  "Sertifikasi Profesional",
  "Teknologi & Pemrograman",
];

const levels = ["PEMULA", "MENENGAH", "LANJUT"];

export default function AllCareersView() {
  const router = useRouter();
  const t = useTranslations("careers");

  const { data, isLoading: isLoadingCompanies } = useCompaniesWithJobs();

  const companies = data?.companies ?? [];

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [showFilter, setShowFilter] = useState(false);

  const toggleFilter = (
    filter: string,
    list: string[],
    setList: (val: string[]) => void
  ) => {
    setList(
      list.includes(filter)
        ? list.filter((i) => i !== filter)
        : [...list, filter]
    );
  };

  const allJobs = companies.flatMap((c) =>
    c.jobs.map((job, index) => ({
      ...job,
      companyId: c.id,
      companyName: c.name,
      jobKey: `${c.id}-${index}`,
    }))
  );

  const uniqueLocations = Array.from(
    new Set(allJobs.map((job) => job.location))
  );

  const filteredJobs = allJobs.filter((job) => {
    const matchCompany =
      selectedCompanies.length === 0 ||
      selectedCompanies.includes(job.companyId);
    const matchCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(job.category);
    const matchLevel =
      selectedLevels.length === 0 || selectedLevels.includes(job.level);
    const matchLocation =
      selectedLocations.length === 0 ||
      selectedLocations.includes(job.location);
    const matchPrice =
      (minPrice === undefined || job.salary >= minPrice) &&
      (maxPrice === undefined || job.salary <= maxPrice);

    return (
      matchCompany && matchCategory && matchLevel && matchLocation && matchPrice
    );
  });

  return (
    <section className="bg-white px-6">
      <div className="max-w-8xl mx-auto">
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="px-4 py-2 rounded-md border border-sky-200 bg-white text-sky-700 shadow-sm text-sm"
          >
            {showFilter ? t("careers_close_filter") : t("careers_open_filter")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <aside
            className={clsx(
              "lg:col-span-1 space-y-6 shadow-lg transition-all duration-300",
              "bg-sky-50 border border-sky-100 rounded-xl p-4 shadow-sm",
              showFilter ? "block" : "hidden lg:block"
            )}
          >
            <h3 className="text-lg font-semibold text-sky-700 border-b pb-2">
              {t("careers_filter_title")}
            </h3>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("careers_filter_company")}
              </h4>
              <div className="space-y-1">
                {companies.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() =>
                        toggleFilter(
                          company.id,
                          selectedCompanies,
                          setSelectedCompanies
                        )
                      }
                    />
                    <span>{company.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("careers_filter_category")}
              </h4>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() =>
                        toggleFilter(
                          cat,
                          selectedCategories,
                          setSelectedCategories
                        )
                      }
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("careers_filter_level")}
              </h4>
              <div className="space-y-1">
                {levels.map((lvl) => (
                  <label key={lvl} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedLevels.includes(lvl)}
                      onCheckedChange={() =>
                        toggleFilter(lvl, selectedLevels, setSelectedLevels)
                      }
                    />
                    <span>{lvl}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {t("careers_filter_location")}
              </h4>
              <div className="space-y-1">
                {uniqueLocations.map((loc) => (
                  <label key={loc} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedLocations.includes(loc)}
                      onCheckedChange={() =>
                        toggleFilter(
                          loc,
                          selectedLocations,
                          setSelectedLocations
                        )
                      }
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Rentang Gaji (Rp)
              </h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  className="w-full"
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="w-full"
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                className="w-full py-2 rounded-md bg-white border border-sky-200 text-sm text-sky-700 hover:bg-sky-100 transition"
                onClick={() => {
                  setSelectedCompanies([]);
                  setSelectedCategories([]);
                  setSelectedLevels([]);
                  setSelectedLocations([]);
                  setMinPrice(undefined);
                  setMaxPrice(undefined);
                }}
              >
                {t("careers_reset_filter")}
              </button>
            </div>
          </aside>

          <div className="lg:col-span-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingCompanies ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <CareersShimmer key={idx} />
                ))
              ) : filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => {
                  return (
                    <Card
                      key={idx}
                      onClick={() =>
                        router.push(
                          `/careers/${job.jobKey}?company=${encodeURIComponent(
                            job.companyName
                          )}`
                        )
                      }
                      className="cursor-pointer bg-white rounded-2xl border border-sky-100 shadow-md hover:shadow-xl transition-all duration-300 group"
                    >
                      <CardContent className="p-6">
                        <h3 className="text-sm text-sky-600 font-semibold mb-1">
                          {job.companyName}
                        </h3>
                        <h5 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-sky-700">
                          {job.title}
                        </h5>
                        <p className="text-sm text-gray-500 mb-1">
                          📍 {job.location}
                        </p>
                        <p className="text-sm text-gray-700 mb-2">
                          💰 Rp{job.salary.toLocaleString("id-ID")}
                        </p>
                        <p className="text-sm text-gray-600 leading-snug mb-2">
                          {job.description}
                        </p>
                        <span className="inline-block text-xs font-medium px-2 py-0.5 bg-sky-100 text-sky-800 rounded">
                          {job.level}
                        </span>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm col-span-full">
                  {t("careers_not_found")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
