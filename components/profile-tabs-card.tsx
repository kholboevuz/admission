"use client";

import * as React from "react";
import Image from "next/image";
import { FileText, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import AddInternationalDiplom from "./add-international-diplom";
import { axiosClient } from "@/http/axios";

type PassportInfo = {
    fullName: string;
    birthDate: string;
    passportSeriesNumber: string;
    pinfl: string;
    issueDate: string;
    expiryDate: string;
    issuedBy: string;
};

type AddressInfo = {
    country: string;
    region: string;
    district: string;
    addressLine: string;
};

type ContactInfo = {
    phone?: string | null;
    extraPhone?: string | null;
    email?: string | null;
};

type WorkItem = {
    id: string | number;
    startDate: string;
    endDate?: string | null;
    organization: string;
    position: string;
    department?: string | null;
};

type EducationItem = {
    id: string | number;
    docSeriesNumber: string;
    institution: string;
    educationType: string;
    specialty: string;
    graduationYear?: string | null;
};

type ProfileData = {
    avatarUrl?: string | null;
    fioTitle: string;
    passport: PassportInfo;
    address: AddressInfo;
    contacts: ContactInfo;
    work: WorkItem[];
    education: EducationItem[];
};

type Props = {
    data: ProfileData;
    className?: string;

    onRefresh?: () => void | Promise<void>;
    onDownloadPdf?: () => void | Promise<void>;
    isRefreshing?: boolean;
    isDownloading?: boolean;

    onOpenMalumotnoma?: () => void;
};

type InternationalDiplomaItem = {
    _id: string;
    university: string;
    direction: string;
    educationType: "bachelor" | "master";
    diplomaNumber: string;
    diplomaFilePath?: string;
    nostrificationFilePath?: string;
    createdAt?: string;
};

export default function ProfileTabsCard({
    data,
    className,
    onRefresh,
    isRefreshing,
    onOpenMalumotnoma,
}: Props) {
    const [intl, setIntl] = React.useState<InternationalDiplomaItem[]>([]);

    const loadInternational = React.useCallback(async () => {
        try {
            const res = await axiosClient.get("/user/international-diploma");
            const json = res.data as { success: boolean; data?: InternationalDiplomaItem[] };
            if (json?.success) setIntl(json.data || []);
            else setIntl([]);
        } catch {
            setIntl([]);
        }
    }, []);

    React.useEffect(() => {
        loadInternational();
    }, [loadInternational]);

    const intlAsEducation: EducationItem[] = React.useMemo(() => {
        return (intl || []).map((x) => ({
            id: `intl-${x._id}`,
            docSeriesNumber: x.diplomaNumber,
            institution: x.university,
            educationType: x.educationType === "bachelor" ? "Bakalavr (Xalqaro)" : "Magistr (Xalqaro)",
            specialty: x.direction,
            graduationYear: x.createdAt ? new Date(x.createdAt).getFullYear().toString() : null,
        }));
    }, [intl]);

    const intlMap = React.useMemo(() => {
        const m = new Map<string, InternationalDiplomaItem>();
        (intl || []).forEach((x) => m.set(`intl-${x._id}`, x));
        return m;
    }, [intl]);

    const mergedEducation: EducationItem[] = React.useMemo(() => {
        const base = Array.isArray(data.education) ? data.education : [];
        return [...base, ...intlAsEducation];
    }, [data.education, intlAsEducation]);

    return (
        <div className={cn("w-full", className)}>
            <Tabs defaultValue="general" className="w-full">

                <div className="sticky top-0 z-10 -mx-2 px-2 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList className="h-10 w-full sm:w-auto">
                            <TabsTrigger value="general">Umumiy</TabsTrigger>
                            <TabsTrigger value="work">Ish joyi</TabsTrigger>
                            <TabsTrigger value="education">Ta&apos;lim</TabsTrigger>

                            <TabsTrigger
                                value="malumotnoma"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onOpenMalumotnoma?.();
                                }}
                                className="gap-2"
                            >

                                Ma&apos;lumotnoma
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={onRefresh}
                                disabled={!onRefresh || isRefreshing}
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                                Yangilash
                            </Button>
                        </div>
                    </div>
                </div>

                {/* HERO */}
                <Card className="overflow-hidden">
                    <CardContent className="relative p-4 sm:p-6">
                        {/* soft gradient bg */}
                        <div className="pointer-events-none absolute inset-0 opacity-70">
                            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-muted blur-3xl" />
                            <div className="absolute -right-24 -bottom-28 h-64 w-64 rounded-full bg-muted blur-3xl" />
                        </div>

                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="relative h-20 w-20 rounded-2xl border bg-muted p-[2px] sm:h-24 sm:w-24">
                                    <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-background">
                                        {data.avatarUrl ? (
                                            <Image
                                                src={data.avatarUrl}
                                                alt="Avatar"
                                                fill
                                                className="object-cover"
                                                sizes="96px"
                                                priority
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                                Foto
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Title (mobile) */}
                                <div className="sm:hidden">
                                    <div className="text-lg font-semibold leading-tight">{data.fioTitle}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Profil ma&apos;lumotlari
                                    </div>
                                </div>
                            </div>

                            {/* Title (desktop) */}
                            <div className="hidden sm:block">
                                <div className="text-2xl font-semibold tracking-tight">{data.fioTitle}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Profil ma&apos;lumotlari
                                </div>
                            </div>

                            {/* right side meta */}
                            <div className="sm:ml-auto">
                                <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                                    <span>JSHSHIR:</span>
                                    <span className="font-medium text-foreground">{data.passport.pinfl}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* GENERAL */}
                <TabsContent value="general" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                        <InfoCard title="Pasport ma'lumotlari" className="lg:col-span-1">
                            <KeyValueGrid
                                items={[
                                    { label: "F.I.Sh", value: data.passport.fullName },
                                    { label: "Tug‘ilgan sana", value: data.passport.birthDate },
                                    {
                                        label: "Pasport (ID karta) seriyasi va raqami",
                                        value: data.passport.passportSeriesNumber,
                                    },
                                    { label: "JSHSHIR", value: data.passport.pinfl },
                                    { label: "Berilgan sana", value: data.passport.issueDate },
                                    { label: "Muddati tugash sanasi", value: data.passport.expiryDate },
                                    { label: "Kim tomonidan berilgan", value: data.passport.issuedBy },
                                ]}
                            />
                        </InfoCard>

                        <div className="grid gap-4 lg:col-span-2 lg:grid-rows-2">
                            <InfoCard title="Doimiy ro‘yxatdagi manzil">
                                <KeyValueGrid
                                    items={[
                                        { label: "Mamlakat", value: data.address.country },
                                        { label: "Viloyat", value: data.address.region },
                                        { label: "Tuman", value: data.address.district },
                                        { label: "Manzil", value: data.address.addressLine },
                                    ]}
                                />
                            </InfoCard>

                            <InfoCard title="Aloqa ma'lumotlari">
                                <KeyValueGrid
                                    items={[
                                        { label: "Telefon", value: safe(data.contacts.phone) },
                                        { label: "Qo‘shimcha telefon raqami", value: safe(data.contacts.extraPhone) },
                                        { label: "Email", value: safe(data.contacts.email) },
                                    ]}
                                />
                            </InfoCard>
                        </div>
                    </div>
                </TabsContent>

                {/* WORK */}
                <TabsContent value="work" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Ish joyi ma&apos;lumotlari</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-xl border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="w-[60px]">№</TableHead>
                                            <TableHead>Ish boshlanish</TableHead>
                                            <TableHead>Ish tugash</TableHead>
                                            <TableHead className="min-w-[260px]">Tashkilot</TableHead>
                                            <TableHead className="min-w-[160px]">Lavozim</TableHead>
                                            <TableHead className="min-w-[260px]">Bo&apos;lim</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.work?.length ? (
                                            data.work.map((row, idx) => (
                                                <TableRow key={row.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell>{row.startDate}</TableCell>
                                                    <TableCell>{row.endDate ?? "-"}</TableCell>
                                                    <TableCell>{row.organization}</TableCell>
                                                    <TableCell>{row.position}</TableCell>
                                                    <TableCell>{row.department ?? "-"}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <EmptyRow colSpan={6} text="Ish joyi ma'lumotlari topilmadi." />
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EDUCATION */}
                <TabsContent value="education" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Ta&apos;lim ma&apos;lumotlari</CardTitle>
                                <AddInternationalDiplom load={onRefresh} />
                            </div>
                            <div className="mt-3 rounded-xl border font-semibold bg-yellow-50 p-3 text-sm text-yellow-900">
                                Hurmatli foydalanuvchi diplom ma'lumotlaringiz ko'rinmagan holda, <Link href={"https://diplom.edu.uz"} target="_blank" className="font-bold underline">diplom.edu.uz</Link> tizimi yordamida diplom ma'lumotlaringizni kiritishingiz mumkin.
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-xl border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="w-[60px]">№</TableHead>
                                            <TableHead>Hujjat seriya/raqam</TableHead>
                                            <TableHead className="min-w-[240px]">Muassasa nomi</TableHead>
                                            <TableHead className="min-w-[120px]">Ta&apos;lim turi</TableHead>
                                            <TableHead className="min-w-[160px]">Mutaxassislik</TableHead>
                                            <TableHead>Bitirgan yil</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mergedEducation?.length ? (
                                            mergedEducation.map((row, idx) => {
                                                const intlItem = String(row.id).startsWith("intl-") ? intlMap.get(String(row.id)) : null;

                                                return (
                                                    <TableRow key={row.id} className="hover:bg-muted/30">
                                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                                        <TableCell>{row.docSeriesNumber}</TableCell>
                                                        <TableCell>{row.institution}</TableCell>
                                                        <TableCell>{row.educationType}</TableCell>
                                                        <TableCell>{row.specialty}</TableCell>
                                                        <TableCell>{row.graduationYear ?? "-"}</TableCell>

                                                        <TableCell className="text-right">
                                                            {intlItem ? (
                                                                <AddInternationalDiplom
                                                                    mode="edit"
                                                                    item={intlItem}
                                                                    onSaved={loadInternational}
                                                                    onDeleted={loadInternational}
                                                                    load={onRefresh}
                                                                />
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <EmptyRow colSpan={7} text="Ta'lim ma'lumotlari topilmadi." />
                                        )}


                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}

function InfoCard({
    title,
    children,
    className,
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">{children}</CardContent>
        </Card>
    );
}

function KeyValueGrid({
    items,
}: {
    items: { label: string; value: string }[];
}) {
    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div key={`${it.label}-${i}`} className="rounded-xl border bg-muted/10 p-3">
                    <div className="text-xs text-muted-foreground">{it.label}</div>
                    <div className="mt-1 break-words text-sm font-medium">{it.value}</div>
                </div>
            ))}
        </div>
    );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                {text}
            </TableCell>
        </TableRow>
    );
}

function safe(v?: string | null) {
    return v && v.trim().length ? v : "-";
}
