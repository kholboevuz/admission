"use client";

import { useState } from "react";
import { Menu, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { SidebarNav } from "./sidebar-nav";
import LanguageDropdown from "./langue-switch";
import { UserNav } from "./nav-user";

type Props = {
    title?: string;
};

export function DashboardHeader({ title = "Dashboard" }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
                {/* Mobile menu button */}
                <div className="lg:hidden">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-xl">
                                <Menu className="size-5" />
                            </Button>
                        </SheetTrigger>

                        <SheetContent side="left" className="w-[320px] p-0">
                            <SidebarNav onNavigate={() => setOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Left area */}
                <div className="flex items-center gap-3 max-lg:hidden">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold leading-tight">{title}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                            Yagona avtomatlashtirilgan axborot tizimi
                        </span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl">
                        <Bell className="size-5" />
                    </Button>
                    <Separator orientation="vertical" className="h-8 hidden sm:block" />
                    <div className="max-lg:hidden">
                        <LanguageDropdown align="center" />
                    </div>
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
