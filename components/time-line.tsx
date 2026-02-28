"use client";

import React from "react";
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDescription,
    TimelineDot,
    TimelineHeader,
    TimelineItem,
    TimelineTime,
    TimelineTitle,
} from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    BadgeCheck,
    Clock3,
    PencilLine,
    RotateCcw,
    ShieldCheck,
    XCircle,
    Wallet,
    Eye,
    FileText,
    Loader2,
} from "lucide-react";
import { ApplicationInfo } from "./application-info";

export type ApplicationStatus =
    | "draft"
    | "reviewed"
    | "submitted"
    | "paid"
    | "rejected"
    | "accepted"
    | "returned";

type Props = {
    status: ApplicationStatus;
    submittedAt?: string;
    reviewedAt?: string;
    decidedAt?: string;
    editLoading?: boolean;
    application_id: string;
    onEdit?: () => void;
};

function fmt(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "2-digit" });
}

function statusMeta(status: ApplicationStatus) {
    const canEdit = status === "draft" || status === "submitted" || status === "returned";

    const badge =
        status === "accepted"
            ? { text: "Tasdiqlangan", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: <ShieldCheck className="h-4 w-4" /> }
            : status === "rejected"
                ? { text: "Rad etilgan", cls: "bg-red-50 text-red-700 ring-red-200", icon: <XCircle className="h-4 w-4" /> }
                : status === "returned"
                    ? { text: "Qaytarilgan", cls: "bg-amber-50 text-amber-800 ring-amber-200", icon: <RotateCcw className="h-4 w-4" /> }
                    : status === "reviewed"
                        ? { text: "Ko‘rib chiqilmoqda", cls: "bg-blue-50 text-blue-700 ring-blue-200", icon: <Eye className="h-4 w-4" /> }
                        : status === "paid"
                            ? { text: "To‘langan", cls: "bg-violet-50 text-violet-700 ring-violet-200", icon: <Wallet className="h-4 w-4" /> }
                            : status === "submitted"
                                ? { text: "Yuborilgan", cls: "bg-sky-50 text-sky-700 ring-sky-200", icon: <FileText className="h-4 w-4" /> }
                                : { text: "Qoralama", cls: "bg-slate-50 text-slate-700 ring-slate-200", icon: <Clock3 className="h-4 w-4" /> };

    const activeIndex =
        status === "reviewed"
            ? 1
            : status === "accepted" || status === "rejected" || status === "returned" || status === "paid"
                ? 2
                : 0;

    const final =
        status === "accepted"
            ? {
                title: "Yakuniy tasdiq", desc: "Arizangiz muvaffaqiyatli yakunlandi va qabul qilindi. Qo‘shimcha ma’lumotlar va keyingi bosqichlar haqida elektron pochta manzilingiz hamda shaxsiy kabinetingiz orqali xabar beriladi."
            }
            : status === "rejected"
                ? { title: "Rad etildi", desc: "Ariza rad etildi. Tahrirlash yopilgan." }
                : status === "returned"
                    ? { title: "Tuzatish uchun qaytarildi", desc: "Arizaga tuzatish kiritib qayta yuborishingiz mumkin." }
                    : status === "paid"
                        ? { title: "To‘lov tasdiqlandi", desc: "To‘lov holati: to‘langan. Keyingi tekshiruv natijasi kutiladi." }
                        : { title: "Natija kutilmoqda", desc: "Moderator yakuniy qaror beradi." };

    return { canEdit, badge, activeIndex, final };
}

