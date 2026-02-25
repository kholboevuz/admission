"use client";

import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "@/http/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { RefreshCw, ChevronLeft, ChevronRight, Search, ArrowUpDown, X } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApplicationStatus =
    | "draft"
    | "reviewed"
    | "submitted"
    | "paid"
    | "rejected"
    | "accepted"
    | "returned";

type Row = {
    _id: string;
    application_id: string;
    moderator_pinfl: string;
    moderator_comments: { comment?: string; files?: string[]; date: string }[];
    createdAt: string;
    updatedAt: string;
    application: {
        _id: string;
        admission_id: string;
        step: number;
        pinfl: string;
        step_1: {
            phone_number: string;
            phone_number_additional?: string;
            email: string;
            choice: { id: string; name: string };
            isCertified: boolean;
            certificate_file?: string;
            exam_language?: string;
        };
        esse?: string;
        payment_status: boolean;
        application_status: ApplicationStatus;
        createdAt: string;
        updatedAt: string;
    } | null;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};

function formatDT(d?: string) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
}

function statusLabel(status: ApplicationStatus) {
    switch (status) {
        case "accepted":
            return "Qabul qilingan";
        case "rejected":
            return "Rad etilgan";
        case "returned":
            return "Qaytarilgan";
        case "paid":
            return "To‘langan";
        case "submitted":
            return "Yuborilgan";
        case "reviewed":
            return "Ko‘rib chiqilmoqda";
        case "draft":
        default:
            return "Qoralama";
    }
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
    switch (status) {
        case "accepted":
            return <Badge variant="default">Qabul qilingan</Badge>;
        case "rejected":
            return <Badge variant="destructive">Rad etilgan</Badge>;
        case "returned":
            return <Badge variant="secondary">Qaytarilgan</Badge>;
        case "paid":
            return <Badge variant="secondary">To‘langan</Badge>;
        case "submitted":
            return <Badge variant="outline">Yuborilgan</Badge>;
        case "reviewed":
            return <Badge variant="secondary">Ko‘rib chiqilmoqda</Badge>;
        case "draft":
        default:
            return <Badge variant="outline">Qoralama</Badge>;
    }
}

function PaymentBadge({ paid }: { paid: boolean }) {
    return <Badge variant={paid ? "default" : "outline"}>{paid ? "To‘langan" : "To‘lanmagan"}</Badge>;
}

const STATUS_ORDER: Record<ApplicationStatus, number> = {
    accepted: 1,
    rejected: 2,
    returned: 3,
    paid: 4,
    submitted: 5,
    reviewed: 6,
    draft: 7,
};

