import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { CaptureFab } from "@/components/capture-fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 pt-0">
          {children}
        </div>
        <CaptureFab />
      </SidebarInset>
    </SidebarProvider>
  );
}
