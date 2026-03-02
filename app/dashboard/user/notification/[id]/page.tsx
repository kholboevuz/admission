"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Bell,
    ArrowLeft,
    FileText,
    Download,
    Calendar,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { axiosClient } from "@/http/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationDetail = {
    _id: string;
    admission_id: string;
    title: string;
    comment: string;
    file?: string;
    unRead: boolean;
    createdAt: string;
    updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <div className="space-y-5">
            {/* Back button */}
            <Skeleton className="h-9 w-28 rounded-lg" />

            {/* Card */}
            <div className="rounded-2xl border bg-card p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Skeleton className="size-11 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/5 rounded" />
                        <Skeleton className="h-4 w-2/5 rounded" />
                    </div>
                    <Skeleton className="h-6 w-14 rounded-full shrink-0" />
                </div>

                <Skeleton className="h-px w-full" />

                {/* Body */}
                <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-4/5 rounded" />
                    <Skeleton className="h-4 w-3/5 rounded" />
                </div>

                <Skeleton className="h-px w-full" />

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationViewPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params?.id === "string" ? params.id : null;

    const [loading, setLoading] = useState(true);
    const [notif, setNotif] = useState<NotificationDetail | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;

        (async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/user/notifications/${id}`);
                if (!res.data.success) throw new Error("fetch failed");
                setNotif(res.data.data);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) return <DetailSkeleton />;

    if (notFound || !notif) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="size-20 rounded-3xl bg-muted flex items-center justify-center">
                    <Bell className="size-9 text-muted-foreground/40" />
                </div>
                <div>
                    <p className="font-semibold text-base">Bildirishnoma topilmadi</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Bu xabar mavjud emas yoki sizga tegishli emas.
                    </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={() => router.back()}>
                    <ArrowLeft className="size-3.5" />
                    Ortga
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5 ">
            {/* ── Back ── */}
            <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-1 h-9 text-muted-foreground hover:text-foreground"
                onClick={() => router.back()}
            >
                <ArrowLeft className="size-3.5" />
                Ortga
            </Button>

            {/* ── Main card ── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                {/* Top accent stripe for unread */}
                {notif.unRead && (
                    <div className="h-1 w-full bg-blue-500" />
                )}

                <div className="p-6 space-y-5">
                    {/* ── Card header ── */}
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "size-11 rounded-xl flex items-center justify-center shrink-0",
                                notif.unRead ? "bg-blue-600/15" : "bg-muted"
                            )}
                        >
                            <Bell
                                className={cn(
                                    "size-5",
                                    notif.unRead
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-muted-foreground"
                                )}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base font-semibold leading-snug">
                                    {notif.title}
                                </h1>
                                {notif.unRead && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 shrink-0"
                                    >
                                        Yangi
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                <Calendar className="size-3 shrink-0" />
                                <span>{formatFullDate(notif.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* ── Message body ── */}
                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {notif.comment}
                    </div>

                    {/* ── PDF attachment ── */}
                    {notif.file && (
                        <>
                            <Separator />
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 border px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-9 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                                        <FileText className="size-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">Biriktirilgan fayl</p>
                                        <p className="text-xs text-muted-foreground">PDF hujjat</p>
                                    </div>
                                </div>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-1.5 shrink-0"
                                >
                                    <a href={notif.file} target="_blank" rel="noopener noreferrer">
                                        <Download className="size-3.5" />
                                        Yuklab olish
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}

                    <Separator />


                </div>
            </div>
        </div>
    );
}