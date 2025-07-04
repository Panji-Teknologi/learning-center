"use client";

import { useKeenSlider } from "keen-slider/react";
import { useRouter } from "next/navigation";
import PartnerShimmer from "./shimmer/partner-shimmer";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCompanies } from "@/hooks/use-companies";
import { AvatarImage } from "@/components/media/SecureImage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PartnershipSection() {
  const t = useTranslations("landing");
  const router = useRouter();

  const { data, isLoading } = useCompanies(1, 10);
  const companies = data?.companies || [];

  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    loop: true,
    mode: "free-snap",
    slides: {
      perView: 4,
      spacing: 0,
    },
    breakpoints: {
      "(max-width: 1024px)": {
        slides: {
          perView: 3,
          spacing: 10,
        },
      },
      "(max-width: 640px)": {
        slides: {
          perView: 1,
          spacing: 0,
        },
      },
    },
  });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let clearNextTimeout = false;

    function nextTimeout() {
      clearTimeout(timeout);
      if (clearNextTimeout) return;
      timeout = setTimeout(() => {
        slider.current?.next();
      }, 2500);
    }

    if (slider.current) {
      slider.current.on("created", nextTimeout);
      slider.current.on("dragStarted", () => {
        clearTimeout(timeout);
        clearNextTimeout = true;
      });
      slider.current.on("animationEnded", () => {
        clearNextTimeout = false;
        nextTimeout();
      });
      slider.current.on("updated", nextTimeout);
    }

    return () => clearTimeout(timeout);
  }, [slider]);

  return (
    <section className="bg-gray-50 py-20 px-6">
      <h2 className="text-3xl font-semibold mb-12 text-center text-sky-700">
        {t("partners_title")}
      </h2>
      <div
        ref={sliderRef}
        className="keen-slider grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10 w-full mx-auto"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <PartnerShimmer key={i} />)
          : companies?.map((company) => (
              <div
                key={company.id}
                className="keen-slider__slide flex justify-center"
              >
                <div
                  onClick={() => {
                    const isLoggedIn =
                      typeof window !== "undefined" &&
                      !!localStorage.getItem("token");
                    router.push(
                      isLoggedIn
                        ? `/career/${company.name.toLowerCase()}`
                        : "/sign-in"
                    );
                  }}
                  className="cursor-pointer group p-6 transition-all w-[200px] flex flex-col items-center"
                >
                  <div className="justify-center items-center w-50 h-50 relative">
                    {company.logoUrl ? (
                      <AvatarImage
                        imageKey={company.logoUrl}
                        userName={company.name}
                        size={80}
                        rounded="rounded-lg"
                        classNameSecureImage="object-contain group-hover:scale-105"
                      />
                    ) : (
                      <Avatar className="w-20 h-20 rounded-lg bg-gray-100 shadow-inner flex items-center justify-center">
                        <AvatarFallback className="text-xl font-bold text-gray-600">
                          {company.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-700 group-hover:text-sky-600">
                    {company.name}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
