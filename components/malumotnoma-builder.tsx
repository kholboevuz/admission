"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, FileDown, Loader2, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import html2pdf from "html2pdf.js";

type WorkItem = {
    id?: string | number;
    startDate?: string;
    endDate?: string;
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

const RelativeSchema = z.object({
    relation: z.string().min(2, "Qarindoshligi majburiy"),
    fio: z.string().min(5, "F.I.Sh majburiy"),
    birth: z.string().min(4, "Tug'ilgan yili/joyi majburiy"),
    job: z.string().min(2, "Ish joyi/lavozimi majburiy"),
    address: z.string().min(2, "Turar joyi majburiy"),
});

const WorkHistorySchema = z.object({
    startYear: z.string().min(1, "Boshlangan yili majburiy"),
    endYear: z.string().min(1).default("hozirgacha"),
    organization: z.string().min(2, "Tashkilot nomi majburiy"),
    position: z.string().min(2, "Lavozim majburiy"),
    department: z.string().default(""),
});

const coerceArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const WorkItemsSchema = z
    .any()
    .transform((v) => (Array.isArray(v) ? v : []))
    .pipe(z.array(WorkHistorySchema));

const RelativesSchema = z
    .any()
    .transform((v) => (Array.isArray(v) ? v : []))
    .pipe(z.array(RelativeSchema).min(1, "Kamida 1 ta qarindosh kiriting"));

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

    workItems: WorkItemsSchema,
    relatives: RelativesSchema,
});

export type MalumotnomaForm = z.output<typeof FormSchema>;

interface PdfWorkItem {
    startYear: string;
    endYear: string;
    organization: string;
    position: string;
    department: string;
}

function safeImg(src?: string | null) {
    return String(src ?? "").trim() || "/assets/avatar.png";
}

function isOpenEndDate(v?: string | null) {
    const s = String(v ?? "").trim().toLowerCase();
    return !s || s === "-" || s === "hozirgacha" || s === "present" || s === "null";
}

function extractYear(iso?: string | null): string {
    if (!iso) return "";
    const s = String(iso).trim();
    const m1 = s.match(/^(\d{4})/);
    if (m1) return m1[1];
    const m2 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return m2 ? m2[3] : "";
}

function rawWorkToPdf(workList: WorkItem[]): PdfWorkItem[] {
    return (workList || []).map((w) => ({
        startYear: extractYear(w.startDate) || "—",
        endYear: isOpenEndDate(w.endDate) ? "hozirgacha" : extractYear(w.endDate) || "—",
        organization: String(w.organization || "").trim(),
        position: String(w.position || "").trim(),
        department: String(w.department ?? "").trim(),
    }));
}

function pickMainWork(workList: WorkItem[]): WorkItem | null {
    if (!workList?.length) return null;
    return workList.find((w) => isOpenEndDate(w?.endDate)) ?? workList[workList.length - 1];
}

function mergeDefaults(d: MalumotnomaForm, saved?: Partial<MalumotnomaForm> | null): MalumotnomaForm {
    if (!saved) return d;
    return {
        ...d,
        ...saved,
        workItems: Array.isArray(saved.workItems) ? saved.workItems : d.workItems,
        relatives: Array.isArray(saved.relatives) && saved.relatives.length ? saved.relatives : d.relatives,
    };
}

function extractErrMsg(e: unknown): string {
    const err = e as any;
    return err?.response?.data?.error || err?.response?.data?.message || err?.message || "Serverda xatolik";
}

function sanitizeFileName(name: string) {
    const s = String(name || "document")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 80);
    return s || "document";
}

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
                <Loader2 className="animate-spin text-primary" style={{ width: 48, height: 48 }} />
                <div style={{ fontSize: 16, fontWeight: 700 }}>PDF ga export qilinmoqda…</div>
                <div style={{ fontSize: 13, color: "#777", textAlign: "center" }}>Iltimos kuting, hujjat tayyorlanmoqda</div>
            </div>
        </div>
    );
}

