"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { axiosClient } from "@/http/axios";
import html2pdf from "html2pdf.js";
import {
    ArrowLeft, FileDown, Loader2, CheckCircle2, XCircle, Clock,
    CreditCard, BookOpen, Briefcase, GraduationCap, Globe, User,
    FileText, AlertCircle, Phone, Mail, Languages, Building2, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus =
    | "draft" | "reviewed" | "submitted" | "paid"
    | "rejected" | "accepted" | "returned";

interface ApplicationData {
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
}

interface PassportData {
    fullName?: string;
    birthDate?: string;
    passportSeriesNumber?: string;
    pinfl?: string;
    issueDate?: string;
    expiryDate?: string;
    issuedBy?: string;
    avatarUrl?: string;
    [key: string]: any;
}

interface WorkItem {
    id?: string | number;
    startDate?: string;
    endDate?: string;
    organization?: string;
    position?: string;
    department?: string;
}

interface EducationItem {
    id?: string | number;
    institution?: string;
    educationType?: string;
    specialty?: string;
    graduationYear?: string;
    [key: string]: any;
}

interface InternationalDiploma {
    university?: string;
    direction?: string;
    educationType?: string;
    diplomaNumber?: string;
    diplomaFilePath?: string;
    nostrificationFilePath?: string;
}

interface MalumotnomPayload {
    orgLine1?: string;
    orgLine2?: string;
    birthYear?: string;
    birthPlace?: string;
    nationality?: string;
    party?: string;
    education?: string;
    specialty?: string;
    degree?: string;
    title?: string;
    languages?: string;
    awards?: string;
    deputy?: string;
    relatives?: {
        relation: string; fio: string; birth: string; job: string; address: string;
    }[];
}

interface DetailData {
    application: ApplicationData;
    passport: PassportData | null;
    passportError: string | null;
    employment: any;
    employmentError: string | null;
    education: any;
    educationError: string | null;
    internationalDiploma: InternationalDiploma | null;
    internationalDiplomaError: string | null;
    malumotnoma: { payload?: MalumotnomPayload; full_name?: string } | null;
    malumotnomaError: string | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_MAP: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "Qoralama", color: "bg-zinc-100 text-zinc-700 border-zinc-200", icon: <Clock className="h-3 w-3" /> },
    reviewed: { label: "Ko'rildi", color: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    submitted: { label: "Yuborildi", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <FileText className="h-3 w-3" /> },
    paid: { label: "To'langan", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CreditCard className="h-3 w-3" /> },
    rejected: { label: "Rad etildi", color: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    accepted: { label: "Qabul", color: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    returned: { label: "Qaytarildi", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
    const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
            {s.icon}
            {s.label}
        </span>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: any) {
    if (v == null || v === "" || v === "-") return <span className="text-muted-foreground/50">—</span>;
    return String(v);
}

function fmtDate(v: any) {
    if (!v) return <span className="text-muted-foreground/50">—</span>;
    try {
        return new Date(v).toLocaleDateString("uz-UZ", {
            year: "numeric", month: "2-digit", day: "2-digit",
        });
    } catch { return String(v); }
}

function isOpenEnd(v?: string | null) {
    const s = String(v ?? "").trim().toLowerCase();
    return !s || s === "-" || s === "hozirgacha" || s === "present";
}

function workYearRange(w: WorkItem) {
    const m1 = String(w.startDate ?? "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    const fromY = m1 ? m1[3] : (w.startDate ?? "—");
    const toY = isOpenEnd(w.endDate)
        ? "hozirgacha"
        : (String(w.endDate ?? "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/)?.[3] ?? w.endDate ?? "—");
    return `${fromY} – ${toY}`;
}

function safeImg(src?: string | null) {
    const s = String(src ?? "").trim();
    return s || "/assets/avatar.png";
}

function extractList(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-muted ${className ?? ""}`} />;
}

function DetailSkeleton() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="ml-auto h-9 w-32" />
            </div>

            {/* Top cards row */}
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="rounded-2xl">
                        <CardContent className="p-5 space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-4 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-3 space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </div>
    );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 py-2.5 border-b border-border/50 last:border-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {label}
            </span>
            <span className="text-sm font-medium text-foreground">{value ?? fmt(null)}</span>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
    icon, title, children, error,
}: { icon: React.ReactNode; title: string; children?: React.ReactNode; error?: string | null }) {
    return (
        <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
                        {icon}
                    </span>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
                {error ? (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                ) : (
                    children ?? (
                        <p className="text-sm text-muted-foreground">Ma'lumot mavjud emas</p>
                    )
                )}
            </CardContent>
        </Card>
    );
}

// ─── PDF Styles & Document ────────────────────────────────────────────────────

const PDF_STYLES = `
  .pdfdoc * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdfdoc {
    font-family: "Times New Roman", Times, serif;
    font-size: 11.5pt;
    color: #000;
    background: #fff;
    line-height: 1.55;
  }
  .pdfdoc .pdf-title { font-size:17pt; font-weight:700; letter-spacing:.13em; text-align:center; text-transform:uppercase; }
  .pdfdoc .pdf-name  { font-size:13pt; font-weight:700; text-align:center; text-transform:uppercase; margin-top:6px; }
  .pdfdoc .pdf-org   { font-size:11pt; text-align:center; margin-top:9px; line-height:1.65; }
  .pdfdoc .pdf-hr    { border:none; border-top:1.5px solid #000; margin:14px 0; }
  .pdfdoc .pdf-info-wrap  { display:grid; grid-template-columns:1fr 116px; gap:18px; align-items:start; margin-top:14px; }
  .pdfdoc .pdf-info-grid  { display:grid; grid-template-columns:1fr 1fr; gap:5px 22px; font-size:11pt; }
  .pdfdoc .pdf-info-full  { grid-column:span 2; }
  .pdfdoc .pdf-b          { font-weight:700; }
  .pdfdoc .pdf-photo      { width:110px; height:140px; border:1.5px solid #000; overflow:hidden; }
  .pdfdoc .pdf-photo img  { width:100%; height:100%; object-fit:cover; display:block; }
  .pdfdoc .pdf-sec        { font-size:11pt; font-weight:700; text-align:center; text-transform:uppercase; letter-spacing:.04em; margin:20px 0 9px; }
  .pdfdoc .pdf-work-row   { display:grid; grid-template-columns:148px 1fr; gap:8px; margin-bottom:5px; font-size:10.5pt; }
  .pdfdoc .pdf-work-year  { color:#444; }
  .pdfdoc table           { width:100%; border-collapse:collapse; font-size:10pt; }
  .pdfdoc table th, .pdfdoc table td { border:1.5px solid #000!important; padding:5px 7px; vertical-align:top; line-height:1.4; }
  .pdfdoc table thead th  { background:#e2e2e2; font-weight:700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .pdfdoc .pdf-sig        { margin-top:30px; display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:10.5pt; }
  .pdfdoc .pdf-sig-line   { border-top:1px solid #000; padding-top:5px; margin-top:26px; display:flex; justify-content:space-between; }
`;

function MalumotnomaPdf({
    payload, fullName, workList, avatarUrl,
}: {
    payload: MalumotnomPayload;
    fullName: string;
    workList: WorkItem[];
    avatarUrl?: string;
}) {
    const v = payload;
    return (
        <div className="pdfdoc">
            <style dangerouslySetInnerHTML={{ __html: PDF_STYLES }} />
            <div className="pdf-title">MA'LUMOTNOMA</div>
            <div className="pdf-name">{fullName}</div>
            <div className="pdf-org">
                {v.orgLine1}<br />{v.orgLine2}
            </div>
            <hr className="pdf-hr" />
            <div className="pdf-info-wrap">
                <div className="pdf-info-grid">
                    <div><span className="pdf-b">Tug'ilgan yili: </span>{v.birthYear || "—"}</div>
                    <div><span className="pdf-b">Tug'ilgan joyi: </span>{v.birthPlace || "—"}</div>
                    <div><span className="pdf-b">Millati: </span>{v.nationality || "—"}</div>
                    <div><span className="pdf-b">Partiyaviyligi: </span>{v.party || "—"}</div>
                    <div className="pdf-info-full"><span className="pdf-b">Ma'lumoti: </span>{v.education || "—"}</div>
                    <div className="pdf-info-full"><span className="pdf-b">Mutaxassisligi: </span>{v.specialty || "—"}</div>
                    <div><span className="pdf-b">Ilmiy darajasi: </span>{v.degree || "—"}</div>
                    <div><span className="pdf-b">Ilmiy unvoni: </span>{v.title || "—"}</div>
                    <div className="pdf-info-full"><span className="pdf-b">Qaysi chet tillarini biladi: </span>{v.languages || "—"}</div>
                    <div className="pdf-info-full"><span className="pdf-b">Davlat mukofotlari: </span>{v.awards || "—"}</div>
                    <div className="pdf-info-full"><span className="pdf-b">Deputatligi: </span>{v.deputy || "—"}</div>
                </div>
                <div className="pdf-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={safeImg(avatarUrl)} alt="photo" crossOrigin="anonymous" />
                </div>
            </div>

            <div className="pdf-sec">MEHNAT FAOLIYATI</div>
            {workList.length ? workList.map((w, i) => (
                <div key={i} className="pdf-work-row">
                    <div className="pdf-work-year">{workYearRange(w)}</div>
                    <div>
                        <strong>{w.organization}</strong>
                        {w.position && <> — {w.position}</>}
                        {w.department && w.department !== "-" && (
                            <span style={{ color: "#555" }}> ({w.department})</span>
                        )}
                    </div>
                </div>
            )) : (
                <div style={{ color: "#999", fontSize: "10pt" }}>Mehnat faoliyati topilmadi</div>
            )}

            <div className="pdf-sec">{fullName} yaqin qarindoshlari haqida MA'LUMOT</div>
            <table>
                <thead>
                    <tr>
                        <th style={{ width: "95px" }}>Qarindoshligi</th>
                        <th>Familiyasi, ismi va otasining ismi</th>
                        <th style={{ width: "152px" }}>Tug'ilgan yili va joyi</th>
                        <th>Ish joyi va lavozimi</th>
                        <th style={{ width: "128px" }}>Turar joyi</th>
                    </tr>
                </thead>
                <tbody>
                    {(v.relatives || []).map((r, i) => (
                        <tr key={i}>
                            <td>{r.relation || "—"}</td>
                            <td>{r.fio || "—"}</td>
                            <td>{r.birth || "—"}</td>
                            <td>{r.job || "—"}</td>
                            <td>{r.address || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPdfExporting, setIsPdfExporting] = useState(false);
    const pdfCaptureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!params.id) return;
        (async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/manager/applications/my/${params.id}`);
                if (!res.data?.success) throw new Error(res.data?.error || "Xatolik");
                setData(res.data.data);
            } catch (e: any) {
                setError(e?.response?.data?.error || e?.message || "Serverda xatolik");
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);

    const exportPDF = async () => {
        if (!pdfCaptureRef.current) return;
        setIsPdfExporting(true);
        await new Promise(r => setTimeout(r, 120));
        try {
            const fullName =
                data?.malumotnoma?.full_name ||
                data?.passport?.fullName ||
                "abituriyent";
            await html2pdf()
                .set({
                    margin: [14, 14, 14, 14] as [number, number, number, number],
                    filename: `malumotnoma-${fullName}.pdf`,
                    image: { type: "jpeg" as const, quality: 1 },
                    html2canvas: {
                        scale: 3,
                        useCORS: true,
                        allowTaint: true,
                        scrollX: 0,
                        scrollY: 0,
                        backgroundColor: "#ffffff",
                        logging: false,
                        onclone: (_clonedDoc: Document, element: HTMLElement) => {
                            try {
                                Array.from(_clonedDoc.styleSheets).forEach(sheet => {
                                    try {
                                        Array.from(sheet.cssRules || []).forEach(rule => {
                                            if (rule instanceof CSSStyleRule &&
                                                (rule.cssText.includes("lab(") || rule.cssText.includes("oklch("))) {
                                                try { sheet.deleteRule(Array.from(sheet.cssRules).indexOf(rule)); } catch { }
                                            }
                                        });
                                    } catch { }
                                });
                            } catch { }
                            const style = _clonedDoc.createElement("style");
                            style.textContent = `
                                *, *::before, *::after {
                                    --background:#fff!important; --foreground:#000!important;
                                    --card:#fff!important; --card-foreground:#000!important;
                                    --border:#ccc!important; --muted:#f5f5f5!important;
                                    --muted-foreground:#555!important;
                                }
                            `;
                            _clonedDoc.head.appendChild(style);
                        },
                    },
                    jsPDF: { unit: "mm" as const, format: "a4", orientation: "portrait" as const },
                })
                .from(pdfCaptureRef.current)
                .save();
        } finally {
            setIsPdfExporting(false);
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) return <DetailSkeleton />;

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !data) {
        return (
            <div className="mx-auto max-w-xl p-10 text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
                <h2 className="text-lg font-semibold">Xatolik yuz berdi</h2>
                <p className="mt-2 text-sm text-muted-foreground">{error || "Ma'lumot topilmadi"}</p>
                <Button className="mt-6 rounded-xl" variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />Ortga
                </Button>
            </div>
        );
    }

    const { application, passport, employment, education, internationalDiploma, malumotnoma } = data;
    const workList = extractList(employment);
    const educationList = extractList(education);
    const fullName = passport?.fullName || malumotnoma?.full_name || "—";
    const hasMalumotnoma = !!malumotnoma?.payload;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* PDF overlay */}
            {isPdfExporting && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-12 py-10 shadow-2xl">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-semibold">PDF tayyorlanmoqda…</p>
                        <p className="text-sm text-muted-foreground">Iltimos kuting</p>
                    </div>
                </div>
            )}

            {/* Hidden PDF capture node */}
            {hasMalumotnoma && (
                <div
                    aria-hidden
                    style={{
                        position: "fixed", top: 0, left: "-9999px", width: "800px",
                        background: "#fff", zIndex: -1, pointerEvents: "none",
                    }}
                >
                    <div ref={pdfCaptureRef} style={{ padding: 0 }}>
                        <MalumotnomaPdf
                            payload={malumotnoma!.payload!}
                            fullName={fullName}
                            workList={workList}
                            avatarUrl={passport?.avatarUrl}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-6 p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Ariza tafsiloti</h1>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{application._id}</p>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {hasMalumotnoma && (
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2"
                                onClick={exportPDF}
                                disabled={isPdfExporting}
                            >
                                {isPdfExporting
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <FileDown className="h-4 w-4" />}
                                Ma'lumotnoma PDF
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Status cards ── */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Status */}
                    <Card className="rounded-2xl border-border/60 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                                Ariza holati
                            </p>
                            <StatusBadge status={application.application_status} />
                            <p className="mt-3 text-xs text-muted-foreground">
                                Qadam: <strong>{application.step}</strong>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Payment */}
                    <Card className="rounded-2xl border-border/60 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                                To'lov
                            </p>
                            {application.payment_status ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" />To'langan
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
                                    <XCircle className="h-4 w-4" />To'lanmagan
                                </span>
                            )}
                            <p className="mt-3 text-xs text-muted-foreground">
                                Yaratildi: <strong>{fmtDate(application.createdAt)}</strong>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Choice */}
                    <Card className="rounded-2xl border-border/60 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
                                Yo'nalish tanlovi
                            </p>
                            <p className="text-sm font-semibold leading-snug">
                                {application.step_1?.choice?.name || "—"}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground font-mono">
                                {application.step_1?.choice?.id}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Main grid ── */}
                <div className="grid gap-6 lg:grid-cols-5">

                    {/* ─ Left column ─ */}
                    <div className="space-y-4 lg:col-span-2">

                        {/* Passport */}
                        <Section icon={<User className="h-4 w-4" />} title="Shaxsiy ma'lumotlar" error={data.passportError}>
                            {passport && (
                                <div className="flex gap-4">
                                    {passport.avatarUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={passport.avatarUrl}
                                            alt="avatar"
                                            className="h-24 w-20 shrink-0 rounded-xl object-cover border"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <InfoRow label="F.I.O" value={<span className="font-bold">{passport.fullName}</span>} />
                                        <InfoRow label="PINFL" value={<span className="font-mono text-xs">{passport.pinfl}</span>} />
                                        <InfoRow label="Tug'ilgan sana" value={fmt(passport.birthDate)} />
                                        <InfoRow label="Pasport seriyasi" value={fmt(passport.passportSeriesNumber)} />
                                    </div>
                                </div>
                            )}
                            {!passport && !data.passportError && (
                                <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
                            )}
                            {passport && (
                                <div className="mt-1">
                                    <InfoRow label="Berilgan sana" value={fmt(passport.issueDate)} />
                                    <InfoRow label="Amal qilish muddati" value={fmt(passport.expiryDate)} />
                                    <InfoRow label="Kim tomonidan berilgan" value={fmt(passport.issuedBy)} />
                                </div>
                            )}
                        </Section>

                        {/* Contact */}
                        <Section icon={<Phone className="h-4 w-4" />} title="Bog'lanish ma'lumotlari">
                            <InfoRow
                                label="Telefon"
                                value={
                                    <a href={`tel:${application.step_1?.phone_number}`}
                                        className="text-primary hover:underline">
                                        {application.step_1?.phone_number}
                                    </a>
                                }
                            />
                            {application.step_1?.phone_number_additional && (
                                <InfoRow
                                    label="Qo'shimcha telefon"
                                    value={
                                        <a href={`tel:${application.step_1.phone_number_additional}`}
                                            className="text-primary hover:underline">
                                            {application.step_1.phone_number_additional}
                                        </a>
                                    }
                                />
                            )}
                            <InfoRow
                                label="Email"
                                value={
                                    <a href={`mailto:${application.step_1?.email}`}
                                        className="text-primary hover:underline">
                                        {application.step_1?.email}
                                    </a>
                                }
                            />

                            {/* Certificate or exam language */}
                            <Separator className="my-2" />
                            {application.step_1?.isCertified ? (
                                <>
                                    <InfoRow label="Sertifikat" value={
                                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                                            <CheckCircle2 className="h-3.5 w-3.5" />Mavjud
                                        </span>
                                    } />
                                    {application.step_1.certificate_file && (
                                        <InfoRow label="Sertifikat fayl" value={
                                            <a href={application.step_1.certificate_file}
                                                target="_blank" rel="noreferrer"
                                                className="text-primary hover:underline text-xs">
                                                Ko'rish →
                                            </a>
                                        } />
                                    )}
                                </>
                            ) : (
                                <InfoRow
                                    label="Imtihon tili"
                                    value={
                                        <span className="inline-flex items-center gap-1.5">
                                            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                                            {fmt(application.step_1?.exam_language)}
                                        </span>
                                    }
                                />
                            )}
                        </Section>

                        {/* Comments */}
                        {application.comments?.length > 0 && (
                            <Section icon={<FileText className="h-4 w-4" />} title="Izohlar">
                                <div className="space-y-3">
                                    {application.comments.map((c, i) => (
                                        <div key={i} className="rounded-xl bg-muted/50 p-3">
                                            <p className="text-xs text-muted-foreground mb-1">{c.date}</p>
                                            <p className="text-sm">{c.comment}</p>
                                            {c.file && (
                                                <a href={c.file} target="_blank" rel="noreferrer"
                                                    className="mt-1.5 inline-block text-xs text-primary hover:underline">
                                                    Fayl ko'rish →
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* ─ Right column ─ */}
                    <div className="space-y-4 lg:col-span-3">

                        {/* Education */}
                        <Section
                            icon={<GraduationCap className="h-4 w-4" />}
                            title="Ta'lim ma'lumotlari"
                            error={data.educationError}
                        >
                            {educationList.length ? (
                                <div className="space-y-2">
                                    {educationList.map((e: EducationItem, i: number) => (
                                        <div key={i} className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-1">
                                                <p className="text-sm font-semibold">{e.institution || "—"}</p>
                                                {e.graduationYear && (
                                                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-background border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />{e.graduationYear}
                                                    </span>
                                                )}
                                            </div>
                                            {e.educationType && (
                                                <Badge variant="secondary" className="mt-1.5 text-[10px]">
                                                    {e.educationType}
                                                </Badge>
                                            )}
                                            {e.specialty && (
                                                <p className="mt-1 text-xs text-muted-foreground">{e.specialty}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Ta'lim ma'lumoti topilmadi</p>
                            )}
                        </Section>

                        {/* International Diploma */}
                        {(internationalDiploma || data.internationalDiplomaError) && (
                            <Section
                                icon={<Globe className="h-4 w-4" />}
                                title="Xalqaro diplom"
                                error={data.internationalDiplomaError}
                            >
                                {internationalDiploma && (
                                    <>
                                        <InfoRow label="Universitet" value={fmt(internationalDiploma.university)} />
                                        <InfoRow label="Yo'nalish" value={fmt(internationalDiploma.direction)} />
                                        <InfoRow label="Ta'lim turi" value={
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {internationalDiploma.educationType}
                                            </Badge>
                                        } />
                                        <InfoRow label="Diplom raqami" value={
                                            <span className="font-mono text-xs">{internationalDiploma.diplomaNumber}</span>
                                        } />
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {internationalDiploma.diplomaFilePath && (
                                                <a href={internationalDiploma.diplomaFilePath}
                                                    target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                                    <FileDown className="h-3.5 w-3.5" />Diplom fayli
                                                </a>
                                            )}
                                            {internationalDiploma.nostrificationFilePath && (
                                                <a href={internationalDiploma.nostrificationFilePath}
                                                    target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                                    <FileDown className="h-3.5 w-3.5" />Nostrifikatsiya
                                                </a>
                                            )}
                                        </div>
                                    </>
                                )}
                            </Section>
                        )}

                        {/* Esse */}
                        {application.esse && (
                            <Section icon={<BookOpen className="h-4 w-4" />} title="Esse">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                                    {application.esse}
                                </p>
                            </Section>
                        )}

                        {/* Malumotnoma */}
                        {hasMalumotnoma && (
                            <Section icon={<FileText className="h-4 w-4" />} title="Ma'lumotnoma (Obyektivka)">
                                <div className="rounded-xl border bg-white p-6 shadow-inner">
                                    <MalumotnomaPdf
                                        payload={malumotnoma!.payload!}
                                        fullName={fullName}
                                        workList={workList}
                                        avatarUrl={passport?.avatarUrl}
                                    />
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        variant="outline"
                                        className="rounded-xl gap-2"
                                        onClick={exportPDF}
                                        disabled={isPdfExporting}
                                    >
                                        {isPdfExporting
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <FileDown className="h-4 w-4" />}
                                        PDF yuklab olish
                                    </Button>
                                </div>
                            </Section>
                        )}

                        {!hasMalumotnoma && !data.malumotnomaError && (
                            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-5 text-center">
                                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Ma'lumotnoma (obyektivka) hali to'ldirilmagan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}