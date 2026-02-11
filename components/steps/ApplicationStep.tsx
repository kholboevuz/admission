"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMask } from "@react-input/mask";
import { Upload, X } from "lucide-react";
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
import { showToast, ToastType } from "@/utils/toast-utils";

type Props = {
    defaultValues?: Partial<ApplicationData>;
    onNext: (data: ApplicationData) => void;
};

const PHONE_MASK = "+998 (__) ___-__-__";

function normalizePhone(v: string) {
    return v.replace(/\D/g, "");
}

const applicationSchema = z
    .object({
        phone: z
            .string()
            .min(1, "Telefon raqamni kiriting")
            .refine((v) => normalizePhone(v).length === 12, "Telefon raqam to'liq emas"),
        phoneExtra: z
            .string()
            .min(1, "Qo'shimcha telefon raqamni kiriting")
            .refine((v) => normalizePhone(v).length === 12, "Qo'shimcha telefon to'liq emas"),
        email: z.string().min(1, "Email kiriting").email("Email noto'g'ri"),
        educationDirection: z.string().min(1, "Ta'lim yo'nalishini tanlang"),

        hasCertificate: z.enum(["yes", "no"]),
        certificateFile: z.any().optional(),
        examLanguage: z.enum(["en", "de", "fr"]).optional(),
    })
    .superRefine((val, ctx) => {
        // Ikki telefon bir xil bo'lmasligi kerak
        if (normalizePhone(val.phone) === normalizePhone(val.phoneExtra)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Qo'shimcha telefon asosiy telefondan farq qilishi kerak",
                path: ["phoneExtra"],
            });
        }

        if (val.hasCertificate === "yes") {
            if (!val.certificateFile || !(val.certificateFile instanceof File)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Sertifikat PDF faylini yuklang",
                    path: ["certificateFile"],
                });
                return;
            }

            const file = val.certificateFile as File;
            if (file.type !== "application/pdf") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Faqat PDF fayl qabul qilinadi",
                    path: ["certificateFile"],
                });
            }
            const maxSize = 2 * 1024 * 1024;
            if (file.size > maxSize) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Fayl hajmi 2MB dan oshmasligi kerak",
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

const DIRECTIONS = [
    { value: "management", label: "Davlat boshqaruvi" },
    { value: "digital", label: "Raqamli transformatsiya" },
    { value: "ai", label: "Sun'iy intellekt" },
];

