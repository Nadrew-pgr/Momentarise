"use client";

import { useTranslation } from "react-i18next";

export default function SyncPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
      <div className="max-w-xl space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{t("pages.sync.title")}</h1>
        <p className="text-muted-foreground">{t("pages.sync.placeholder")}</p>
      </div>
    </div>
  );
}
