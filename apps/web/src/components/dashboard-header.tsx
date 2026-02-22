"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const pathToLabelKey: Record<string, string> = {
  today: "nav.today",
  inbox: "nav.inbox",
  timeline: "nav.timeline",
  me: "nav.me",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "today";
  const labelKey = pathToLabelKey[segment] ?? "nav.today";
  const pageLabel = t(labelKey);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href="/today">{t("common.appName")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
