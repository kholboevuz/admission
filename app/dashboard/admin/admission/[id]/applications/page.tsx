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
import { RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { AcceptApplication } from "@/components/accept-application-dialog";
import { useParams } from "next/navigation";
import Link from "next/link";

type ApplicationStatus =
    | "draft"
    | "reviewed"
    | "submitted"
    | "paid"
    | "rejected"
    | "accepted"
    | "returned";

type ApplicationRow = {
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
    comments: { comment: string; date: string; file?: string }[];
    createdAt: string;
    updatedAt: string;
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

function StatusBadge({ status }: { status: ApplicationStatus }) {
    if (status === "submitted") return <Badge>submitted</Badge>;
    if (status === "accepted") return <Badge variant="default">accepted</Badge>;
    if (status === "rejected") return <Badge variant="destructive">rejected</Badge>;
    if (status === "paid") return <Badge variant="secondary">paid</Badge>;
    if (status === "returned") return <Badge variant="secondary">returned</Badge>;
    if (status === "reviewed") return <Badge variant="secondary">reviewed</Badge>;
    return <Badge variant="outline">draft</Badge>;
}

export default function Page() {
    const [rows, setRows] = useState<ApplicationRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const [q, setQ] = useState("");
    const query = useMemo(() => q.trim(), [q]);
    const admissionId = useParams()?.id;

    const load = async (nextPage = page) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(
                `/admin/admission/${admissionId}/applications`
            );
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
        load(1);
    }, []);

    const filtered = useMemo(() => {
        if (!query) return rows;
        const ql = query.toLowerCase();
        return rows.filter((r) => {
            const f = `${r.pinfl} ${r.step_1?.email || ""} ${r.step_1?.phone_number || ""} ${r.step_1?.choice?.name || ""}`.toLowerCase();
            return f.includes(ql);
        });
    }, [rows, query]);

    const goPrev = async () => {
        if (!pagination?.hasPrev) return;
        await load((pagination.page || page) - 1);
    };

    const goNext = async () => {
        if (!pagination?.hasNext) return;
        await load((pagination.page || page) + 1);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Kelib tushgan arizalar</h1>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Qidirish: PINFL / email / telefon / choice..."
                        className="w-full md:w-[360px]"
                    />
                    <Button onClick={() => load(page)} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Yangilash
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PINFL</TableHead>
                            <TableHead>Yo'nalish</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Holati</TableHead>
                            <TableHead>To'lov holati</TableHead>
                            <TableHead>Ariza yaratilgan sana</TableHead>
                            <TableHead className="text-right">Yangilangan sana</TableHead>
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
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                    Hozircha ma’lumot yo‘q
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((r) => (
                                <TableRow key={r._id}>
                                    <TableCell className="font-mono text-xs">{r.pinfl}</TableCell>
                                    <TableCell className="text-sm">{r.step_1?.choice?.name || "—"}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.step_1?.phone_number || "—"}</TableCell>
                                    <TableCell className="text-sm">{r.step_1?.email || "—"}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={r.application_status} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={r.payment_status ? "default" : "outline"}>
                                            {r.payment_status ? "To'lov qilingan" : "To'lov qilinmagan"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{formatDT(r.createdAt)}</TableCell>
                                    <TableCell className="text-right text-xs">{formatDT(r.updatedAt)}</TableCell>
                                    <TableCell className="text-right text-xs">
                                        <Link href={`/dashboard/admin/admission/${admissionId}/applications/${r._id}`} passHref>
                                            <Button size={'sm'} >Ko'rish <Eye /></Button>
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
                            Jami: <b>{pagination.total}</b> • Sahifa: <b>{pagination.page}</b> / <b>{pagination.totalPages}</b> • Limit:{" "}
                            <b>{pagination.limit}</b>
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