export default function Page() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    const [q, setQ] = useState("");
    const [qApplied, setQApplied] = useState("");

    const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
    const [statusSortDir, setStatusSortDir] = useState<"asc" | "desc">("asc");

    const apiBase = "/manager/applications/my";

    const load = async (nextPage = page, nextQ = qApplied) => {
        setLoading(true);
        try {
            const url =
                `${apiBase}?page=${encodeURIComponent(String(nextPage))}` +
                `&limit=${encodeURIComponent(String(limit))}` +
                `&q=${encodeURIComponent(nextQ)}`;

            const res = await axiosClient.get(url);
            if (res.data?.success) {
                setRows(res.data.data || []);
                setPagination(res.data.pagination || null);
                setPage(res.data.pagination?.page || nextPage);
            } else {
                setRows([]);
                setPagination(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1, "");
    }, []);

    const applySearch = async () => {
        const next = q.trim();
        setQApplied(next);
        await load(1, next);
    };

    const clearSearch = async () => {
        setQ("");
        setQApplied("");
        await load(1, "");
    };

    const goPrev = async () => {
        if (!pagination?.hasPrev) return;
        await load((pagination.page || page) - 1, qApplied);
    };

    const goNext = async () => {
        if (!pagination?.hasNext) return;
        await load((pagination.page || page) + 1, qApplied);
    };

    const processed = useMemo(() => {
        let list = rows;

        if (qApplied) {
            const ql = qApplied.toLowerCase();
            list = list.filter((r) => String(r.application?.pinfl || "").toLowerCase().includes(ql));
        }

        if (statusFilter !== "all") {
            list = list.filter((r) => r.application?.application_status === statusFilter);
        }

        const dir = statusSortDir === "asc" ? 1 : -1;

        return [...list].sort((a, b) => {
            const sa = a.application?.application_status || "draft";
            const sb = b.application?.application_status || "draft";
            const oa = STATUS_ORDER[sa];
            const ob = STATUS_ORDER[sb];
            if (oa !== ob) return (oa - ob) * dir;
            const ta = new Date(a.updatedAt).getTime();
            const tb = new Date(b.updatedAt).getTime();
            return (tb - ta);
        });
    }, [rows, qApplied, statusFilter, statusSortDir]);

    const toggleStatusSort = () => {
        setStatusSortDir((p) => (p === "asc" ? "desc" : "asc"));
    };

    const clearStatusFilter = () => setStatusFilter("all");
    console.log("RENDER", { rows, processed, qApplied, statusFilter, statusSortDir });
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Mening arizalarim</h1>
                    <p className="text-sm text-muted-foreground">Moderator qabul qilgan arizalar ro‘yxati</p>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="PINFL bo‘yicha qidirish..."
                            className="w-full md:w-[280px]"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") applySearch();
                            }}
                        />
                        <Button variant="secondary" onClick={applySearch} disabled={loading} className="gap-2">
                            <Search className="h-4 w-4" />
                            Qidirish
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-full md:w-[220px]">
                                <SelectValue placeholder="Holat bo‘yicha filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Barchasi</SelectItem>
                                <SelectItem value="accepted">{statusLabel("accepted")}</SelectItem>
                                <SelectItem value="rejected">{statusLabel("rejected")}</SelectItem>
                                <SelectItem value="returned">{statusLabel("returned")}</SelectItem>
                                <SelectItem value="paid">{statusLabel("paid")}</SelectItem>
                                <SelectItem value="submitted">{statusLabel("submitted")}</SelectItem>
                                <SelectItem value="reviewed">{statusLabel("reviewed")}</SelectItem>
                                <SelectItem value="draft">{statusLabel("draft")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            onClick={clearStatusFilter}
                            disabled={loading || statusFilter === "all"}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            Filterni tozalash
                        </Button>
                    </div>

                    <Button onClick={() => load(page, qApplied)} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Yangilash
                    </Button>

                    <Button variant="outline" onClick={clearSearch} disabled={loading || (!qApplied && !q)}>
                        Qidiruvni tozalash
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PINFL</TableHead>
                            <TableHead>Tanlov</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={toggleStatusSort}>
                                <div className="flex items-center gap-2">
                                    Holati
                                    <ArrowUpDown className="h-4 w-4" />
                                    <span className="text-xs text-muted-foreground">
                                        {statusSortDir === "asc" ? "A→Z" : "Z→A"}
                                    </span>
                                </div>
                            </TableHead>
                            <TableHead>To‘lov holati</TableHead>
                            <TableHead className="text-right">Yangilangan vaqti</TableHead>
                            <TableHead className="text-right">Xarakat</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                    Yuklanmoqda...
                                </TableCell>
                            </TableRow>
                        ) : processed.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                    Hozircha ma’lumot yo‘q
                                </TableCell>
                            </TableRow>
                        ) : (
                            processed.map((r) => (
                                <TableRow key={r._id}>
                                    <TableCell className="font-mono text-xs">{r.application?.pinfl || "—"}</TableCell>
                                    <TableCell className="text-sm">{r.application?.step_1?.choice?.name || "—"}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.application?.step_1?.phone_number || "—"}</TableCell>
                                    <TableCell className="text-sm">{r.application?.step_1?.email || "—"}</TableCell>
                                    <TableCell>
                                        {r.application?.application_status ? (
                                            <StatusBadge status={r.application.application_status} />
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <PaymentBadge paid={!!r.application?.payment_status} />
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{formatDT(r.updatedAt)}</TableCell>
                                    <TableCell className="text-right text-xs">
                                        <Link href={`/dashboard/manager/my-applications/${r.application_id}`} passHref>
                                            <Button size="sm" disabled={!r.application_id}>
                                                Ko‘rish
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    {pagination ? (
                        <>
                            Jami: <b>{pagination.total}</b> • Sahifa: <b>{pagination.page}</b> /{" "}
                            <b>{pagination.totalPages}</b> • Limit: <b>{pagination.limit}</b>
                        </>
                    ) : (
                        "—"
                    )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                    <Button variant="secondary" onClick={goPrev} disabled={loading || !pagination?.hasPrev} className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Oldingi
                    </Button>
                    <Button variant="secondary" onClick={goNext} disabled={loading || !pagination?.hasNext} className="gap-2">
                        Keyingi
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}