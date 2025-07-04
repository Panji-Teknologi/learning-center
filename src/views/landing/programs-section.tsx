"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRightFromCircleIcon } from "lucide-react";
import { useAllCourses } from "@/hooks/use-courses";
import { CourseImageCard } from "@/components/media/SecureImage";
import { formatPrice } from "@/utils/formatPrice";
import { Badge } from "@/components/ui/badge";
import CoursesShimmer from "./shimmer/courses-shimmer";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

interface ProgramsSectionProps {
  keyword: string;
  category: string;
}

export default function ProgramsSection({
  keyword,
  category,
}: ProgramsSectionProps) {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data, isLoading } = useAllCourses();
  const courses = data?.courses ?? [];
  const session = useSession();

  const filteredCourses = courses.filter((course) => {
    const keywordMatch = course.title
      ?.toLowerCase()
      .includes(keyword.toLowerCase());

    const categoryMatch =
      category.length === 0 ||
      (course.categoryName &&
        category.includes(course.categoryName.toLowerCase()));

    return keywordMatch && categoryMatch;
  });

  return (
    <section className="py-20 bg-white">
      <h2 className="text-3xl font-semibold mb-10 text-center text-sky-700">
        {t("programs_title")}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-10">
          {Array.from({ length: 8 }).map((_, index) => (
            <CoursesShimmer key={index} />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <Fragment>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-10">
            {filteredCourses.map((items, i) => {
              console.log(items);
              return (
                <Card
                  key={i}
                  className="flex flex-col justify-between min-h-[420px] hover:scale-105 hover:shadow-xl transition-transform duration-300 border rounded-2xl"
                >
                  <CardContent className="flex flex-col justify-between h-full p-5">
                    <div>
                      <div className="relative w-full mb-4 overflow-hidden rounded-xl bg-gray-100">
                        <CourseImageCard
                          imageKey={items.imageUrl}
                          courseId={items.id}
                          courseTitle={items.title}
                          className="aspect-video w-full"
                        />
                        <div className="absolute top-2 right-2 bg-white text-sky-600 text-xs px-3 py-1 rounded-full shadow">
                          <p className="font-bold">
                            {formatPrice(items.price ?? 0)}
                          </p>
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg mb-1 text-gray-800 line-clamp-2">
                        {items.title ?? t("programs_noTitle")}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {items.description ?? t("programs_noDescription")}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-sky-50 text-sky-700 border-sky-200"
                        >
                          {items.categoryName ?? t("programs_noCategory")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-teal-50 text-teal-600 border-teal-200"
                        >
                          {items.level ?? t("programs_noLevel")}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 italic">
                        {tCommon("by")}{" "}
                        {items.teacherName ?? t("programs_noTeacher")}
                      </p>
                    </div>

                    <Button
                      onClick={() => router.push(`/program-detail/${items.id}`)}
                      className="w-full mt-4 bg-sky-600 text-white hover:bg-black rounded-xl shadow-md transition"
                    >
                      {t("programs_register")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-4">
            <Button
              onClick={() => {
                const isLoggedIn = session.data;
                const targetPath = isLoggedIn ? "/courses" : "/sign-in";
                localStorage.setItem("routerCache", targetPath);
                router.push(targetPath);
              }}
              className="rounded-xl px-6 py-3 bg-sky-700 hover:bg-black text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 ease-in-out inline-flex items-center gap-2"
            >
              <span> {t("programs_more")}</span>
              <ArrowUpRightFromCircleIcon />
            </Button>
          </div>
        </Fragment>
      ) : (
        <div className="flex justify-center items-center">
          <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">
              {t("programs_notFoundTitle")}
            </h3>
            <p className="text-gray-500 mb-4">{t("programs_notFoundDesc")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
