import * as React from "react";
import Image from "next/image";
import { Download, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type PassportInfo = {
    fullName: string;
    birthDate: string; // "DD.MM.YYYY"
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
    educationType: string; // Bakalavr / Magistr ...
    specialty: string;
    graduationYear?: string | null; // "2025-07-01" yoki "2025"
};

type ProfileData = {
    avatarUrl?: string | null; // /... yoki external
    fioTitle: string; // katta sarlavha uchun (FIO)
    passport: PassportInfo;
    address: AddressInfo;
    contacts: ContactInfo;
    work: WorkItem[];
    education: EducationItem[];
};

type Props = {
    data: ProfileData;
    className?: string;

    // Tugma handlerlari ixtiyoriy:
    onRefresh?: () => void | Promise<void>;
    onDownloadPdf?: () => void | Promise<void>;
    isRefreshing?: boolean;
    isDownloading?: boolean;
};

export default function ProfileTabsCard({
    data,
    className,
    onRefresh,
    onDownloadPdf,
    isRefreshing,
}: Props) {
    return (
        <div className={cn("w-full", className)}>
            <Tabs defaultValue="general" className="w-full">
                {/* Tabs header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="general">Umumiy ma&apos;lumot</TabsTrigger>
                        <TabsTrigger value="work">Ish joyi</TabsTrigger>
                        <TabsTrigger value="education">Ta&apos;lim</TabsTrigger>
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

                {/* HERO CARD */}
                <Card className="mt-4 overflow-hidden">
                    <CardContent className="relative p-4 sm:p-6">
                        {/* background watermark (ixtiyoriy) */}
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.06]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 20% 20%, currentColor 0 2px, transparent 2px 100%), radial-gradient(circle at 80% 30%, currentColor 0 2px, transparent 2px 100%)",
                            }}
                        />

                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                            <div className="flex items-center gap-4">
                                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border bg-muted sm:h-24 sm:w-24">
                                    {data.avatarUrl ? (
                                        <Image
                                            src={data.avatarUrl}
                                            alt="Avatar"
                                            fill
                                            className="object-cover"
                                            sizes="100px"
                                            priority
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                            Foto
                                        </div>
                                    )}
                                </div>

                                <div className="sm:hidden">
                                    <div className="text-lg font-semibold leading-tight">
                                        {data.fioTitle}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:block">
                                <div className="text-2xl font-semibold tracking-tight">
                                    {data.fioTitle}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CONTENTS */}
                <TabsContent value="general" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                        <InfoCard title="Pasport ma'lumotlari" className="lg:col-span-1">
                            <KeyValue label="F.I.Sh" value={data.passport.fullName} />
                            <KeyValue label="Tug‘ilgan sana" value={data.passport.birthDate} />
                            <KeyValue
                                label="Pasport (ID karta) seriyasi va raqami"
                                value={data.passport.passportSeriesNumber}
                            />
                            <KeyValue label="JSHSHIR" value={data.passport.pinfl} />
                            <KeyValue label="Berilgan sana" value={data.passport.issueDate} />
                            <KeyValue
                                label="Muddati tugash sanasi"
                                value={data.passport.expiryDate}
                            />
                            <KeyValue label="Kim tomonidan berilgan" value={data.passport.issuedBy} />
                        </InfoCard>

                        <div className="grid gap-4 lg:col-span-2 lg:grid-rows-2">
                            <InfoCard title="Doimiy ro‘yxatdagi manzil">
                                <KeyValue label="Mamlakat" value={data.address.country} />
                                <KeyValue label="Viloyat" value={data.address.region} />
                                <KeyValue label="Tuman" value={data.address.district} />
                                <KeyValue label="Manzil" value={data.address.addressLine} />
                            </InfoCard>

                            <InfoCard title="Aloqa ma'lumotlari">
                                <KeyValue label="Telefon" value={safe(data.contacts.phone)} />
                                <KeyValue
                                    label="Qo‘shimcha telefon raqami"
                                    value={safe(data.contacts.extraPhone)}
                                />
                                <KeyValue label="Email" value={safe(data.contacts.email)} />
                            </InfoCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="work" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Ish joyi ma&apos;lumotlari</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">№</TableHead>
                                            <TableHead>Ish boshlanish sanasi</TableHead>
                                            <TableHead>Ish tugash sanasi</TableHead>
                                            <TableHead>Tashkilot</TableHead>
                                            <TableHead>Lavozim</TableHead>
                                            <TableHead>Bo&apos;lim</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.work?.length ? (
                                            data.work.map((row, idx) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell>{row.startDate}</TableCell>
                                                    <TableCell>{row.endDate ?? "-"}</TableCell>
                                                    <TableCell className="min-w-[260px]">
                                                        {row.organization}
                                                    </TableCell>
                                                    <TableCell className="min-w-[160px]">
                                                        {row.position}
                                                    </TableCell>
                                                    <TableCell className="min-w-[260px]">
                                                        {row.department ?? "-"}
                                                    </TableCell>
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

                <TabsContent value="education" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Ta&apos;lim ma&apos;lumotlari</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">№</TableHead>
                                            <TableHead>Hujjat seriyasi va raqami</TableHead>
                                            <TableHead>Ta&apos;lim muassasasi nomi</TableHead>
                                            <TableHead>Ta&apos;lim turi</TableHead>
                                            <TableHead>Mutaxassislik</TableHead>
                                            <TableHead>Bitirgan yil</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.education?.length ? (
                                            data.education.map((row, idx) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell>{row.docSeriesNumber}</TableCell>
                                                    <TableCell className="min-w-[240px]">
                                                        {row.institution}
                                                    </TableCell>
                                                    <TableCell className="min-w-[120px]">
                                                        {row.educationType}
                                                    </TableCell>
                                                    <TableCell className="min-w-[160px]">
                                                        {row.specialty}
                                                    </TableCell>
                                                    <TableCell>{row.graduationYear ?? "-"}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <EmptyRow colSpan={6} text="Ta'lim ma'lumotlari topilmadi." />
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="docs" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Ma&apos;lumotnoma</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Bu bo‘limga siz keyin: sertifikatlar, buyruqlar, PDF fayllar ro‘yxati,
                            yuklab olish/ko‘rish funksiyalarini qo‘shib ketasiz.
                            <Separator className="my-4" />
                            <div className="rounded-xl border bg-muted/30 p-4">
                                Hozircha placeholder.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* ------------------------- helpers ------------------------- */

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

function KeyValue({ label, value }: { label: string; value: string }) {
    return (
        <div className="py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-medium break-words">{value}</div>
            <Separator className="mt-2" />
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
