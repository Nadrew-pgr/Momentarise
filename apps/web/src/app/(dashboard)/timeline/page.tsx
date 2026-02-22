"use client";

import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";

export default function TimelinePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <Calendar className="text-muted-foreground h-12 w-12" />
      <h1 className="text-2xl font-semibold">{t("pages.timeline.title")}</h1>
      <p className="text-muted-foreground max-w-sm">
        {t("pages.timeline.placeholder")}
      </p>
    </div>
  );
}
