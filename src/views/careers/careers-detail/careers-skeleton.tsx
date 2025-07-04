import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function CareersDetailSkeleton() {
  return (
    <section className="bg-white px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-md border border-sky-200">
              <CardContent className="p-6 space-y-6">
                <div>
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3 mt-2" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-md border border-sky-200">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-2/3 mb-6" />

                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-40" />
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
