"use client";

import { useTranslation } from "react-i18next";
import { Inbox as InboxIcon } from "lucide-react";

export default function InboxPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
      <InboxIcon className="text-muted-foreground h-12 w-12" />
      <h1 className="text-2xl font-semibold">{t("pages.inbox.title")}</h1>
      <p className="text-muted-foreground max-w-sm">
        {t("pages.inbox.placeholder")}
      </p>
    </div>
  );
}
