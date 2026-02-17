"use client";

import React, { useMemo, useState } from "react";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    createdAt: string; // ISO yoki display string
    href?: string; // "to'liq ko'rish" uchun link
    read?: boolean;
};

function formatTimeLabel(s: string) {
    // Siz xohlasangiz o'zingiz formatlab berasiz. Hozircha stringni qaytaramiz.
    return s;
}

function truncate(text: string, max = 90) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export default function Notifications() {
    // DEMO: keyin API’dan olib kelasiz
    const [items, setItems] = useState<NotificationItem[]>([
        {
            id: "1",
            title: "Yangi ariza kelib tushdi",
            message:
                "Foydalanuvchi ariza yubordi. Tekshirib, tasdiqlash yoki rad etish bo‘yicha qaror qabul qiling.",
            createdAt: "Bugun 09:12",
            href: "/dashboard/admin/applications",
            read: false,
        },
        {
            id: "2",
            title: "So‘rovnoma yakunlandi",
            message:
                "Survey natijalari tayyor. Hisobotni ko‘rib chiqishingiz mumkin.",
            createdAt: "Kecha 18:40",
            href: "/dashboard/admin/surveys",
            read: true,
        },
    ]);

    const unreadCount = useMemo(
        () => items.filter((x) => !x.read).length,
        [items]
    );

    const markAllRead = () => {
        setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    };

    return (
        <Sheet>
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

            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <SheetTitle className="text-base">Bildirishnomalar</SheetTitle>
                            <SheetDescription>
                                {items.length > 0
                                    ? `Sizda ${unreadCount} ta yangi bildirishnoma bor.`
                                    : "Hozircha bildirishnoma yo‘q."}
                            </SheetDescription>
                        </div>

                        {items.length > 0 && unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllRead}
                                className="h-9"
                            >
                                <CheckCheck className="mr-2 size-4" />
                                Hammasini o‘qilgan qilish
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="mt-5 space-y-3">
                    {items.length === 0 ? (
                        <div className="rounded-2xl border bg-muted/30 p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background">
                                    <Inbox className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">
                                        Bildirishnoma yo‘q
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Yangi xabarlar paydo bo‘lsa shu yerda ko‘rinasiz.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        items.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "rounded-2xl border p-4 transition",
                                    !n.read
                                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                                        : "bg-background"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold">
                                                {n.title}
                                            </p>
                                            {!n.read && (
                                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {truncate(n.message, 110)}
                                        </p>

                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {formatTimeLabel(n.createdAt)}
                                        </p>
                                    </div>

                                    {n.href ? (
                                        <SheetClose asChild>
                                            <Button asChild variant="outline" size="sm" className="h-9">
                                                <Link href={n.href}>
                                                    To‘liq ko‘rish
                                                    <ChevronRight className="ml-1 size-4" />
                                                </Link>
                                            </Button>
                                        </SheetClose>
                                    ) : (
                                        <Button variant="outline" size="sm" className="h-9" disabled>
                                            To‘liq ko‘rish
                                            <ChevronRight className="ml-1 size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <SheetFooter className="mt-6">
                    <SheetClose asChild>
                        <Button className="w-full rounded-xl">Yopish</Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
