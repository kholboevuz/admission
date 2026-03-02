"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, ChevronRight, FileText, InboxIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { axiosClient } from "@/http/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
    _id: string;
    admission_id: string;
    title: string;
    comment: string;
    file?: string;
    unRead: boolean;
    createdAt: string;
    updatedAt: string;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, max = 110) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function formatTime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Hozir";
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    if (diffHr < 24) return `${diffHr} soat oldin`;
    if (diffDay < 7) return `${diffDay} kun oldin`;

    return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function NotifSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-2xl border p-4 space-y-2"
                    style={{ opacity: 1 - (i - 1) * 0.25 }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/5 rounded" />
                            <Skeleton className="h-3.5 w-full rounded" />
                            <Skeleton className="h-3.5 w-4/5 rounded" />
                            <Skeleton className="h-3 w-1/4 rounded mt-1" />
                        </div>
                        <Skeleton className="h-9 w-28 rounded-lg shrink-0" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Single notification card ─────────────────────────────────────────────────

function NotifCard({ n }: { n: NotificationItem }) {
    const href = `/dashboard/user/notification/${n._id}`;

    return (
        <div
            className={cn(
                "rounded-2xl border p-4 transition-colors",
                n.unRead
                    ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40"
                    : "bg-background"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold leading-snug">{n.title}</p>
                        {n.unRead && (
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                    </div>

                    {/* File badge */}
                    {n.file && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                            <FileText className="size-3" />
                            PDF fayl biriktrilgan
                        </span>
                    )}

                    {/* Time */}
                    <p className="mt-2 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                </div>

                {/* CTA */}
                <SheetClose asChild>
                    <Button asChild variant="outline" size="sm" className="h-9 shrink-0">
                        <Link href={href}>
                            Ko'rish
                            <ChevronRight className="ml-1 size-3.5" />
                        </Link>
                    </Button>
                </SheetClose>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Notifications() {
    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<Pagination | null>(null);
    const [markingRead, setMarkingRead] = useState(false);

    // badge count — fetched separately so it works before sheet opens
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchItems = useCallback(async (p = 1, signal?: AbortSignal) => {
        setLoading(true);
        try {
            const res = await axiosClient(`/user/notifications?page=${p}&limit=20`, { signal });
            const data: NotificationItem[] = res.data.data || [];
            setItems(p === 1 ? data : (prev) => [...prev, ...data]);
            setMeta(res.data.pagination || null);
            setUnreadCount(data.filter((x) => x.unRead).length + (p > 1 ? unreadCount : 0));
        } catch (e: any) {
            if (e?.name === "AbortError") return;
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch badge count on mount (light poll every 60s)
    useEffect(() => {
        const controller = new AbortController();
        fetchItems(1, controller.signal);

        const interval = setInterval(() => fetchItems(1, controller.signal), 60_000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [fetchItems]);

    // Re-fetch when sheet opens
    useEffect(() => {
        if (open) {
            setPage(1);
            fetchItems(1);
        }
    }, [open, fetchItems]);

    // Load more
    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchItems(next);
    };

    const markAllRead = async () => {
        setMarkingRead(true);
        try {
            await axiosClient.patch("/user/notifications");
            setItems((prev) => prev.map((x) => ({ ...x, unRead: false })));
            setUnreadCount(0);
        } finally {
            setMarkingRead(false);
        }
    };

    const hasUnread = unreadCount > 0;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-xl">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent className="flex flex-col w-full sm:max-w-md p-0 gap-0">
                {/* Header */}
                <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Bell className="size-4 text-primary" />
                            </div>
                            <div>
                                <SheetTitle className="text-base leading-tight">Bildirishnomalar</SheetTitle>
                                <SheetDescription className="text-xs mt-0.5">
                                    {items.length > 0
                                        ? `${unreadCount} ta o'qilmagan xabar`
                                        : "Hozircha bildirishnoma yo'q"}
                                </SheetDescription>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading && items.length === 0 ? (
                        <NotifSkeleton />
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-48 gap-3 text-center py-12">
                            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                                <InboxIcon className="size-7 text-muted-foreground/50" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Bildirishnoma yo'q</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Yangi xabarlar paydo bo'lsa shu yerda ko'rinadi.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((n) => (
                                <NotifCard key={n._id} n={n} />
                            ))}

                            {/* Load more */}
                            {meta?.hasNext && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-9 text-xs"
                                    onClick={loadMore}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <RefreshCw className="size-3.5 animate-spin mr-2" />
                                    ) : null}
                                    Ko'proq yuklash
                                    {meta ? ` · ${meta.total - items.length} ta qoldi` : ""}
                                </Button>
                            )}

                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}