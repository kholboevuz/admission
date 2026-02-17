"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, FileDown, Loader2 } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import html2pdf from "html2pdf.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type WorkItem = {
    id: string | number;
    startDate: string;
    endDate: string;
    organization: string;
    position: string;
    department?: string;
};

type Props = {
    data: {
        avatarUrl: string;
        passport: {
            fullName: string;
            birthDate: string;
            passportSeriesNumber: string;
            pinfl: string;
            issueDate: string;
            expiryDate: string;
            issuedBy: string;
        };
        work: WorkItem[];
        education: Array<{
            id: string | number;
            institution: string;
            educationType: string;
            specialty: string;
            graduationYear: string;
        }>;
    };
    onBack: () => void;
};

// ─────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────
const RelativeSchema = z.object({
    relation: z.string().min(2, "Qarindoshligi majburiy"),
    fio: z.string().min(5, "F.I.Sh majburiy"),
    birth: z.string().min(4, "Tug'ilgan yili/joyi majburiy"),
    job: z.string().min(2, "Ish joyi/lavozimi majburiy"),
    address: z.string().min(2, "Turar joyi majburiy"),
});

const FormSchema = z.object({
    orgLine1: z.string().min(3, "Majburiy"),
    orgLine2: z.string().min(3, "Majburiy"),
    birthYear: z.string().min(4, "Majburiy"),
    birthPlace: z.string().min(3, "Majburiy"),
    nationality: z.string().min(2, "Majburiy"),
    party: z.string().min(1, "Majburiy"),
    education: z.string().min(2, "Majburiy"),
    specialty: z.string().min(2, "Majburiy"),
    degree: z.string().min(1, "Majburiy"),
    title: z.string().min(1, "Majburiy"),
    languages: z.string().min(2, "Majburiy"),
    awards: z.string().min(1, "Majburiy"),
    deputy: z.string().min(1, "Majburiy"),
    relatives: z.array(RelativeSchema).min(1, "Kamida 1 ta qarindosh kiriting"),
});

export type MalumotnomaForm = z.infer<typeof FormSchema>;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function safeImg(src?: string | null) {
    const s = String(src ?? "").trim();
    return s ? s : "/assets/avatar.png";
}

function isOpenEndDate(v?: string | null) {
    const s = String(v ?? "").trim().toLowerCase();
    return !s || s === "-" || s === "hozirgacha" || s === "present";
}

