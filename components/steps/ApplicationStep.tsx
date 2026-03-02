"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMask } from "@react-input/mask";
import { Upload, X, Loader2, FileText, ExternalLink, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from "@/components/ui/file-upload";

import { cn } from "@/lib/utils";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type Admission = {
    _id: string;
    choices: { id: string; name: string }[];
};

const PHONE_MASK = "+998 (__) ___-__-__";
const MAX_PDF = 2 * 1024 * 1024;

function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
}

function isUzPhoneFull(v: string) {
    return onlyDigits(v).length === 12;
}

const applicationSchema = z
    .object({
        phone: z.string().min(1, "Telefon raqamni kiriting").refine(isUzPhoneFull, "Telefon raqam to'liq emas"),
        phoneExtra: z.string().min(1, "Qo'shimcha telefon raqamni kiriting").refine(isUzPhoneFull, "Qo'shimcha telefon to'liq emas"),
        email: z.string().min(1, "Email kiriting").email("Email noto'g'ri"),
        educationDirection: z.string().min(1, "Ta'lim yo'nalishini tanlang"),
        hasCertificate: z.enum(["yes", "no"]),
        examLanguage: z.enum(["en", "de", "fr"]).optional(),
        certificateFile: z.any().optional(),
        certificatePath: z.string().optional(),
    })
    .superRefine((val, ctx) => {
        if (onlyDigits(val.phone) === onlyDigits(val.phoneExtra)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Qo'shimcha telefon asosiy telefondan farq qilishi kerak",
                path: ["phoneExtra"],
            });
        }

        if (val.hasCertificate === "yes") {
            if (!val.certificatePath) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Sertifikat PDF faylini yuklang",
                    path: ["certificateFile"],
                });
            }
        } else {
            if (!val.examLanguage) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Chet tili imtihoni tilini tanlang",
                    path: ["examLanguage"],
                });
            }
        }
    });

export type ApplicationData = z.infer<typeof applicationSchema>;

type Props = {
    admission: Admission;
    defaultValues?: Partial<ApplicationData>;
    onNext: (data: ApplicationData) => void;
    candidateChoice?: string | null;
};

function fileNameFromPath(p?: string) {
    if (!p) return "";
    try {
        const s = p.split("?")[0] || p;
        return decodeURIComponent(s.split("/").pop() || "");
    } catch {
        return String(p);
    }
}