export function TimelineApplication({
    status,
    submittedAt,
    reviewedAt,
    decidedAt,
    application_id,
    editLoading,
    onEdit,
}: Props) {
    const { canEdit, badge, activeIndex, final } = statusMeta(status);
    return (
        <div >

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xl font-semibold leading-tight">Ariza holati</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Bosqichlar bo‘yicha jarayon shu yerda ko‘rinadi.
                        </p>
                    </div>

                    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1", badge.cls)}>
                        {badge.icon}
                        <span className="font-medium">{badge.text}</span>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        <span className="mr-2">Yuborilgan:</span>
                        <span className="font-medium text-foreground">{fmt(submittedAt)}</span>
                    </div>

                    {canEdit && onEdit ? (
                        <Button onClick={onEdit} className="rounded-xl" disabled={editLoading}>
                            {editLoading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                    Arizani tahrirlash
                                </>
                            ) : (
                                <>
                                    <PencilLine className="mr-2 h-4 w-4" />
                                    Arizani tahrirlash
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            <BadgeCheck className="mr-2 inline h-4 w-4 align-[-2px]" />
                            Tahrirlash yopilgan
                        </div>
                    )}
                </div>

                {status === "submitted" && (
                    <div className="mt-3 rounded-xl border bg-sky-50 p-3 text-sm text-sky-900">
                        Ariza yuborilgan. Moderator hali qabul qilmaguncha tahrirlash mumkin.
                    </div>
                )}

                {status === "returned" && (
                    <div className="mt-3 rounded-xl border bg-amber-50 p-3 text-sm text-amber-900">
                        <div className="flex justify-between items-center">
                            <p>Ariza tuzatish uchun qaytarildi. Tahrirlab qayta yuboring.</p>
                            <ApplicationInfo button="Qaytarish sababi" title="Qaytarish sababi" application_id={application_id} />
                        </div>
                    </div>
                )}

                {status === "rejected" && (
                    <div className="mt-3 rounded-xl border bg-red-50 p-3 text-sm text-red-900">
                        <div className="flex justify-between items-center">
                            <p> Ariza moderatsiya tomonidan rad etildi. </p>
                            <ApplicationInfo button="Rad etish sababi" title="Rad etish sababi" application_id={application_id} />
                        </div>
                    </div>
                )}

                {status === "reviewed" && (
                    <div className="mt-3 rounded-xl border bg-blue-50 p-3 text-sm text-blue-900">
                        Moderator arizani ko‘rib chiqishga oldi. Hozircha tahrirlash mumkin emas.
                    </div>
                )}
            </div>

            {/* Timeline card */}
            <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
                <Timeline activeIndex={activeIndex}>
                    {/* Step 1 */}
                    <TimelineItem>
                        <TimelineDot />
                        <TimelineConnector />
                        <TimelineContent>
                            <TimelineHeader>
                                <TimelineTime dateTime={submittedAt || ""}>{fmt(submittedAt)}</TimelineTime>
                                <TimelineTitle>Ariza yuborildi</TimelineTitle>
                            </TimelineHeader>
                            <TimelineDescription>
                                Arizangiz tizimga yuborildi. Moderator tekshiruviga navbatga tushdi.
                            </TimelineDescription>
                        </TimelineContent>
                    </TimelineItem>

                    {/* Step 2 */}
                    <TimelineItem>
                        <TimelineDot />
                        <TimelineConnector />
                        <TimelineContent>
                            <TimelineHeader>
                                <TimelineTime dateTime={reviewedAt || ""}>{status === "reviewed" ? fmt(reviewedAt) : "Holat xabari"}</TimelineTime>
                                <TimelineTitle>Moderator ko‘rib chiqmoqda</TimelineTitle>
                            </TimelineHeader>
                            <TimelineDescription>
                                Moderator hujjatlarni tekshiradi. Zarurat bo‘lsa tuzatish uchun qaytarishi yoki tasdiqlashi mumkin.
                            </TimelineDescription>
                        </TimelineContent>
                    </TimelineItem>

                    {/* Step 3 */}
                    <TimelineItem>
                        <TimelineDot />
                        <TimelineContent>
                            <TimelineHeader>
                                <TimelineTime dateTime={reviewedAt || ""}>{status === "reviewed" ? fmt(reviewedAt) : "Holat xabari"}</TimelineTime>
                                <TimelineTitle>{final.title}</TimelineTitle>
                            </TimelineHeader>
                            <TimelineDescription>{final.desc}</TimelineDescription>
                        </TimelineContent>
                    </TimelineItem>
                </Timeline>
            </div>
        </div>
    );
}
