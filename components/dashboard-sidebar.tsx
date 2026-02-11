import { SidebarNav } from "./sidebar-nav";

export function DashboardSidebar() {
    return (
        <aside className="hidden lg:block lg:w-80 lg:border-r lg:bg-background">
            <div className="h-[100dvh] sticky top-0">
                <SidebarNav />
            </div>
        </aside>
    );
}