const PDF_STYLES = `
  .pdfdoc * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdfdoc {
    font-family: "Times New Roman", Times, serif;
    font-size: 11.5pt; color: #000; background: #fff; line-height: 1.55;
  }
  .pdfdoc .pdf-title {
    font-size: 17pt; font-weight: 700; letter-spacing: 0.13em;
    text-align: center; text-transform: uppercase;
  }
  .pdfdoc .pdf-name {
    font-size: 13pt; font-weight: 700; text-align: center;
    text-transform: uppercase; margin-top: 6px;
  }
  .pdfdoc .pdf-org { font-size: 11pt; text-align: center; margin-top: 9px; line-height: 1.65; }
  .pdfdoc .pdf-hr  { border: none; border-top: 1.5px solid #000; margin: 14px 0; }
  .pdfdoc .pdf-info-wrap {
    display: grid; grid-template-columns: 1fr 116px;
    gap: 18px; align-items: start; margin-top: 14px;
  }
  .pdfdoc .pdf-info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 5px 22px; font-size: 11pt;
  }
  .pdfdoc .pdf-info-full { grid-column: span 2; }
  .pdfdoc .pdf-b { font-weight: 700; }
  .pdfdoc .pdf-photo { width: 110px; height: 140px; border: 1.5px solid #000; overflow: hidden; }
  .pdfdoc .pdf-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pdfdoc .pdf-sec {
    font-size: 11pt; font-weight: 700; text-align: center;
    text-transform: uppercase; letter-spacing: 0.04em; margin: 20px 0 9px;
  }
  .pdfdoc .pdf-work-row {
    display: grid; grid-template-columns: 148px 1fr;
    gap: 8px; margin-bottom: 5px; font-size: 10.5pt;
  }
  .pdfdoc .pdf-work-year { color: #444; }
  .pdfdoc table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .pdfdoc table th, .pdfdoc table td {
    border: 1.5px solid #000 !important; padding: 5px 7px;
    vertical-align: top; line-height: 1.4;
  }
  .pdfdoc table thead th {
    background: #e2e2e2; font-weight: 700;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
`;

interface PdfDocProps {
    v: MalumotnomaForm;
    fullName: string;
    avatarUrl: string;
}

