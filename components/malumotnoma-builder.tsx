"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Printer, Loader2 } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import html2pdf from "html2pdf.js";
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

const RelativeSchema = z.object({
    relation: z.string().min(2, "Qarindoshligi majburiy"),
    fio: z.string().min(5, "F.I.Sh majburiy"),
    birth: z.string().min(4, "Tug‘ilgan yili/joyi majburiy"),
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

function safeImg(src?: string | null) {
    const s = String(src ?? "").trim();
    return s ? s : "/assets/avatar.png";
}

function isOpenEndDate(v?: string | null) {
    const s = String(v ?? "").trim();
    return !s || s === "-" || s.toLowerCase() === "hozirgacha" || s.toLowerCase() === "present";
}

function parseDDMMYYYY(s?: string | null) {
    const t = String(s ?? "").trim();
    const m = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!yyyy || !mm || !dd) return null;
    return Date.UTC(yyyy, mm - 1, dd);
}

function getYearFromDDMMYYYY(s?: string | null) {
    const t = String(s ?? "").trim();
    const m = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return m ? m[3] : "";
}

function pickMainWork(workList: WorkItem[]) {
    if (!Array.isArray(workList) || workList.length === 0) return null;

    const current = workList.find((w) => isOpenEndDate(w?.endDate));
    if (current) return current;

    const sorted = [...workList].sort((a, b) => {
        const ta = parseDDMMYYYY(a?.startDate) ?? 0;
        const tb = parseDDMMYYYY(b?.startDate) ?? 0;
        return tb - ta;
    });
    return sorted[0] ?? null;
}

function workRangeLabel(w: WorkItem) {
    const fromY = getYearFromDDMMYYYY(w.startDate);
    const toOpen = isOpenEndDate(w.endDate);
    const toY = toOpen ? "hozirgacha" : getYearFromDDMMYYYY(w.endDate);
    return `${fromY || "—"} yy – ${toY || "—"}`;
}

function mergeDefaults(defaults: MalumotnomaForm, saved?: Partial<MalumotnomaForm> | null) {
    if (!saved) return defaults;

    return {
        ...defaults,
        ...saved,
        relatives:
            Array.isArray(saved.relatives) && saved.relatives.length
                ? saved.relatives
                : defaults.relatives,
    } as MalumotnomaForm;
}

function extractErrMsg(e: any) {
    return (
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Serverda xatolik"
    );
}

function MalumotnomaSkeleton() {
    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
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

export function MalumotnomaBuilder({ data, onBack }: Props) {
    const pinfl = data?.passport?.pinfl || "";
    const fullName = data?.passport?.fullName || "—";

    const birthDate = data?.passport?.birthDate || "";
    const birthYearGuess = birthDate?.split(".")?.[2] || "";

    const edu0 = data?.education?.[0];
    const workLists = Array.isArray(data?.work) ? data.work : [];
    const mainWork = pickMainWork(workLists);

    const defaultOrg1 = mainWork?.organization?.trim?.() ? mainWork.organization : "";
    const defaultOrg2 = [
        mainWork?.position || "",
        mainWork?.department && mainWork.department !== "-" ? `(${mainWork.department})` : "",
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    const defaultValues: MalumotnomaForm = React.useMemo(
        () => ({
            orgLine1: defaultOrg1,
            orgLine2: defaultOrg2,

            birthYear: birthYearGuess || "",
            birthPlace: "",
            nationality: "o‘zbek",
            party: "yo‘q",
            education: edu0?.institution || "—",
            specialty: edu0?.specialty || "—",
            degree: "yo‘q",
            title: "yo‘q",
            languages: "",
            awards: "yo‘q",
            deputy: "yo‘q",

            relatives: [{ relation: "Otasi", fio: "", birth: "", job: "", address: "" }],
        }),
        [defaultOrg1, defaultOrg2, birthYearGuess, edu0?.institution, edu0?.specialty]
    );

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

    React.useEffect(() => {
        const run = async () => {
            if (!pinfl) {
                setPageError("PINFL topilmadi. Qayta login qiling.");
                setLoadingSaved(false);
                return;
            }

            try {
                setLoadingSaved(true);
                setPageError(null);

                const res = await axiosClient.get("/user/malumotnoma/get", {
                    params: { pinfl },
                });

                if (res.data?.success && res.data?.data?.payload) {
                    const savedPayload = res.data.data.payload as Partial<MalumotnomaForm>;
                    const merged = mergeDefaults(defaultValues, savedPayload);
                    reset(merged);
                } else {

                    reset(defaultValues);
                }
            } catch (e) {
                setPageError(extractErrMsg(e));
            } finally {
                setLoadingSaved(false);
            }
        };

        run();
    }, [pinfl, defaultValues, reset]);
    const pdfRef = React.useRef<HTMLDivElement>(null);

    const exportPDF = () => {
        if (!pdfRef.current) return;

        const element = pdfRef.current;

        const opt = {
            margin: [15, 15, 15, 15] as [number, number, number, number],
            filename: `obyektivka-${fullName}.pdf`,
            image: { type: "jpeg" as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                scrollY: 0,
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait" as const,
            },
            pagebreak: { mode: ["avoid-all"] },
        };

        html2pdf().set(opt).from(element).save();
    };
    const onSave = async (values: MalumotnomaForm) => {
        try {
            setPageError(null);
            setSaveOkAt(null);

            const payload = {
                pinfl: data.passport.pinfl,
                fullName: data.passport.fullName,
                passportSeriesNumber: data.passport.passportSeriesNumber,
                payload: values,
            };

            const res = await axiosClient.post("/user/malumotnoma/upsert", payload);

            if (!res.data?.success) {
                throw new Error(res.data?.error || res.data?.message || "Saqlashda xatolik");
            }

            setSaveOkAt(new Date().toLocaleString());

            showToast("Ma'lumotnoma muvaffaqiyatli saqlandi", ToastType.Success);
        } catch (e: any) {
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

    const workList = Array.isArray(data?.work) ? data.work : [];

    return (
        <div className="p-4">

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div>
                    <div className="text-lg font-semibold">Ma’lumotnoma (Obyektivka)</div>

                    {saveOkAt && (
                        <div className="mt-1 text-xs text-emerald-600">
                            Saqlandi: {saveOkAt}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
                        Ortga
                    </Button>

                    <Button
                        onClick={handleSubmit(onSave)}
                        disabled={!isValid || isSubmitting}
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

                <Card className="rounded-2xl print:hidden">
                    <CardHeader className="pb-3">
                        <div className="text-sm font-semibold">Ma’lumotlarni to‘ldirish</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Majburiy maydonlar to‘ldirilmasa “Saqlash” o‘chiriladi.
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">

                        <div className="grid gap-3">
                            <div className="text-sm font-medium">Ish joyi (header)</div>
                            <div className="grid gap-2">
                                <Input {...register("orgLine1")} placeholder="Tashkilot nomi" />
                                {errors.orgLine1 && (
                                    <p className="text-xs text-red-600">{errors.orgLine1.message}</p>
                                )}
                                <Input {...register("orgLine2")} placeholder="Lavozim (bo‘lim)" />
                                {errors.orgLine2 && (
                                    <p className="text-xs text-red-600">{errors.orgLine2.message}</p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3">
                            <div className="text-sm font-medium">Asosiy ma’lumotlar</div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field
                                    label="Tug‘ilgan yili"
                                    error={errors.birthYear?.message}
                                >
                                    <Input {...register("birthYear")} placeholder="YYYY" />
                                </Field>

                                <Field
                                    label="Tug‘ilgan joyi"
                                    error={errors.birthPlace?.message}
                                >
                                    <Input {...register("birthPlace")} placeholder="Viloyat / tuman / shahar" />
                                </Field>

                                <Field
                                    label="Millati"
                                    error={errors.nationality?.message}
                                >
                                    <Input {...register("nationality")} placeholder="Millati" />
                                </Field>

                                <Field label="Partiyaviyligi" error={errors.party?.message}>
                                    <Input {...register("party")} placeholder="yo‘q / ..." />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field label="Tamomlagan (OTM)" error={errors.education?.message}>
                                        <Input {...register("education")} placeholder="OTM nomi" />
                                    </Field>
                                </div>

                                <div className="sm:col-span-2">
                                    <Field label="Mutaxassisligi" error={errors.specialty?.message}>
                                        <Input {...register("specialty")} placeholder="Mutaxassisligi" />
                                    </Field>
                                </div>

                                <Field label="Ilmiy darajasi" error={errors.degree?.message}>
                                    <Input {...register("degree")} placeholder="yo‘q / ..." />
                                </Field>

                                <Field label="Ilmiy unvoni" error={errors.title?.message}>
                                    <Input {...register("title")} placeholder="yo‘q / ..." />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field label="Qaysi chet tillarini biladi" error={errors.languages?.message}>
                                        <Input {...register("languages")} placeholder="Ingliz, Rus, ..." />
                                    </Field>
                                </div>

                                <div className="sm:col-span-2">
                                    <Field label="Davlat mukofotlari" error={errors.awards?.message}>
                                        <Input {...register("awards")} placeholder="yo‘q / ..." />
                                    </Field>
                                </div>

                                <div className="sm:col-span-2">
                                    <Field label="Deputatligi / boshqa saylanadigan organ" error={errors.deputy?.message}>
                                        <Input {...register("deputy")} placeholder="yo‘q / ..." />
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
                                    onClick={() =>
                                        relativesFA.append({
                                            relation: "",
                                            fio: "",
                                            birth: "",
                                            job: "",
                                            address: "",
                                        })
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Qo‘shish
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {relativesFA.fields.map((f, idx) => (
                                    <div key={f.id} className="rounded-2xl border p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-sm font-semibold">Qarindosh #{idx + 1}</div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="rounded-xl"
                                                onClick={() => relativesFA.remove(idx)}
                                                disabled={relativesFA.fields.length <= 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field
                                                label="Qarindoshligi"
                                                error={errors.relatives?.[idx]?.relation?.message as any}
                                            >
                                                <Input
                                                    {...register(`relatives.${idx}.relation` as const)}
                                                    placeholder="Otasi / Onasi / ..."
                                                />
                                            </Field>

                                            <Field
                                                label="F.I.Sh"
                                                error={errors.relatives?.[idx]?.fio?.message as any}
                                            >
                                                <Input
                                                    {...register(`relatives.${idx}.fio` as const)}
                                                    placeholder="Familiyasi Ismi Otasining ismi"
                                                />
                                            </Field>

                                            <div className="sm:col-span-2">
                                                <Field
                                                    label="Tug‘ilgan yili va joyi"
                                                    error={errors.relatives?.[idx]?.birth?.message as any}
                                                >
                                                    <Input
                                                        {...register(`relatives.${idx}.birth` as const)}
                                                        placeholder="YYYY, joyi"
                                                    />
                                                </Field>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <Field
                                                    label="Ish joyi va lavozimi"
                                                    error={errors.relatives?.[idx]?.job?.message as any}
                                                >
                                                    <Input
                                                        {...register(`relatives.${idx}.job` as const)}
                                                        placeholder="Tashkilot, lavozim"
                                                    />
                                                </Field>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <Field
                                                    label="Turar joyi"
                                                    error={errors.relatives?.[idx]?.address?.message as any}
                                                >
                                                    <Input
                                                        {...register(`relatives.${idx}.address` as const)}
                                                        placeholder="Manzil"
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isValid && (
                                <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-900">
                                    Eslatma: Ba’zi majburiy maydonlar to‘ldirilmagan.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="print:col-span-2">
                    <div ref={pdfRef} className="rounded-2xl border bg-white p-10 shadow-sm print:border-0 print:shadow-none">

                        <div className="text-center">
                            <div className="text-[18px] font-bold tracking-widest">MA’LUMOTNOMA</div>

                            <div className="mt-2 text-[16px] font-semibold uppercase">
                                {fullName}
                            </div>

                            <div className="mt-3 text-[13px] leading-6">
                                {v.orgLine1}
                                <br />
                                {v.orgLine2}
                            </div>
                        </div>


                        <div className="mt-5 grid grid-cols-[1fr_120px] gap-4">
                            <div className="text-sm">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    <KV label="Tug‘ilgan yili" value={v.birthYear || "—"} />
                                    <KV label="Tug‘ilgan joyi" value={v.birthPlace || "—"} />
                                    <KV label="Millati" value={v.nationality || "—"} />
                                    <KV label="Partiyaviyligi" value={v.party || "—"} />
                                    <KV label="Ma’lumoti" value={v.education || "—"} />
                                    <KV label="Mutaxassisligi" value={v.specialty || "—"} />
                                    <KV label="Ilmiy darajasi" value={v.degree || "—"} />
                                    <KV label="Ilmiy unvoni" value={v.title || "—"} />

                                    <div className="col-span-2">
                                        <div className="font-semibold">Qaysi chet tillarini biladi:</div>
                                        <div>{v.languages || "—"}</div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="font-semibold">Davlat mukofotlari bilan taqdirlanganmi (qanaqa):</div>
                                        <div>{v.awards || "—"}</div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="font-semibold">
                                            Xalq deputatlari respublika/viloyat/shahar/tuman Kengashi deputatimi yoki boshqa saylanadigan organ:
                                        </div>
                                        <div>{v.deputy || "—"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Photo */}
                            <div className="flex justify-end">
                                <div className="h-[140px] w-[110px] overflow-hidden rounded-lg border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={safeImg(data.avatarUrl)}
                                        alt="photo"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Work */}
                        <div className="mt-6">
                            <div className="text-center text-sm font-semibold">MEHNAT FAOLIYATI</div>
                            <div className="mt-3 space-y-2 text-sm">
                                {workList.length ? (
                                    workList.map((w) => (
                                        <div key={String(w.id)} className="grid grid-cols-[160px_1fr] gap-3">
                                            <div className="text-muted-foreground">{workRangeLabel(w)}</div>
                                            <div>
                                                <span className="font-medium">{w.organization}</span>
                                                {w.position && <span> — {w.position}</span>}
                                                {w.department && w.department !== "-" && (
                                                    <span className="text-muted-foreground"> ({w.department})</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-muted-foreground">Mehnat faoliyati topilmadi</div>
                                )}
                            </div>
                        </div>

                        {/* Relatives */}
                        <div className="mt-8">
                            <div className="text-center text-sm font-semibold">
                                {fullName} yaqin qarindoshlari haqida MA’LUMOT
                            </div>

                            <div className="mt-3 overflow-hidden rounded-lg border">
                                <table className="w-full border-collapse text-[13px]">
                                    <thead className="bg-muted/40">
                                        <tr>
                                            <th className="w-[110px] border-r px-2 py-2 text-left">Qarindoshligi</th>
                                            <th className="border-r px-2 py-2 text-left">Familiyasi, ismi va otasining ismi</th>
                                            <th className="w-[180px] border-r px-2 py-2 text-left">Tug‘ilgan yili va joyi</th>
                                            <th className="border-r px-2 py-2 text-left">Ish joyi va lavozimi</th>
                                            <th className="w-[160px] px-2 py-2 text-left">Turar joyi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(v.relatives || []).map((r, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="border-r px-2 py-2 align-top">{r.relation || "—"}</td>
                                                <td className="border-r px-2 py-2 align-top">{r.fio || "—"}</td>
                                                <td className="border-r px-2 py-2 align-top">{r.birth || "—"}</td>
                                                <td className="border-r px-2 py-2 align-top">{r.job || "—"}</td>
                                                <td className="px-2 py-2 align-top">{r.address || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {!isValid && (
                                <div className="mt-3 rounded-xl border bg-amber-50 p-3 text-xs text-amber-900 print:hidden">
                                    Eslatma: Ba’zi majburiy maydonlar to‘ldirilmagan. Chap tomonda xatoliklarni to‘g‘rilang.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* print style */}
            <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
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

function KV({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="font-semibold">{label}:</div>
            <div>{value}</div>
        </div>
    );
}
