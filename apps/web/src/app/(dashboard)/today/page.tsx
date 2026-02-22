"use client";

import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";

export default function TodayPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <LayoutDashboard className="text-muted-foreground h-12 w-12" />
      <h1 className="text-2xl font-semibold">{t("pages.today.title")}</h1>
      <p className="text-muted-foreground max-w-sm">
        {t("pages.today.placeholder")}
      </p>
    </div>
  );
}