export function ApplicationStep({ defaultValues, onNext }: Props) {
    const phoneMaskRef = useMask({
        mask: PHONE_MASK,
        replacement: { _: /\d/ },
    });

    const phoneExtraMaskRef = useMask({
        mask: PHONE_MASK,
        replacement: { _: /\d/ },
    });

    const form = useForm<ApplicationData>({
        resolver: zodResolver(applicationSchema),
        mode: "onSubmit",
        defaultValues: {
            phone: defaultValues?.phone || "",
            phoneExtra: defaultValues?.phoneExtra || "",
            email: defaultValues?.email || "",
            educationDirection: defaultValues?.educationDirection || "",
            hasCertificate: (defaultValues?.hasCertificate as any) || "no",
            examLanguage: defaultValues?.examLanguage || "en",
            certificateFile: defaultValues?.certificateFile,
        },
    });

    // Mask va React Hook Form ref-larini birlashtirish
    const mergeRefs = React.useCallback(
        (...refs: any[]) => {
            return (element: HTMLInputElement | null) => {
                refs.forEach((ref) => {
                    if (typeof ref === "function") {
                        ref(element);
                    } else if (ref && typeof ref === "object") {
                        ref.current = element;
                    }
                });
            };
        },
        []
    );

    const hasCertificate = form.watch("hasCertificate");
    const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);

    React.useEffect(() => {
        if (uploadedFiles.length > 0) {
            form.setValue("certificateFile", uploadedFiles[0], { shouldValidate: true });
        } else {
            form.setValue("certificateFile", undefined, { shouldValidate: true });
        }
    }, [uploadedFiles, form]);

    const onFileReject = React.useCallback((file: File, message: string) => {
        showToast(message, ToastType.Error);
    }, []);

    return (
        <form
            className="mt-5 space-y-6"
            onSubmit={form.handleSubmit((values) => onNext(values))}
        >
            <div className="grid gap-4 md:grid-cols-2">
                {/* Telefon raqami */}
                <div className="space-y-2">
                    <Label htmlFor="phone">
                        Telefon raqami <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="phone"
                        autoComplete="off"
                        placeholder="+998 (90) 123-45-67"
                        className={cn(
                            form.formState.errors.phone && "border-destructive focus-visible:ring-destructive"
                        )}
                        {...form.register("phone")}
                        ref={mergeRefs(phoneMaskRef, form.register("phone").ref)}
                    />
                    {form.formState.errors.phone?.message && (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.phone.message}
                        </p>
                    )}
                </div>

                {/* Qo'shimcha telefon */}
                <div className="space-y-2">
                    <Label htmlFor="phoneExtra">
                        Qo'shimcha aloqa raqami <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="phoneExtra"
                        placeholder="+998 (90) 123-45-67"
                        autoComplete="off"
                        className={cn(
                            form.formState.errors.phoneExtra &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        {...form.register("phoneExtra")}
                        ref={mergeRefs(phoneExtraMaskRef, form.register("phoneExtra").ref)}
                    />
                    {form.formState.errors.phoneExtra?.message && (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.phoneExtra.message}
                        </p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">
                        Email manzil <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className={cn(
                            form.formState.errors.email && "border-destructive focus-visible:ring-destructive"
                        )}
                        {...form.register("email")}
                    />
                    {form.formState.errors.email?.message && (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.email.message}
                        </p>
                    )}
                </div>

                {/* Ta'lim yo'nalishi */}
                <div className="space-y-2">
                    <Label htmlFor="educationDirection">
                        Ta'lim yo'nalishi <span className="text-destructive">*</span>
                    </Label>
                    <select
                        id="educationDirection"
                        className={cn(
                            "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            form.formState.errors.educationDirection &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        {...form.register("educationDirection")}
                    >
                        <option value="">Tanlang…</option>
                        {DIRECTIONS.map((d) => (
                            <option key={d.value} value={d.value}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                    {form.formState.errors.educationDirection?.message && (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.educationDirection.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Sertifikat bo'limi */}
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
                                hasCertificate === "yes" &&
                                "border-primary bg-primary/5 font-medium"
                            )}
                        >
                            <input
                                type="radio"
                                value="yes"
                                className="h-4 w-4 accent-primary"
                                {...form.register("hasCertificate")}
                            />
                            Ha, bor
                        </label>

                        <label
                            className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all",
                                "hover:bg-accent hover:border-accent-foreground/20",
                                hasCertificate === "no" &&
                                "border-primary bg-primary/5 font-medium"
                            )}
                        >
                            <input
                                type="radio"
                                value="no"
                                className="h-4 w-4 accent-primary"
                                {...form.register("hasCertificate")}
                            />
                            Yo'q
                        </label>
                    </div>
                </div>

                {/* Agar sertifikat bor bo'lsa - File Upload */}
                {hasCertificate === "yes" && (
                    <div className="space-y-3 pt-2">
                        <Label>
                            Sertifikat fayli <span className="text-destructive">*</span>
                        </Label>
                        <FileUpload
                            maxFiles={1}
                            maxSize={2 * 1024 * 1024}
                            accept="application/pdf"
                            value={uploadedFiles}
                            onValueChange={setUploadedFiles}
                            onFileReject={onFileReject}
                        >
                            <FileUploadDropzone
                                className={cn(
                                    form.formState.errors.certificateFile &&
                                    "border-destructive"
                                )}
                            >
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <div className="flex items-center justify-center rounded-full border p-3">
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            PDF faylni bu yerga tashlang
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            yoki tanlash uchun bosing (maks. 2MB)
                                        </p>
                                    </div>
                                    <FileUploadTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-1"
                                        >
                                            Fayl tanlash
                                        </Button>
                                    </FileUploadTrigger>
                                </div>
                            </FileUploadDropzone>

                            <FileUploadList>
                                {uploadedFiles.map((file, index) => (
                                    <FileUploadItem
                                        key={index}
                                        value={file}
                                        className="rounded-lg"
                                    >
                                        <FileUploadItemPreview />
                                        <FileUploadItemMetadata />
                                        <FileUploadItemDelete asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </FileUploadItemDelete>
                                    </FileUploadItem>
                                ))}
                            </FileUploadList>
                        </FileUpload>

                        {form.formState.errors.certificateFile?.message && (
                            <p className="text-xs text-destructive">
                                {String(form.formState.errors.certificateFile.message)}
                            </p>
                        )}
                    </div>
                )}

                {/* Agar sertifikat yo'q bo'lsa - Til tanlash */}
                {hasCertificate === "no" && (
                    <div className="space-y-3 pt-2">
                        <Label htmlFor="examLanguage">
                            Chet tili imtihonini topshirish tili{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <select
                            id="examLanguage"
                            className={cn(
                                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                                form.formState.errors.examLanguage &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            {...form.register("examLanguage")}
                        >
                            <option value="en">Ingliz tili</option>
                            <option value="de">Nemis tili</option>
                            <option value="fr">Fransuz tili</option>
                        </select>
                        {form.formState.errors.examLanguage?.message && (
                            <p className="text-xs text-destructive">
                                {String(form.formState.errors.examLanguage.message)}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Keyingi button */}
            <div className="flex justify-end">
                <Button type="submit" size="lg" className="rounded-lg px-8">
                    Keyingi
                </Button>
            </div>
        </form>
    );
}