export function ApplicationStep({ admission, defaultValues, onNext, candidateChoice }: Props) {
    const phoneMaskRef = useMask({ mask: PHONE_MASK, replacement: { _: /\d/ } });
    const phoneExtraMaskRef = useMask({ mask: PHONE_MASK, replacement: { _: /\d/ } });

    const form = useForm<ApplicationData>({
        resolver: zodResolver(applicationSchema),
        mode: "onSubmit",
        defaultValues: {
            phone: defaultValues?.phone ?? "",
            phoneExtra: defaultValues?.phoneExtra ?? "",
            email: defaultValues?.email ?? "",
            educationDirection: candidateChoice ?? defaultValues?.educationDirection ?? "",
            hasCertificate: (defaultValues?.hasCertificate as any) ?? "no",
            examLanguage: defaultValues?.examLanguage ?? "en",
            certificateFile: undefined,
            certificatePath: defaultValues?.certificatePath,
        },
    });

    const phoneReg = form.register("phone");
    const phoneExtraReg = form.register("phoneExtra");

    const mergeRefs = React.useCallback(
        (...refs: any[]) =>
            (el: HTMLInputElement | null) => {
                refs.forEach((ref) => {
                    if (typeof ref === "function") ref(el);
                    else if (ref && typeof ref === "object") ref.current = el;
                });
            },
        []
    );

    const hasCertificate = form.watch("hasCertificate");
    const certificatePath = form.watch("certificatePath");

    const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
    const [uploading, setUploading] = React.useState(false);

    const onFileReject = React.useCallback((_file: File, message: string) => {
        showToast(message, ToastType.Error);
    }, []);

    const didInitRef = React.useRef(false);

    React.useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        if (defaultValues?.certificatePath && (defaultValues?.hasCertificate as any) === "yes") {
            form.setValue("hasCertificate", "yes", { shouldValidate: false });
            form.setValue("certificatePath", defaultValues.certificatePath, { shouldValidate: false });
            form.clearErrors(["certificateFile", "certificatePath"]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (!candidateChoice) return;
        form.setValue("educationDirection", candidateChoice, { shouldValidate: true });
        form.clearErrors("educationDirection");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidateChoice]);

    React.useEffect(() => {
        if (hasCertificate === "yes") {
            form.setValue("examLanguage", undefined, { shouldValidate: true });
            if (certificatePath) {
                form.clearErrors(["certificateFile", "certificatePath"]);
            }
            return;
        }

        if (uploadedFiles.length) setUploadedFiles([]);
        form.setValue("certificateFile", undefined, { shouldValidate: true });
        form.setValue("certificatePath", undefined, { shouldValidate: true });

        if (!form.getValues("examLanguage")) {
            form.setValue("examLanguage", "en", { shouldValidate: true });
        }

        form.clearErrors(["certificateFile", "certificatePath"]);
        form.trigger(["certificateFile", "certificatePath", "examLanguage"]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasCertificate]);

    React.useEffect(() => {
        const file = uploadedFiles?.[0];
        if (hasCertificate !== "yes" || !file) return;

        if (file.type !== "application/pdf") {
            showToast("Faqat PDF fayl qabul qilinadi", ToastType.Error);
            setUploadedFiles([]);
            return;
        }
        if (file.size > MAX_PDF) {
            showToast("Fayl hajmi 2MB dan oshmasligi kerak", ToastType.Error);
            setUploadedFiles([]);
            return;
        }

        let cancelled = false;

        const run = async () => {
            try {
                setUploading(true);
                form.setValue("certificateFile", file, { shouldValidate: false });
                form.clearErrors(["certificateFile", "certificatePath"]);

                const fd = new FormData();
                fd.append("file", file);
                fd.append("admission_id", admission._id);

                const res = await axiosClient.post("/user/application/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                });

                if (cancelled) return;

                const p = res.data?.data?.path as string | undefined;
                if (!p) throw new Error("upload path missing");

                form.setValue("certificatePath", p, { shouldValidate: true });
                form.clearErrors(["certificateFile", "certificatePath"]);
                await form.trigger(["certificateFile", "certificatePath"]);

                showToast("Sertifikat yuklandi", ToastType.Success);
            } catch (e) {
                console.error(e);
                if (cancelled) return;
                showToast("Fayl yuklashda xatolik. Qayta urinib ko'ring.", ToastType.Error);
                setUploadedFiles([]);
                form.setValue("certificatePath", undefined, { shouldValidate: true });
                form.setError("certificateFile", { type: "custom", message: "Sertifikat PDF faylini yuklang" });
            } finally {
                if (!cancelled) setUploading(false);
            }
        };

        run();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploadedFiles?.[0], hasCertificate, admission._id]);

    const submit = form.handleSubmit(async (values) => {
        if (uploading) {
            showToast("Fayl yuklanmoqda. Iltimos kuting...", ToastType.Warning);
            return;
        }
        if (values.hasCertificate === "yes" && values.certificatePath) {
            form.clearErrors(["certificateFile", "certificatePath"]);
        }
        onNext(values);
    });

    const lockedChoiceName = candidateChoice
        ? admission.choices?.find((c) => c.id === candidateChoice)?.name
        : null;

    return (
        <form className="mt-5 space-y-6" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="phone">
                        Telefon raqami <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="phone"
                        autoComplete="off"
                        placeholder="+998 (90) 123-45-67"
                        className={cn(form.formState.errors.phone && "border-destructive focus-visible:ring-destructive")}
                        {...phoneReg}
                        ref={mergeRefs(phoneMaskRef, phoneReg.ref)}
                    />
                    {form.formState.errors.phone?.message && (
                        <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phoneExtra">
                        Qo'shimcha aloqa raqami <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="phoneExtra"
                        autoComplete="off"
                        placeholder="+998 (90) 123-45-67"
                        className={cn(form.formState.errors.phoneExtra && "border-destructive focus-visible:ring-destructive")}
                        {...phoneExtraReg}
                        ref={mergeRefs(phoneExtraMaskRef, phoneExtraReg.ref)}
                    />
                    {form.formState.errors.phoneExtra?.message && (
                        <p className="text-xs text-destructive">{form.formState.errors.phoneExtra.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">
                        Email manzil <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className={cn(form.formState.errors.email && "border-destructive focus-visible:ring-destructive")}
                        {...form.register("email")}
                    />
                    {form.formState.errors.email?.message && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="educationDirection">
                        Ta'lim yo'nalishi <span className="text-destructive">*</span>
                    </Label>

                    {candidateChoice ? (
                        <>
                            <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground">
                                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate">
                                    {lockedChoiceName ?? candidateChoice}
                                </span>
                                <input type="hidden" {...form.register("educationDirection")} />
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="size-3 shrink-0" />
                                Yo'nalish sizning ariza raqamingizga bog'liq va o'zgartirib bo'lmaydi
                            </p>
                        </>
                    ) : (
                        <select
                            id="educationDirection"
                            className={cn(
                                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                form.formState.errors.educationDirection && "border-destructive focus-visible:ring-destructive"
                            )}
                            {...form.register("educationDirection")}
                        >
                            <option value="">Tanlang…</option>
                            {admission.choices?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {form.formState.errors.educationDirection?.message && (
                        <p className="text-xs text-destructive">{form.formState.errors.educationDirection.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-card p-6">
                <div className="space-y-3">
                    <Label className="text-base">
                        Til bilish sertifikatingiz bormi? <span className="text-destructive">*</span>
                    </Label>

                    <div className="flex flex-wrap gap-3">
                        <label
                            className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all",
                                "hover:bg-accent hover:border-accent-foreground/20",
                                hasCertificate === "yes" && "border-primary bg-primary/5 font-medium"
                            )}
                        >
                            <input type="radio" value="yes" className="h-4 w-4 accent-primary" {...form.register("hasCertificate")} />
                            Ha, bor
                        </label>

                        <label
                            className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all",
                                "hover:bg-accent hover:border-accent-foreground/20",
                                hasCertificate === "no" && "border-primary bg-primary/5 font-medium"
                            )}
                        >
                            <input type="radio" value="no" className="h-4 w-4 accent-primary" {...form.register("hasCertificate")} />
                            Yo'q
                        </label>
                    </div>
                </div>

                {hasCertificate === "yes" ? (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label>
                                Sertifikat fayli (PDF) <span className="text-destructive">*</span>
                            </Label>
                            {uploading ? (
                                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
                                </span>
                            ) : certificatePath ? (
                                <span className="text-xs text-green-600 font-medium">✓ Yuklangan</span>
                            ) : null}
                        </div>

                        {certificatePath ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-10 w-10 place-items-center rounded-lg border bg-background">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="leading-tight">
                                        <p className="text-sm font-medium">{fileNameFromPath(certificatePath) || "Yuklangan fayl"}</p>
                                        <p className="text-xs text-muted-foreground">Sertifikat yuklangan</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={certificatePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
                                    >
                                        Ko'rish <ExternalLink className="h-4 w-4" />
                                    </a>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg"
                                        disabled={uploading}
                                        onClick={() => {
                                            setUploadedFiles([]);
                                            form.setValue("certificateFile", undefined, { shouldValidate: true });
                                            form.setValue("certificatePath", undefined, { shouldValidate: true });
                                            form.trigger(["certificateFile", "certificatePath"]);
                                        }}
                                    >
                                        Qayta yuklash
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <FileUpload
                                key={hasCertificate}
                                maxFiles={1}
                                maxSize={MAX_PDF}
                                accept="application/pdf"
                                value={uploadedFiles}
                                onValueChange={setUploadedFiles}
                                onFileReject={onFileReject}
                            >
                                <FileUploadDropzone className={cn(form.formState.errors.certificateFile && "border-destructive")}>
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <div className="flex items-center justify-center rounded-full border p-3">
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">PDF faylni bu yerga tashlang</p>
                                            <p className="text-xs text-muted-foreground">yoki tanlash uchun bosing (maks. 2MB)</p>
                                        </div>
                                        <FileUploadTrigger asChild>
                                            <Button type="button" variant="outline" size="sm" className="mt-1" disabled={uploading}>
                                                Fayl tanlash
                                            </Button>
                                        </FileUploadTrigger>
                                    </div>
                                </FileUploadDropzone>

                                <FileUploadList>
                                    {uploadedFiles.map((file, index) => (
                                        <FileUploadItem key={index} value={file} className="rounded-lg">
                                            <FileUploadItemPreview />
                                            <FileUploadItemMetadata />
                                            <FileUploadItemDelete asChild>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={uploading}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </FileUploadItemDelete>
                                        </FileUploadItem>
                                    ))}
                                </FileUploadList>
                            </FileUpload>
                        )}

                        {form.formState.errors.certificateFile?.message && (
                            <p className="text-xs text-destructive">{String(form.formState.errors.certificateFile.message)}</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 pt-2">
                        <Label htmlFor="examLanguage">
                            Chet tili imtihonini topshirish tili <span className="text-destructive">*</span>
                        </Label>
                        <select
                            id="examLanguage"
                            className={cn(
                                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                form.formState.errors.examLanguage && "border-destructive focus-visible:ring-destructive"
                            )}
                            {...form.register("examLanguage")}
                        >
                            <option value="en">Ingliz tili</option>
                            <option value="de">Nemis tili</option>
                            <option value="fr">Fransuz tili</option>
                        </select>
                        {form.formState.errors.examLanguage?.message && (
                            <p className="text-xs text-destructive">{String(form.formState.errors.examLanguage.message)}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button type="submit" size="lg" className="rounded-lg px-8" disabled={uploading}>
                    Keyingi
                </Button>
            </div>
        </form>
    );
}