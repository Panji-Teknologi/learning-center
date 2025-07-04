"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryShimmer from "./shimmer/category-shimmer";
import { useTranslations } from "next-intl";
import { useCategories } from "@/hooks/use-categories";

interface HeroSectionProps {
  onSearch: (keyword: string, category: string) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const t = useTranslations("landing");

  const { data: categories, isLoading } = useCategories();

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");

  const handleReset = () => {
    setKeyword("");
    setCategory("");
    onSearch("", "");
  };

  return (
    <section className="bg-gradient-to-r from-sky-50 to-blue-100 py-24 px-6 text-center animate-fade-in">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 max-w-3xl mx-auto leading-tight">
        {t("hero_title")}{" "}
        <span className="text-sky-600">{t("hero_subtitle")}</span>
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-x-2 text-muted-foreground mb-8 text-sm md:text-base">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <CategoryShimmer key={i} />)
          : categories?.map((item, index) => (
              <span key={index} className="flex items-center">
                {index < categories?.length && <span className="mx-1">•</span>}
                {t(`categories_${item.name}`) ?? item?.name}
              </span>
            ))}
      </div>

      {/* Form pencarian */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4 max-w-5xl mx-auto">
        <Input
          placeholder={t("hero_searchPlaceholder")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl shadow-sm border-sky-300"
        />

        <div className="min-w-[220px]">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl shadow-sm bg-white w-full border-sky-300">
              <SelectValue placeholder={t("hero_categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat, index) => (
                <SelectItem key={index} value={cat.name}>
                  {t(`categories_${cat.name}`) ?? cat?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl shadow-lg transition"
            onClick={() => onSearch(keyword, category)}
          >
            {t("hero_searchButton")}
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="text-gray-600 border border-sky-300 px-6 py-2 rounded-xl shadow-sm"
          >
            {t("hero_resetButton")}
          </Button>
        </div>
      </div>
    </section>
  );
}
