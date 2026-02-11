import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-[100dvh] bg-muted/30">
            <div className="flex">
                <DashboardSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <DashboardHeader title="Umumiy ma'lumot" />
                    <main className="min-w-0 flex-1 p-4 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