function PdfDocument({ v, fullName, avatarUrl }: PdfDocProps) {
    return (
        <div className="pdfdoc">
            <style dangerouslySetInnerHTML={{ __html: PDF_STYLES }} />
            <div className="pdf-title">MA&apos;LUMOTNOMA</div>
            <div className="pdf-name">{fullName}</div>
            <div className="pdf-org">
                {v.orgLine1}
                <br />
                {v.orgLine2}
            </div>

            <hr className="pdf-hr" />

            <div className="pdf-info-wrap">
                <div className="pdf-info-grid">
                    <div>
                        <span className="pdf-b">Tug&apos;ilgan yili: </span>
                        {v.birthYear || "—"}
                    </div>
                    <div>
                        <span className="pdf-b">Tug&apos;ilgan joyi: </span>
                        {v.birthPlace || "—"}
                    </div>
                    <div>
                        <span className="pdf-b">Millati: </span>
                        {v.nationality || "—"}
                    </div>
                    <div>
                        <span className="pdf-b">Partiyaviyligi: </span>
                        {v.party || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Ma&apos;lumoti: </span>
                        {v.education || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Mutaxassisligi: </span>
                        {v.specialty || "—"}
                    </div>
                    <div>
                        <span className="pdf-b">Ilmiy darajasi: </span>
                        {v.degree || "—"}
                    </div>
                    <div>
                        <span className="pdf-b">Ilmiy unvoni: </span>
                        {v.title || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Qaysi chet tillarini biladi: </span>
                        {v.languages || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Davlat mukofotlari bilan taqdirlanganmi: </span>
                        {v.awards || "—"}
                    </div>
                    <div className="pdf-info-full">
                        <span className="pdf-b">Xalq deputatlari respublika/viloyat/shahar/tuman Kengashi deputatimi: </span>
                        {v.deputy || "—"}
                    </div>
                </div>

                <div className="pdf-photo">
                    <img src={safeImg(avatarUrl)} alt="photo" crossOrigin="anonymous" />
                </div>
            </div>

            <div className="pdf-sec">MEHNAT FAOLIYATI</div>
            <div>
                {v.workItems?.length ? (
                    v.workItems.map((w, i) => (
                        <div key={i} className="pdf-work-row">
                            <div className="pdf-work-year">
                                {w.startYear || "—"} – {w.endYear || "hozirgacha"}
                            </div>
                            <div>
                                <strong>{w.organization || "—"}</strong>
                                {w.position ? <> — {w.position}</> : null}
                                {w.department && w.department !== "-" ? <span style={{ color: "#555" }}> ({w.department})</span> : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ color: "#999", fontSize: "10pt" }}>Mehnat faoliyati topilmadi</div>
                )}
            </div>

            <div className="pdf-sec">{fullName} yaqin qarindoshlari haqida MA&apos;LUMOT</div>
            <table>
                <thead>
                    <tr>
                        <th style={{ width: "95px" }}>Qarindoshligi</th>
                        <th>Familiyasi, ismi va otasining ismi</th>
                        <th style={{ width: "152px" }}>Tug&apos;ilgan yili va joyi</th>
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

function Field({
    label,
    children,
    error,
}: {
    label: string;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div>
            <div className="mb-1 text-xs text-muted-foreground">{label}</div>
            {children}
            {!!error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

function CollapsibleSection({
    title,
    badge,
    children,
}: {
    title: string;
    badge?: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(true);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-medium"
            >
                <span className="flex items-center gap-2">
                    {title}
                    {badge !== undefined && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {badge}
                        </span>
                    )}
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {open && <div className="mt-3">{children}</div>}
        </div>
    );
}

export function MalumotnomaBuilder({ data, onBack }: Props) {
    const pinfl = data?.passport?.pinfl || "";
    const fullName = data?.passport?.fullName || "—";
    const birthYearGuess = data?.passport?.birthDate?.split(".")?.[2] || "";
    const edu0 = data?.education?.[0];
    const rawWorkList = Array.isArray(data?.work) ? data.work : [];
    const mainWork = pickMainWork(rawWorkList);

    const initialWorkItems = React.useMemo(() => rawWorkToPdf(rawWorkList), [rawWorkList]);

    const defaultOrg1 = String(mainWork?.organization ?? "").trim();
    const defaultOrg2 = [mainWork?.position || "", mainWork?.department && mainWork.department !== "-" ? `(${mainWork.department})` : ""]
        .filter(Boolean)
        .join(" ")
        .trim();

    const defaultValues = React.useMemo<MalumotnomaForm>(
        () => ({
            orgLine1: defaultOrg1 || "",
            orgLine2: defaultOrg2 || "",
            birthYear: birthYearGuess || "",
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
            workItems: initialWorkItems,
            relatives: [{ relation: "Otasi", fio: "", birth: "", job: "", address: "" }],
        }),
        [defaultOrg1, defaultOrg2, birthYearGuess, edu0?.institution, edu0?.specialty, initialWorkItems]
    );

    const form = useForm<MalumotnomaForm>({
        resolver: zodResolver(FormSchema),
        defaultValues,
        mode: "onChange",
    });

    const { control, register, watch, formState, reset, handleSubmit } = form;
    const { errors, isValid, isSubmitting } = formState;

    const relativesFA = useFieldArray({ control, name: "relatives" });
    const workItemsFA = useFieldArray({ control, name: "workItems" });

    const v = watch();

    const [loadingSaved, setLoadingSaved] = React.useState(true);
    const [pageError, setPageError] = React.useState<string | null>(null);
    const [saveOkAt, setSaveOkAt] = React.useState<string | null>(null);
    const [isPdfExporting, setIsPdfExporting] = React.useState(false);

    const pdfCaptureRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!pinfl) {
            setPageError("PINFL topilmadi.");
            setLoadingSaved(false);
            return;
        }

        let alive = true;

        (async () => {
            try {
                setLoadingSaved(true);
                const res = await axiosClient.get("/user/malumotnoma/get", { params: { pinfl } });
                const payload = res.data?.success ? (res.data?.data?.payload as Partial<MalumotnomaForm> | undefined) : undefined;
                if (!alive) return;
                reset(payload ? mergeDefaults(defaultValues, payload) : defaultValues);
            } catch (e) {
                if (!alive) return;
                setPageError(extractErrMsg(e));
            } finally {
                if (!alive) return;
                setLoadingSaved(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [pinfl, defaultValues, reset]);

    const exportPDF = async () => {
        if (!pdfCaptureRef.current) return;
        setIsPdfExporting(true);
        await new Promise((r) => setTimeout(r, 50));
        try {
            const filename = `obyektivka-${sanitizeFileName(fullName)}.pdf`;

            await html2pdf()
                .set({
                    margin: [14, 14, 14, 14] as [number, number, number, number],
                    filename,
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
                                Array.from(_clonedDoc.styleSheets).forEach((sheet) => {
                                    try {
                                        Array.from((sheet as CSSStyleSheet).cssRules || []).forEach((rule) => {
                                            if (
                                                rule instanceof CSSStyleRule &&
                                                (rule.cssText.includes("lab(") || rule.cssText.includes("oklch("))
                                            ) {
                                                try {
                                                    (sheet as CSSStyleSheet).deleteRule(
                                                        Array.from((sheet as CSSStyleSheet).cssRules).indexOf(rule)
                                                    );
                                                } catch { }
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

                            const walk = (el: Element) => {
                                if (!(el instanceof HTMLElement)) return;
                                ["color", "background-color", "border-color"].forEach((prop) => {
                                    const val = el.style.getPropertyValue(prop);
                                    if (val.includes("lab(") || val.includes("oklch(")) el.style.setProperty(prop, "#000000", "important");
                                });
                                Array.from(el.children).forEach(walk);
                            };
                            walk(element);
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

    const onSave = async (values: MalumotnomaForm) => {
        try {
            setPageError(null);
            setSaveOkAt(null);

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
                        <div className="mt-4">
                            <Button variant="outline" onClick={onBack}>
                                Ortga
                            </Button>
                        </div>
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
                }}
            >
                <div ref={pdfCaptureRef}>
                    <PdfDocument v={v} fullName={fullName} avatarUrl={data.avatarUrl} />
                </div>
            </div>

            <div className="p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <div className="text-lg font-semibold">Ma&apos;lumotnoma (Obyektivka)</div>
                        {saveOkAt && <div className="mt-1 text-xs text-emerald-600">Saqlandi: {saveOkAt}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onBack} disabled={isSubmitting || isPdfExporting}>
                            Ortga
                        </Button>
                        <Button variant="outline" onClick={exportPDF} disabled={isPdfExporting} className="gap-2">
                            {isPdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                            PDF yuklab olish
                        </Button>
                        <Button onClick={handleSubmit(onSave)} disabled={!isValid || isSubmitting || isPdfExporting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Saqlash
                        </Button>
                    </div>
                </div>

                {pageError && (
                    <div className="mb-4 rounded-2xl border bg-red-50 p-3 text-sm text-red-700 print:hidden">{pageError}</div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-2xl print:hidden">
                        <CardHeader className="pb-3">
                            <div className="text-sm font-semibold">Ma&apos;lumotlarni to&apos;ldirish</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                Majburiy maydonlar to&apos;ldirilmasa &quot;Saqlash&quot; o&apos;chiriladi.
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            <div className="grid gap-2">
                                <div className="text-sm font-medium">Ish joyi (header)</div>
                                <Input {...register("orgLine1")} placeholder="Tashkilot nomi" />
                                {errors.orgLine1 && <p className="text-xs text-red-600">{errors.orgLine1.message}</p>}
                                <Input {...register("orgLine2")} placeholder="Lavozim (bo'lim)" />
                                {errors.orgLine2 && <p className="text-xs text-red-600">{errors.orgLine2.message}</p>}
                            </div>

                            <Separator />

                            <CollapsibleSection title="Asosiy ma'lumotlar">
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
                            </CollapsibleSection>

                            <Separator />

                            <CollapsibleSection title="Mehnat faoliyati" badge={workItemsFA.fields.length}>
                                <div className="space-y-3">
                                    {workItemsFA.fields.map((f, idx) => (
                                        <div key={f.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm font-semibold">
                                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                                    Ish joyi #{idx + 1}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => workItemsFA.remove(idx)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <Field label="Boshlagan yili" error={errors.workItems?.[idx]?.startYear?.message}>
                                                    <Input {...register(`workItems.${idx}.startYear`)} placeholder="2020" />
                                                </Field>
                                                <Field label="Tugagan yili" error={errors.workItems?.[idx]?.endYear?.message}>
                                                    <Input {...register(`workItems.${idx}.endYear`)} placeholder="hozirgacha" />
                                                </Field>
                                                <div className="sm:col-span-2">
                                                    <Field label="Tashkilot nomi" error={errors.workItems?.[idx]?.organization?.message}>
                                                        <Input {...register(`workItems.${idx}.organization`)} placeholder="Tashkilot nomi" />
                                                    </Field>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <Field label="Lavozim" error={errors.workItems?.[idx]?.position?.message}>
                                                        <Input {...register(`workItems.${idx}.position`)} placeholder="Lavozim" />
                                                    </Field>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <Field label="Bo'lim (ixtiyoriy)">
                                                        <Input {...register(`workItems.${idx}.department`)} placeholder="Bo'lim yoki sektor" />
                                                    </Field>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-xl gap-2"
                                        onClick={() =>
                                            workItemsFA.append({
                                                startYear: "",
                                                endYear: "hozirgacha",
                                                organization: "",
                                                position: "",
                                                department: "",
                                            })
                                        }
                                    >
                                        <Plus className="h-4 w-4" />
                                        Ish joyi qo&apos;shish
                                    </Button>
                                </div>
                            </CollapsibleSection>

                            <Separator />

                            <CollapsibleSection title="Yaqin qarindoshlari" badge={relativesFA.fields.length}>
                                <div className="space-y-3">
                                    {relativesFA.fields.map((f, idx) => (
                                        <div key={f.id} className="rounded-2xl border p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-semibold">Qarindosh #{idx + 1}</div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => relativesFA.remove(idx)}
                                                    disabled={relativesFA.fields.length <= 1}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
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

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-xl gap-2"
                                        onClick={() => relativesFA.append({ relation: "", fio: "", birth: "", job: "", address: "" })}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Qarindosh qo&apos;shish
                                    </Button>

                                    {!isValid && (
                                        <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-900">
                                            Ba&apos;zi majburiy maydonlar to&apos;ldirilmagan.
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        </CardContent>
                    </Card>

                    <div className="print:col-span-2">
                        <div className="rounded-2xl border bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none overflow-x-auto">
                            <PdfDocument v={v} fullName={fullName} avatarUrl={data.avatarUrl} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}