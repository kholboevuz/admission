"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showToast, ToastType } from "@/utils/toast-utils";
import {
    Users,
    UserPlus,
    Upload,
    FileSpreadsheet,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Search,
    AlertCircle,
    CheckCircle2,
    X,
    Download,
} from "lucide-react";
import { axiosClient } from "@/http/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidate = {
    pinfl: string;
    choice: string;
};

type ChoiceItem = {
    _id: string;
    choice: { uz: string; ru: string; eng: string; kaa: string };
};

type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
};

type ParsedRow = { pinfl: string; status: "ok" | "invalid" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIMIT = 20;

function choiceLabel(c: ChoiceItem) {
    return c.choice.uz || c.choice.ru || c.choice.eng || c.choice.kaa || c._id;
}

function isValidPinfl(v: string) {
    return /^\d{14}$/.test(v.trim());
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-muted/40 border-b">
                {[1, 4, 5, 2].map((span, i) => (
                    <div key={i} className={`col-span-${span}`}>
                        <Skeleton className="h-3.5 w-3/4 rounded" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b last:border-none items-center"
                    style={{ opacity: 1 - i * 0.1 }}
                >
                    <div className="col-span-1">
                        <Skeleton className="h-4 w-8 rounded" />
                    </div>
                    <div className="col-span-4">
                        <Skeleton className="h-4 w-full rounded font-mono" />
                    </div>
                    <div className="col-span-5">
                        <Skeleton className="h-6 w-40 rounded-full" />
                    </div>
                    <div className="col-span-2 flex justify-end">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Excel preview table ──────────────────────────────────────────────────────

function ExcelPreview({ rows }: { rows: ParsedRow[] }) {
    const valid = rows.filter((r) => r.status === "ok").length;
    const invalid = rows.filter((r) => r.status === "invalid").length;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    {valid} ta to'g'ri
                </span>
                {invalid > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                        <AlertCircle className="size-3.5" />
                        {invalid} ta noto'g'ri (o'tkazib yuboriladi)
                    </span>
                )}
            </div>

            <div className="rounded-xl border overflow-hidden max-h-52 overflow-y-auto">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    <div className="col-span-1">#</div>
                    <div className="col-span-8">PINFL</div>
                    <div className="col-span-3 text-right">Holat</div>
                </div>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-12 gap-2 px-4 py-2 border-b last:border-none text-xs items-center ${row.status === "invalid" ? "bg-red-50/50 dark:bg-red-950/20" : ""
                            }`}
                    >
                        <div className="col-span-1 text-muted-foreground">{i + 1}</div>
                        <div className="col-span-8 font-mono">{row.pinfl || "—"}</div>
                        <div className="col-span-3 flex justify-end">
                            {row.status === "ok" ? (
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                                <AlertCircle className="size-3.5 text-red-500" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
    const params = useParams();
    const admissionId = typeof params?.id === "string" ? params.id : "";

    // list
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Candidate[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    // choices
    const [choices, setChoices] = useState<ChoiceItem[]>([]);

    // dialog
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<"excel" | "manual">("excel");

    // excel tab
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [excelChoice, setExcelChoice] = useState("");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [submittingExcel, setSubmittingExcel] = useState(false);

    // manual tab
    const [manualPinfl, setManualPinfl] = useState("");
    const [manualChoice, setManualChoice] = useState("");
    const [submittingManual, setSubmittingManual] = useState(false);

    // ── Fetch choices ──────────────────────────────────────────────────────────

    useEffect(() => {
        (async () => {
            try {
                const res = await axiosClient.get("/admin/choice/get");
                setChoices(res.data.data || []);
            } catch { }
        })();
    }, []);

    // ── Fetch candidates ───────────────────────────────────────────────────────

    const fetchCandidates = useCallback(async (p = 1) => {
        if (!admissionId) return;
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/candidate/${admissionId}?page=${p}&limit=${LIMIT}`);
            setItems(res.data.data || []);
            setMeta(res.data.pagination || null);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [admissionId]);

    useEffect(() => { fetchCandidates(page); }, [page, fetchCandidates]);

    // ── Excel parse ────────────────────────────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setExcelFile(file);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = ev.target?.result;
                const wb = XLSX.read(data, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

                // Find PINFL column (case-insensitive header scan)
                const header: string[] = rows[0] || [];
                let pinflCol = header.findIndex(
                    (h) => String(h).toLowerCase().includes("pinfl")
                );
                if (pinflCol === -1) pinflCol = 0; // fallback: first column

                const parsed: ParsedRow[] = rows
                    .slice(1)
                    .filter((r: any[]) => r[pinflCol] !== undefined && r[pinflCol] !== "")
                    .map((r: any[]) => {
                        const raw = String(r[pinflCol]).trim();
                        return { pinfl: raw, status: isValidPinfl(raw) ? "ok" : "invalid" };
                    });

                setParsedRows(parsed);
            } catch {
                showToast("Faylni o'qishda xatolik", ToastType.Error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const resetExcel = () => {
        setParsedRows([]);
        setExcelFile(null);
        setExcelChoice("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Submit excel ───────────────────────────────────────────────────────────

    const submitExcel = async () => {
        const validRows = parsedRows.filter((r) => r.status === "ok");
        if (validRows.length === 0) {
            showToast("To'g'ri PINFL topilmadi", ToastType.Error);
            return;
        }
        if (!excelChoice) {
            showToast("Yo'nalish tanlang", ToastType.Error);
            return;
        }

        setSubmittingExcel(true);
        try {
            const res = await axiosClient.post(`/admin/candidate/${admissionId}`, {
                candidates: validRows.map((r) => ({ pinfl: r.pinfl, choice: excelChoice })),
            });
            showToast(res.data.message || "Qo'shildi", ToastType.Success);
            resetExcel();
            setOpen(false);
            setPage(1);
            await fetchCandidates(1);
        } catch (e: any) {
            showToast(e.message || "Xatolik yuz berdi", ToastType.Error);
        } finally {
            setSubmittingExcel(false);
        }
    };

    // ── Submit manual ──────────────────────────────────────────────────────────

    const submitManual = async () => {
        if (!isValidPinfl(manualPinfl)) {
            showToast("PINFL 14 ta raqamdan iborat bo'lishi kerak", ToastType.Error);
            return;
        }
        if (!manualChoice) {
            showToast("Yo'nalish tanlang", ToastType.Error);
            return;
        }

        setSubmittingManual(true);
        try {
            const res = await axiosClient.post(`/admin/candidate/${admissionId}`, {
                candidates: [{ pinfl: manualPinfl.trim(), choice: manualChoice }],
            });

            const json = res.data;

            showToast(json.message || "Qo'shildi", ToastType.Success);
            setManualPinfl("");
            setManualChoice("");
            setOpen(false);
            setPage(1);
            await fetchCandidates(1);
        } catch (e: any) {
            showToast(e.message || "Xatolik yuz berdi", ToastType.Error);
        } finally {
            setSubmittingManual(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────

    const deleteCandidate = async (pinfl: string) => {
        try {
            const res = await axiosClient.delete(`/admin/candidate/${admissionId}`, {
                data: { pinfl },
            });
            showToast(res.data.message || "O'chirildi", ToastType.Success);
            await fetchCandidates(page);
        } catch (e: any) {
            showToast(e.message || "O'chirishda xatolik", ToastType.Error);
        }
    };

    // ── Dialog reset on close ──────────────────────────────────────────────────

    const handleOpenChange = (v: boolean) => {
        if (!v) {
            resetExcel();
            setManualPinfl("");
            setManualChoice("");
        }
        setOpen(v);
    };

    // ── Filtered (client-side search on current page) ──────────────────────────

    const filtered = search.trim()
        ? items.filter((c) => c.pinfl.includes(search.trim()))
        : items;

    // ─── Template download ─────────────────────────────────────────────────────

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([["PINFL"], ["12345678901234"]]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kandidatlar");
        XLSX.writeFile(wb, "kandidatlar_shablon.xlsx");
    };

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">Kandidatlar</h1>
                        <p className="text-sm text-muted-foreground">
                            {meta ? `Jami ${meta.total} ta kandidat` : "Qabul bo'yicha kandidatlar"}
                        </p>
                    </div>
                </div>

                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shrink-0 self-start sm:self-auto">
                            <UserPlus className="size-4" />
                            Kandidat qo'shish
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="w-[95vw] max-w-lg p-0 gap-0">
                        {/* Dialog header */}
                        <DialogHeader className="px-6 pt-6 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <UserPlus className="size-4 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base leading-tight">
                                        Kandidat qo'shish
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Excel orqali yoki qo'lda PINFL kiritib qo'shing
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Tabs */}
                        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col">
                            <div className="px-6 pt-4">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="excel" className="gap-2 text-xs">
                                        <FileSpreadsheet className="size-3.5" />
                                        Excel orqali
                                    </TabsTrigger>
                                    <TabsTrigger value="manual" className="gap-2 text-xs">
                                        <UserPlus className="size-3.5" />
                                        Qo'lda qo'shish
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* ── Excel tab ── */}
                            <TabsContent value="excel" className="px-6 py-5 space-y-4 mt-0">
                                {/* Choice select */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Yo'nalish</label>
                                    <Select value={excelChoice} onValueChange={setExcelChoice}>
                                        <SelectTrigger className="h-10 w-full" >
                                            <SelectValue placeholder="Yo'nalishni tanlang…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {choices.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {choiceLabel(c)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* File upload area */}
                                {!excelFile ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 cursor-pointer hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="size-11 rounded-xl bg-muted flex items-center justify-center">
                                            <Upload className="size-5 text-muted-foreground" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium">Excel fayl yuklash</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                .xlsx yoki .xls · PINFL ustuni bo'lishi kerak
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                        >
                                            Fayl tanlash
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* File pill */}
                                        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-2.5">
                                            <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
                                            <span className="text-sm font-medium truncate flex-1">
                                                {excelFile.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={resetExcel}
                                            >
                                                <X className="size-3.5" />
                                            </Button>
                                        </div>

                                        {/* Preview */}
                                        {parsedRows.length > 0 && <ExcelPreview rows={parsedRows} />}
                                    </div>
                                )}

                                {/* Template download */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 h-8 text-xs text-muted-foreground w-full"
                                    onClick={downloadTemplate}
                                >
                                    <Download className="size-3.5" />
                                    Shablon yuklash (.xlsx)
                                </Button>
                            </TabsContent>

                            {/* ── Manual tab ── */}
                            <TabsContent value="manual" className="px-6 py-5 space-y-4 mt-0">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">PINFL</label>
                                    <Input
                                        placeholder="14 xonali PINFL raqam…"
                                        value={manualPinfl}
                                        onChange={(e) => setManualPinfl(e.target.value.replace(/\D/g, "").slice(0, 14))}
                                        className="h-10 font-mono tracking-wider"
                                        maxLength={14}
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            Faqat raqamlar, 14 ta belgi
                                        </p>
                                        <p className={`text-xs font-mono ${manualPinfl.length === 14 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                            {manualPinfl.length}/14
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Yo'nalish</label>
                                    <Select value={manualChoice} onValueChange={setManualChoice}>
                                        <SelectTrigger className="h-10 w-full">
                                            <SelectValue placeholder="Yo'nalishni tanlang…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {choices.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {choiceLabel(c)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Dialog footer */}
                        <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 sm:flex-none"
                                onClick={() => handleOpenChange(false)}
                            >
                                Bekor qilish
                            </Button>

                            {tab === "excel" ? (
                                <Button
                                    type="button"
                                    className="flex-1 sm:flex-none gap-2"
                                    disabled={
                                        submittingExcel ||
                                        parsedRows.filter((r) => r.status === "ok").length === 0 ||
                                        !excelChoice
                                    }
                                    onClick={submitExcel}
                                >
                                    <Upload className="size-4" />
                                    {submittingExcel
                                        ? "Yuklanmoqda…"
                                        : `Yuklash (${parsedRows.filter((r) => r.status === "ok").length} ta)`}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    className="flex-1 sm:flex-none gap-2"
                                    disabled={
                                        submittingManual ||
                                        !isValidPinfl(manualPinfl) ||
                                        !manualChoice
                                    }
                                    onClick={submitManual}
                                >
                                    <UserPlus className="size-4" />
                                    {submittingManual ? "Qo'shilmoqda…" : "Qo'shish"}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Search bar ── */}
            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    placeholder="PINFL bo'yicha qidirish…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>

            {/* ── Table ── */}
            {loading ? (
                <TableSkeleton />
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Users className="size-7 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-semibold">Kandidat topilmadi</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {search ? "Qidiruv bo'yicha natija yo'q." : "Hali kandidatlar qo'shilmagan."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">PINFL</div>
                        <div className="col-span-5">Yo'nalish</div>
                        <div className="col-span-2 text-right">Amal</div>
                    </div>

                    {/* Rows */}
                    <div>
                        {filtered.map((c, i) => {
                            const rowNum = (page - 1) * LIMIT + i + 1;
                            const choiceObj = choices.find((ch) => ch._id === c.choice);

                            return (
                                <div
                                    key={c.pinfl}
                                    className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b last:border-none items-center hover:bg-muted/20 transition-colors"
                                >
                                    <div className="col-span-1 text-sm text-muted-foreground">
                                        {rowNum}
                                    </div>

                                    <div className="col-span-4">
                                        <span className="font-mono text-sm tracking-wide">
                                            {c.pinfl}
                                        </span>
                                    </div>

                                    <div className="col-span-5">
                                        {choiceObj ? (
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {choiceLabel(choiceObj)}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {c.choice}
                                            </span>
                                        )}
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        <span className="font-mono font-semibold">{c.pinfl}</span> PINFL li kandidat ro'yxatdan o'chiriladi. Bu amalni qaytarib bo'lmaydi.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteCandidate(c.pinfl)}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                    >
                                                        O'chirish
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-muted/20 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!meta.hasPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="gap-1.5 h-8"
                            >
                                <ChevronLeft className="size-3.5" />
                                Oldingi
                            </Button>

                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">{meta.page}</span>
                                {" / "}
                                {meta.totalPages}
                                <span className="ml-2 text-xs">· Jami: {meta.total}</span>
                            </p>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!meta.hasNext}
                                onClick={() => setPage((p) => p + 1)}
                                className="gap-1.5 h-8"
                            >
                                Keyingi
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}