function parseDDMMYYYY(s?: string | null): number {
    const m = String(s ?? "").trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return 0;
    return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function getYearFromDDMMYYYY(s?: string | null) {
    const m = String(s ?? "").trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return m ? m[3] : "";
}

function pickMainWork(workList: WorkItem[]): WorkItem | null {
    if (!workList?.length) return null;
    return (
        workList.find((w) => isOpenEndDate(w?.endDate)) ??
        [...workList].sort((a, b) => parseDDMMYYYY(b?.startDate) - parseDDMMYYYY(a?.startDate))[0]
    );
}

function workRangeLabel(w: WorkItem) {
    const fromY = getYearFromDDMMYYYY(w.startDate);
    const toY = isOpenEndDate(w.endDate) ? "hozirgacha" : getYearFromDDMMYYYY(w.endDate);
    return `${fromY || "—"} – ${toY || "—"}`;
}

function mergeDefaults(d: MalumotnomaForm, saved?: Partial<MalumotnomaForm> | null): MalumotnomaForm {
    if (!saved) return d;
    return {
        ...d,
        ...saved,
        relatives: Array.isArray(saved.relatives) && saved.relatives.length ? saved.relatives : d.relatives,
    };
}

function extractErrMsg(e: unknown): string {
    const err = e as any;
    return err?.response?.data?.error || err?.response?.data?.message || err?.message || "Serverda xatolik";
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function MalumotnomaSkeleton() {
    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-80 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
                    <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-[820px] animate-pulse rounded-2xl bg-muted" />
                <div className="h-[820px] animate-pulse rounded-2xl bg-muted" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// PDF overlay (shown while exporting)
// ─────────────────────────────────────────────
function PdfOverlay() {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: "40px 56px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    boxShadow: "0 8px 48px rgba(0,0,0,0.28)",
                    minWidth: 280,
                }}
            >
                <Loader2
                    className="animate-spin text-primary"
                    style={{ width: 48, height: 48 }}
                />
                <div style={{ fontSize: 16, fontWeight: 700 }}>PDF ga export qilinmoqda…</div>
                <div style={{ fontSize: 13, color: "#777", textAlign: "center" }}>
                    Iltimos kuting, hujjat tayyorlanmoqda
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// PDF-specific styles (injected via dangerouslySetInnerHTML)
// Tailwind does NOT touch these → PDF renders perfectly
// ─────────────────────────────────────────────
const PDF_STYLES = `
  .pdfdoc * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdfdoc {
    font-family: "Times New Roman", Times, serif;
    font-size: 11.5pt;
    color: #000;
    background: #fff;
    line-height: 1.55;
  }
  .pdfdoc .pdf-title {
    font-size: 17pt;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-align: center;
    text-transform: uppercase;
  }
  .pdfdoc .pdf-name {
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    margin-top: 6px;
  }
  .pdfdoc .pdf-org {
    font-size: 11pt;
    text-align: center;
    margin-top: 9px;
    line-height: 1.65;
  }
  .pdfdoc .pdf-hr {
    border: none;
    border-top: 1.5px solid #000;
    margin: 14px 0;
  }
  .pdfdoc .pdf-info-wrap {
    display: grid;
    grid-template-columns: 1fr 116px;
    gap: 18px;
    align-items: start;
    margin-top: 14px;
  }
  .pdfdoc .pdf-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 22px;
    font-size: 11pt;
  }
  .pdfdoc .pdf-info-full {
    grid-column: span 2;
  }
  .pdfdoc .pdf-b { font-weight: 700; }
  .pdfdoc .pdf-photo {
    width: 110px;
    height: 140px;
    border: 1.5px solid #000;
    overflow: hidden;
  }
  .pdfdoc .pdf-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .pdfdoc .pdf-sec {
    font-size: 11pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 20px 0 9px;
  }
  .pdfdoc .pdf-work-row {
    display: grid;
    grid-template-columns: 148px 1fr;
    gap: 8px;
    margin-bottom: 5px;
    font-size: 10.5pt;
  }
  .pdfdoc .pdf-work-year { color: #444; }
  .pdfdoc table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  .pdfdoc table th,
  .pdfdoc table td {
    border: 1.5px solid #000 !important;
    padding: 5px 7px;
    vertical-align: top;
    line-height: 1.4;
  }
  .pdfdoc table thead th {
    background: #e2e2e2;
    font-weight: 700;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pdfdoc .pdf-sig {
    margin-top: 30px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    font-size: 10.5pt;
  }
  .pdfdoc .pdf-sig-line {
    border-top: 1px solid #000;
    padding-top: 5px;
    margin-top: 26px;
    display: flex;
    justify-content: space-between;
  }
`;

// ─────────────────────────────────────────────
// PDF document template component
// ─────────────────────────────────────────────
interface PdfDocProps {
    v: MalumotnomaForm;
    fullName: string;
    workList: WorkItem[];
    avatarUrl: string;
}

function PdfDocument({ v, fullName, workList, avatarUrl }: PdfDocProps) {
    const year = new Date().getFullYear();
    return (
        <div className="pdfdoc">
            <style dangerouslySetInnerHTML={{ __html: PDF_STYLES }} />

            <div className="pdf-title">MA'LUMOTNOMA</div>
            <div className="pdf-name">{fullName}</div>
            <div className="pdf-org">
                {v.orgLine1}
                <br />
                {v.orgLine2}
            </div>

            <hr className="pdf-hr" />

            <div className="pdf-info-wrap">
                <div className="pdf-info-grid">
                    <div><span className="pdf-b">Tug'ilgan yili: </span>{v.birthYear || "—"}</div>
                    <div><span className="pdf-b">Tug'ilgan joyi: </span>{v.birthPlace || "—"}</div>
                    <div><span className="pdf-b">Millati: </span>{v.nationality || "—"}</div>
                    <div><span className="pdf-b">Partiyaviyligi: </span>{v.party || "—"}</div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Ma'lumoti: </span>{v.education || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Mutaxassisligi: </span>{v.specialty || "—"}
                    </div>
                    <div><span className="pdf-b">Ilmiy darajasi: </span>{v.degree || "—"}</div>
                    <div><span className="pdf-b">Ilmiy unvoni: </span>{v.title || "—"}</div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Qaysi chet tillarini biladi: </span>{v.languages || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Davlat mukofotlari bilan taqdirlanganmi (qanaqa): </span>
                        {v.awards || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">
                            Xalq deputatlari respublika/viloyat/shahar/tuman Kengashi deputatimi yoki boshqa saylanadigan organ:{" "}
                        </span>
                        {v.deputy || "—"}
                    </div>
                </div>

                <div className="pdf-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={safeImg(avatarUrl)} alt="photo" crossOrigin="anonymous" />
                </div>
            </div>

            <div className="pdf-sec">MEHNAT FAOLIYATI</div>
            <div>
                {workList.length ? (
                    workList.map((w) => (
                        <div key={String(w.id)} className="pdf-work-row">
                            <div className="pdf-work-year">{workRangeLabel(w)}</div>
                            <div>
                                <strong>{w.organization}</strong>
                                {w.position && <> — {w.position}</>}
                                {w.department && w.department !== "-" && (
                                    <span style={{ color: "#555" }}> ({w.department})</span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ color: "#999", fontSize: "10pt" }}>Mehnat faoliyati topilmadi</div>
                )}
            </div>

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

// ─────────────────────────────────────────────
// Field helper
// ─────────────────────────────────────────────
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
    return (
        <div>
            <div className="mb-1 text-xs text-muted-foreground">{label}</div>
            {children}
            {!!error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function MalumotnomaBuilder({ data, onBack }: Props) {
    const pinfl = data?.passport?.pinfl || "";
    const fullName = data?.passport?.fullName || "—";
    const birthYearGuess = data?.passport?.birthDate?.split(".")?.[2] || "";
    const edu0 = data?.education?.[0];
    const workList = Array.isArray(data?.work) ? data.work : [];
    const mainWork = pickMainWork(workList);

    const defaultOrg1 = mainWork?.organization?.trim() || "";
    const defaultOrg2 = [
        mainWork?.position || "",
        mainWork?.department && mainWork.department !== "-" ? `(${mainWork.department})` : "",
    ].filter(Boolean).join(" ").trim();

    const defaultValues: MalumotnomaForm = React.useMemo(() => ({
        orgLine1: defaultOrg1,
        orgLine2: defaultOrg2,
        birthYear: birthYearGuess,
        birthPlace: "",
        nationality: "o'zbek",
        party: "yo'q",
        education: edu0?.institution || "—",
        specialty: edu0?.specialty || "—",
        degree: "yo'q",
        title: "yo'q",
        languages: "",
        awards: "yo'q",
        deputy: "yo'q",
        relatives: [{ relation: "Otasi", fio: "", birth: "", job: "", address: "" }],
    }), [defaultOrg1, defaultOrg2, birthYearGuess, edu0?.institution, edu0?.specialty]);

    const form = useForm<MalumotnomaForm>({
        resolver: zodResolver(FormSchema),
        defaultValues,
        mode: "onChange",
    });
    const { control, register, watch, formState, reset, handleSubmit } = form;
    const { errors, isValid, isSubmitting } = formState;
    const relativesFA = useFieldArray({ control, name: "relatives" });
    const v = watch();

    const [loadingSaved, setLoadingSaved] = React.useState(true);
    const [pageError, setPageError] = React.useState<string | null>(null);
    const [saveOkAt, setSaveOkAt] = React.useState<string | null>(null);
    const [isPdfExporting, setIsPdfExporting] = React.useState(false);

    // Separate hidden node for clean PDF capture
    const pdfCaptureRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!pinfl) { setPageError("PINFL topilmadi."); setLoadingSaved(false); return; }
        (async () => {
            try {
                setLoadingSaved(true);
                const res = await axiosClient.get("/user/malumotnoma/get", { params: { pinfl } });
                reset(
                    res.data?.success && res.data?.data?.payload
                        ? mergeDefaults(defaultValues, res.data.data.payload)
                        : defaultValues
                );
            } catch (e) { setPageError(extractErrMsg(e)); }
            finally { setLoadingSaved(false); }
        })();
    }, [pinfl, defaultValues, reset]);

    const exportPDF = async () => {
        if (!pdfCaptureRef.current) return;
        setIsPdfExporting(true);
        await new Promise((r) => setTimeout(r, 100));

        try {
            await html2pdf()
                .set({
                    margin: [14, 14, 14, 14] as [number, number, number, number],
                    filename: `obyektivka-${fullName}.pdf`,
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
                            // ── 1. Barcha stylesheet'lardan lab()/oklch() ni o'chiramiz ──────────
                            try {
                                const sheets = Array.from(_clonedDoc.styleSheets);
                                sheets.forEach((sheet) => {
                                    try {
                                        const rules = Array.from(sheet.cssRules || []);
                                        rules.forEach((rule) => {
                                            if (
                                                rule instanceof CSSStyleRule &&
                                                (rule.cssText.includes("lab(") || rule.cssText.includes("oklch("))
                                            ) {
                                                try {
                                                    sheet.deleteRule(
                                                        Array.from(sheet.cssRules).indexOf(rule)
                                                    );
                                                } catch { }
                                            }
                                        });
                                    } catch { }
                                });
                            } catch { }

                            // ── 2. Capture element o'zida barcha ranglarni hex bilan override ───
                            const style = _clonedDoc.createElement("style");
                            style.textContent = `
              *, *::before, *::after {
                --background: #ffffff !important;
                --foreground: #000000 !important;
                --card: #ffffff !important;
                --card-foreground: #000000 !important;
                --popover: #ffffff !important;
                --popover-foreground: #000000 !important;
                --primary: #000000 !important;
                --primary-foreground: #ffffff !important;
                --secondary: #f0f0f0 !important;
                --secondary-foreground: #000000 !important;
                --muted: #f5f5f5 !important;
                --muted-foreground: #555555 !important;
                --accent: #f0f0f0 !important;
                --accent-foreground: #000000 !important;
                --destructive: #cc0000 !important;
                --destructive-foreground: #ffffff !important;
                --border: #cccccc !important;
                --input: #cccccc !important;
                --ring: #000000 !important;
              }
            `;
                            _clonedDoc.head.appendChild(style);

                            // ── 3. Har bir elementni ko'rib, lab()/oklch() bo'lsa hex ga ──────
                            const walk = (el: Element) => {
                                if (!(el instanceof HTMLElement)) return;
                                const s = el.style;
                                const fix = (prop: string) => {
                                    const val = s.getPropertyValue(prop);
                                    if (val.includes("lab(") || val.includes("oklch(")) {
                                        s.setProperty(prop, "#000000", "important");
                                    }
                                };
                                ["color", "background-color", "border-color", "outline-color"].forEach(fix);
                                Array.from(el.children).forEach(walk);
                            };
                            walk(element);
                        },
                    },
                    jsPDF: {
                        unit: "mm" as const,
                        format: "a4",
                        orientation: "portrait" as const,
                    },
                })
                .from(pdfCaptureRef.current)
                .save();
        } finally {
            setIsPdfExporting(false);
        }
    };

    const onSave = async (values: MalumotnomaForm) => {
        try {
            setPageError(null); setSaveOkAt(null);
            const res = await axiosClient.post("/user/malumotnoma/upsert", {
                pinfl: data.passport.pinfl,
                fullName: data.passport.fullName,
                passportSeriesNumber: data.passport.passportSeriesNumber,
                payload: values,
            });
            if (!res.data?.success) throw new Error(res.data?.error || "Saqlashda xatolik");
            setSaveOkAt(new Date().toLocaleString());
            showToast("Ma'lumotnoma muvaffaqiyatli saqlandi", ToastType.Success);
        } catch (e) {
            const msg = extractErrMsg(e);
            setPageError(String(msg));
            showToast(String(msg), ToastType.Error);
            throw e;
        }
    };

    if (loadingSaved) return <MalumotnomaSkeleton />;

    if (pageError && !pinfl) {
        return (
            <div className="p-4">
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <div className="text-sm font-semibold text-red-600">Xatolik</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">{pageError}</div>
                        <div className="mt-4"><Button variant="outline" onClick={onBack}>Ortga</Button></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            {isPdfExporting && <PdfOverlay />}

            <div
                aria-hidden
                style={{
                    position: "fixed",
                    top: 0,
                    left: "-9999px",
                    width: "800px",
                    background: "#fff",
                    zIndex: -1,
                    pointerEvents: "none",
                    colorScheme: "normal",
                    filter: "none",
                }}
            >
                <div ref={pdfCaptureRef} style={{ padding: "0px" }}>
                    <PdfDocument v={v} fullName={fullName} workList={workList} avatarUrl={data.avatarUrl} />
                </div>
            </div>

            <div className="p-4">
                {/* Toolbar */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <div className="text-lg font-semibold">Ma'lumotnoma (Obyektivka)</div>
                        {saveOkAt && <div className="mt-1 text-xs text-emerald-600">Saqlandi: {saveOkAt}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onBack} disabled={isSubmitting || isPdfExporting}>
                            Ortga
                        </Button>
                        <Button
                            variant="outline"
                            onClick={exportPDF}
                            disabled={isPdfExporting}
                            className="gap-2"
                        >
                            {isPdfExporting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <FileDown className="h-4 w-4" />
                            }
                            PDF yuklab olish
                        </Button>
                        <Button
                            onClick={handleSubmit(onSave)}
                            disabled={!isValid || isSubmitting || isPdfExporting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Saqlash
                        </Button>
                    </div>
                </div>

                {pageError && (
                    <div className="mb-4 rounded-2xl border bg-red-50 p-3 text-sm text-red-700 print:hidden">
                        {pageError}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: Form */}
                    <Card className="rounded-2xl print:hidden">
                        <CardHeader className="pb-3">
                            <div className="text-sm font-semibold">Ma'lumotlarni to'ldirish</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                Majburiy maydonlar to'ldirilmasa "Saqlash" o'chiriladi.
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-3">
                                <div className="text-sm font-medium">Ish joyi (header)</div>
                                <div className="grid gap-2">
                                    <Input {...register("orgLine1")} placeholder="Tashkilot nomi" />
                                    {errors.orgLine1 && <p className="text-xs text-red-600">{errors.orgLine1.message}</p>}
                                    <Input {...register("orgLine2")} placeholder="Lavozim (bo'lim)" />
                                    {errors.orgLine2 && <p className="text-xs text-red-600">{errors.orgLine2.message}</p>}
                                </div>
                            </div>
                            <Separator />
                            <div className="grid gap-3">
                                <div className="text-sm font-medium">Asosiy ma'lumotlar</div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Tug'ilgan yili" error={errors.birthYear?.message}>
                                        <Input {...register("birthYear")} placeholder="YYYY" />
                                    </Field>
                                    <Field label="Tug'ilgan joyi" error={errors.birthPlace?.message}>
                                        <Input {...register("birthPlace")} placeholder="Viloyat / tuman / shahar" />
                                    </Field>
                                    <Field label="Millati" error={errors.nationality?.message}>
                                        <Input {...register("nationality")} />
                                    </Field>
                                    <Field label="Partiyaviyligi" error={errors.party?.message}>
                                        <Input {...register("party")} placeholder="yo'q / ..." />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Tamomlagan (OTM)" error={errors.education?.message}>
                                            <Input {...register("education")} placeholder="OTM nomi" />
                                        </Field>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field label="Mutaxassisligi" error={errors.specialty?.message}>
                                            <Input {...register("specialty")} />
                                        </Field>
                                    </div>
                                    <Field label="Ilmiy darajasi" error={errors.degree?.message}>
                                        <Input {...register("degree")} placeholder="yo'q / ..." />
                                    </Field>
                                    <Field label="Ilmiy unvoni" error={errors.title?.message}>
                                        <Input {...register("title")} placeholder="yo'q / ..." />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Qaysi chet tillarini biladi" error={errors.languages?.message}>
                                            <Input {...register("languages")} placeholder="Ingliz, Rus, ..." />
                                        </Field>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field label="Davlat mukofotlari" error={errors.awards?.message}>
                                            <Input {...register("awards")} placeholder="yo'q / ..." />
                                        </Field>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field label="Deputatligi / boshqa saylanadigan organ" error={errors.deputy?.message}>
                                            <Input {...register("deputy")} placeholder="yo'q / ..." />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">Yaqin qarindoshlari</div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl"
                                        onClick={() => relativesFA.append({ relation: "", fio: "", birth: "", job: "", address: "" })}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />Qo'shish
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {relativesFA.fields.map((f, idx) => (
                                        <div key={f.id} className="rounded-2xl border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-semibold">Qarindosh #{idx + 1}</div>
                                                <Button
                                                    type="button" variant="ghost" className="rounded-xl"
                                                    onClick={() => relativesFA.remove(idx)}
                                                    disabled={relativesFA.fields.length <= 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Field label="Qarindoshligi" error={errors.relatives?.[idx]?.relation?.message}>
                                                    <Input {...register(`relatives.${idx}.relation`)} placeholder="Otasi / Onasi / ..." />
                                                </Field>
                                                <Field label="F.I.Sh" error={errors.relatives?.[idx]?.fio?.message}>
                                                    <Input {...register(`relatives.${idx}.fio`)} placeholder="Familiyasi Ismi Otasining ismi" />
                                                </Field>
                                                <div className="sm:col-span-2">
                                                    <Field label="Tug'ilgan yili va joyi" error={errors.relatives?.[idx]?.birth?.message}>
                                                        <Input {...register(`relatives.${idx}.birth`)} placeholder="YYYY, joyi" />
                                                    </Field>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <Field label="Ish joyi va lavozimi" error={errors.relatives?.[idx]?.job?.message}>
                                                        <Input {...register(`relatives.${idx}.job`)} placeholder="Tashkilot, lavozim" />
                                                    </Field>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <Field label="Turar joyi" error={errors.relatives?.[idx]?.address?.message}>
                                                        <Input {...register(`relatives.${idx}.address`)} placeholder="Manzil" />
                                                    </Field>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {!isValid && (
                                    <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-900">
                                        Ba'zi majburiy maydonlar to'ldirilmagan.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Live preview */}
                    <div className="print:col-span-2">
                        <div className="rounded-2xl border bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
                            <PdfDocument v={v} fullName={fullName} workList={workList} avatarUrl={data.avatarUrl} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}