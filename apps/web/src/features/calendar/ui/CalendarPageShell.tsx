"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CalendarPageShellProps {
  engineBadge?: string;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  onRetry: () => void;
  children: ReactNode;
}

export function CalendarPageShell({
  engineBadge,
  error,
  isLoading,
  isFetching,
  onRetry,
  children,
}: CalendarPageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      {engineBadge || isLoading || isFetching ? (
        <div className="flex items-center justify-between px-1 py-2">
          {engineBadge ? (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {engineBadge}
            </span>
          ) : (
            <span />
          )}
          {isLoading || isFetching ? (
            <span className="text-xs text-muted-foreground">Loading...</span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="bg-destructive/10 border-destructive mb-3 rounded-md border px-3 py-2">
          <p className="text-destructive text-sm">{error.message}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={onRetry}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
