"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_ADMIN, DASHBOARD_NAV_USER, DASHBOARD_NAV_MODERATOR } from "./nav-config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Circle, Dot } from "lucide-react";
import { axiosClient } from "@/http/axios";

type Props = {
    onNavigate?: () => void;
};

type SessionResponse = {
    success: boolean;
    user: null | {
        id: string;
        firstname: string;
        lastname: string;
        role: string;
        pinfl: string;
    };
};

type AdmissionCategory = {
    _id: string;
    title: string;
};

type SubMenuItem = {
    id: string;
    title: string;
    href: string;
};

export function SidebarNav({ onNavigate }: Props) {
    const pathname = usePathname();
    const t = useTranslations("LoginPage");

    const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
    const [admissionCategories, setAdmissionCategories] = useState<AdmissionCategory[]>([]);
    const [loading, setLoading] = useState(false);

    const [session, setSession] = useState<SessionResponse | null>(null);
    const sessionRole = String(session?.user?.role || "").toLowerCase();

    const navItems = useMemo(() => {

        if (sessionRole === "admin") return DASHBOARD_NAV_ADMIN;
        if (sessionRole === "modirator") return DASHBOARD_NAV_MODERATOR;
        return DASHBOARD_NAV_USER;
    }, [sessionRole]);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await axiosClient.get("/auth/session");
                setSession(response.data);
            } catch (error) {
                console.error("Failed to fetch session:", error);
                setSession(null);
            }
        };
        fetchSession();
    }, []);

    useEffect(() => {
        const fetchAdmissionCategories = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get("/admin/admission");
                const categories = response.data?.data || [];
                setAdmissionCategories(Array.isArray(categories) ? categories : []);
            } catch (error) {
                console.error("Failed to fetch admission categories:", error);
                setAdmissionCategories([]);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmissionOpen) fetchAdmissionCategories();
    }, [isAdmissionOpen]);

    useEffect(() => {
        if (pathname.startsWith("/dashboard/admin/admission")) {
            setIsAdmissionOpen(true);
        }
    }, [pathname]);

    const toggleCategory = (categoryId: string) => {
        setOpenCategories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) newSet.delete(categoryId);
            else newSet.add(categoryId);
            return newSet;
        });
    };

    const getDefaultSubItems = (categoryId: string): SubMenuItem[] => [
        { id: "view", title: "Statistika", href: `/dashboard/admin/admission/${categoryId}` },
        { id: "edit", title: "Foydalanuvchilar", href: `/dashboard/admin/admission/${categoryId}/users` },
        { id: "applications", title: "Arizalar", href: `/dashboard/admin/admission/${categoryId}/applications` },
        { id: "build-message", title: "Xabar yaratish", href: `/dashboard/admin/admission/${categoryId}/build-message` },
        { id: "bsa-candidates", title: "BSA nomzodlar", href: `/dashboard/admin/admission/${categoryId}/bsa-candidates` },
        // { id: "test-results", title: "Test natijalari", href: `/dashboard/admin/admission/${categoryId}/test-results` },
        // { id: "interview-results", title: "Suxbat natijalari", href: `/dashboard/admin/admission/${categoryId}/interview-results` },
        // { id: "mandate-results", title: "Mandat natijalari", href: `/dashboard/admin/admission/${categoryId}/mandate-results` },
    ];

    const isAdmissionRoute = pathname.startsWith("/dashboard/admin/admission");

    return (
        <div className="flex h-screen flex-col border-r bg-background">
            <div className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <Image alt="logo" src="/logo/logo-dark.svg" width={75} height={75} />
                    <h2 className="text-sm font-semibold tracking-tight">{t("logo-name")}</h2>
                </div>
                <hr className="mt-3" />
            </div>

            <ScrollArea className="flex-1 px-3 overflow-y-auto">
                <div className="space-y-4 py-4">
                    <div className="space-y-1">

                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            const isAdmissionItem = item.href === "/dashboard/admin/admission";

                            if (isAdmissionItem) {
                                return (
                                    <Collapsible
                                        key={item.href}
                                        open={isAdmissionOpen}
                                        onOpenChange={setIsAdmissionOpen}
                                        className="space-y-1"
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant={isAdmissionRoute ? "secondary" : "ghost"}
                                                className={cn(
                                                    "w-full justify-start gap-3 font-medium transition-colors h-11 text-base",
                                                    isAdmissionRoute && "bg-primary text-white hover:bg-primary"
                                                )}
                                            >
                                                <Icon className="h-5 w-5 shrink-0" />
                                                <span className="flex-1 text-left">{item.title}</span>
                                                {isAdmissionOpen ? (
                                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent className="space-y-1 mt-1">
                                            <div className="ml-5 space-y-1 border-l-2 border-border pl-4">
                                                <Link href="/dashboard/admin/admission" onClick={onNavigate}>
                                                    <Button
                                                        variant={pathname === "/dashboard/admin/admission" ? "secondary" : "ghost"}
                                                        size="sm"
                                                        className={cn(
                                                            "w-full justify-start gap-2.5 text-sm transition-colors h-10",
                                                            pathname === "/dashboard/admin/admission" &&
                                                            "bg-primary text-white hover:bg-primary"
                                                        )}
                                                    >
                                                        <Dot className="h-4 w-4 shrink-0" />
                                                        <span className="truncate">Qabul boshqarish</span>
                                                    </Button>
                                                </Link>

                                                {loading ? (
                                                    <>
                                                        <Skeleton className="h-10 w-full rounded-md" />
                                                        <Skeleton className="h-10 w-full rounded-md" />
                                                        <Skeleton className="h-10 w-full rounded-md" />
                                                    </>
                                                ) : admissionCategories.length === 0 ? (
                                                    <></>
                                                ) : (
                                                    admissionCategories.map((category) => {
                                                        const isCategoryOpen = openCategories.has(category._id);
                                                        const isCategoryActive = pathname.includes(`/dashboard/admin/admission/${category._id}`);
                                                        const subItems = getDefaultSubItems(category._id);

                                                        return (
                                                            <Collapsible
                                                                key={category._id}
                                                                open={isCategoryOpen}
                                                                onOpenChange={() => toggleCategory(category._id)}
                                                                className="space-y-1"
                                                            >
                                                                <CollapsibleTrigger asChild>
                                                                    <Button
                                                                        variant={isCategoryActive ? "secondary" : "ghost"}
                                                                        size="sm"
                                                                        className={cn(
                                                                            "w-full justify-start gap-2.5 text-sm transition-colors h-10",
                                                                            isCategoryActive && "bg-secondary"
                                                                        )}
                                                                    >
                                                                        <Circle className="h-2 w-2 shrink-0 fill-current" />
                                                                        <span className="flex-1 text-left truncate">{category.title}</span>
                                                                        {isCategoryOpen ? (
                                                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
                                                                        ) : (
                                                                            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
                                                                        )}
                                                                    </Button>
                                                                </CollapsibleTrigger>

                                                                <CollapsibleContent className="space-y-1 mt-1">
                                                                    <div className="ml-4 space-y-1 border-l-2 border-border/60 pl-4">
                                                                        {subItems.map((subItem) => {
                                                                            const isSubItemActive = pathname === subItem.href;
                                                                            return (
                                                                                <Link key={subItem.id} href={subItem.href} onClick={onNavigate}>
                                                                                    <Button
                                                                                        variant={isSubItemActive ? "secondary" : "ghost"}
                                                                                        size="sm"
                                                                                        className={cn(
                                                                                            "w-full justify-start gap-2.5 text-sm h-9 transition-colors",
                                                                                            isSubItemActive && "bg-secondary"
                                                                                        )}
                                                                                    >
                                                                                        <Dot className="h-4 w-4 shrink-0" />
                                                                                        <span className="truncate">{subItem.title}</span>
                                                                                    </Button>
                                                                                </Link>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </CollapsibleContent>
                                                            </Collapsible>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            }

                            return (
                                <Link key={item.href} href={item.href} onClick={onNavigate}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-3 font-medium transition-colors h-11 text-base",
                                            isActive && "bg-primary text-white hover:bg-primary"
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span className="truncate">{item.title}</span>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>

            <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground text-center">
                    <span>{t("logo-name")}</span>
                </div>
            </div>
        </div>
    );
}
