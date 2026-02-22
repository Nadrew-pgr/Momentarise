"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function AppLogo() {
  const { t } = useTranslation();
  return (
    <Link
      href="/"
      className="flex items-center gap-2 self-center font-medium"
    >
      <span className="text-lg font-semibold">{t("common.appName")}</span>
    </Link>
  );
}
