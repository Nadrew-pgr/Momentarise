"use client";

import { useTranslation } from "react-i18next";
import { User } from "lucide-react";

export default function MePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <User className="text-muted-foreground h-12 w-12" />
      <h1 className="text-2xl font-semibold">{t("pages.me.title")}</h1>
      <p className="text-muted-foreground max-w-sm">
        {t("pages.me.placeholder")}
      </p>
    </div>
  );
}
