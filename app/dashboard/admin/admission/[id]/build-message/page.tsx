"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from "@/components/ui/file-upload";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Upload,
    X,
    Users,
    Bell,
    FileText,
    Send,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
} from "lucide-react";
import Link from "next/link";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const formSchema = z.object({
    title: z.string().min(3, "Sarlavha kamida 3 ta belgi bo'lsin"),
    comment: z.string().min(5, "Xabar kamida 5 ta belgi bo'lsin"),
    sendToAll: z.boolean().optional(),
    users: z.array(z.string()).optional(),
    file: z
        .instanceof(File)
        .refine((file) => file.type === "application/pdf", { message: "Faqat PDF fayl yuklash mumkin" })
        .refine((file) => file.size <= MAX_FILE_SIZE, { message: "Fayl hajmi 5MB dan oshmasligi kerak" })
        .optional(),
});

type FormValues = z.infer<typeof formSchema>;

type UserItem = {
    pinfl: string;
    firstname: string;
    lastname: string;
    role: string;
    status: boolean;
};

type NotifItem = {
    _id: string;
    title: string;
    comment: string;
    file?: string;
    users: string[];
    createdAt: string;
};

function truncate(s: string, n = 80) {
    const str = s || "";
    return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-x-3 px-5 py-3 bg-muted/40 border-b">
                {[3, 5, 2, 2].map((span, i) => (
                    <div key={i} className={`col-span-${span}`}>
                        <Skeleton className="h-3.5 w-3/4 rounded" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="grid grid-cols-12 gap-x-3 gap-y-2 px-5 py-4 border-b last:border-none items-center"
                    style={{ opacity: 1 - i * 0.15 }}
                >
                    <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                        <Skeleton className="size-7 rounded-lg shrink-0" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                    <div className="col-span-12 md:col-span-5 space-y-1.5">
                        <Skeleton className="h-3.5 w-full rounded" />
                        <Skeleton className="h-3.5 w-4/5 rounded" />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="col-span-6 md:col-span-2 flex flex-col items-end gap-1">
                        <Skeleton className="h-3.5 w-14 rounded" />
                        <Skeleton className="h-3 w-10 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}


function UsersMultiSelect({
    disabled,
    value,
    onChange,
}: {
    disabled?: boolean;
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<UserItem[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get<{ success: boolean; data: UserItem[] }>(
                    `/admin/users/search?q=${encodeURIComponent(q)}&limit=20`,
                    { signal: controller.signal }
                );
                setItems(res.data?.data || []);
            } catch (e: any) {
                if (axios.isCancel?.(e) || e?.name === "CanceledError") return;
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [q]);

    const selectedCount = value.length;
    const toggle = (pinfl: string) => {
        if (value.includes(pinfl)) onChange(value.filter((x) => x !== pinfl));
        else onChange([...value, pinfl]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 font-normal"
                    disabled={disabled}
                >
                    <span className="flex items-center gap-2 text-sm">
                        <Users className="size-4 text-muted-foreground shrink-0" />
                        {selectedCount > 0 ? (
                            <span className="flex items-center gap-2">
                                Foydalanuvchilar
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                                    {selectedCount}
                                </Badge>
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Foydalanuvchilarni tanlang</span>
                        )}
                    </span>
                    <span className="text-muted-foreground/60 text-xs shrink-0">PINFL</span>
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[min(92vw,480px)] p-0" align="start">
                <div className="p-3 border-b">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="PINFL bo'yicha qidirish…"
                        className="h-9"
                        autoFocus
                    />
                </div>

                <div className="max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-2">
                                    <Skeleton className="size-4 rounded shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-3/4 rounded" />
                                        <Skeleton className="h-3 w-1/3 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Users className="size-8 text-muted-foreground/30" />
                            <span className="text-sm text-muted-foreground">Natija topilmadi</span>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {items.map((u) => {
                                const isSelected = value.includes(u.pinfl);
                                return (
                                    <button
                                        key={u.pinfl}
                                        type="button"
                                        onClick={() => toggle(u.pinfl)}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                            }`}
                                    >
                                        <Checkbox checked={isSelected} className="shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">
                                                {u.firstname} {u.lastname}
                                                <span className="text-xs text-muted-foreground font-normal ml-1">
                                                    · {u.role}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                {u.pinfl}
                                            </div>
                                        </div>
                                        {!u.status && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs shrink-0 text-amber-600 border-amber-300"
                                            >
                                                Nofaol
                                            </Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {selectedCount > 0 && (
                    <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                        <span className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{selectedCount}</span> ta tanlandi
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onChange([])}
                        >
                            Tozalash
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ n }: { n: NotifItem }) {
    const date = new Date(n.createdAt);
    const dateStr = date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const timeStr = date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="group grid grid-cols-12 gap-x-3 gap-y-2 px-5 py-4 hover:bg-muted/30 transition-colors border-b last:border-none items-start">
            {/* Title */}
            <div className="col-span-12 md:col-span-3 flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0 size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug truncate">{truncate(n.title, 40)}</p>
                    {n.file && (
                        <Link href={n.file} target="_blank" rel="noopener noreferrer">
                            <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
                                <FileText className="size-3" />
                                PDF
                            </span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Comment */}
            <div className="col-span-12 md:col-span-5 min-w-0">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {truncate(n.comment, 130)}
                </p>
            </div>

            {/* Recipients */}
            <div className="col-span-6 md:col-span-2 flex items-center">
                <Badge variant="secondary" className="gap-1.5 font-normal text-xs">
                    <Users className="size-3" />
                    {n.users?.length || 0} ta
                </Badge>
            </div>

            {/* Date */}
            <div className="col-span-6 md:col-span-2 text-right">
                <p className="text-xs font-medium text-foreground/70">{dateStr}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="size-7 text-muted-foreground/50" />
            </div>
            <div>
                <p className="font-semibold">Hali xabarlar yo'q</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Yangi xabar tugmasidan foydalanib birinchi xabarni yuboring.
                </p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
    const params = useParams();
    const admissionId = typeof params?.id === "string" ? params.id : null;

    const [listLoading, setListLoading] = useState(true);
    const [items, setItems] = useState<NotifItem[]>([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<any>(null);

    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        clearErrors,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            title: "",
            comment: "",
            sendToAll: false,
            users: [],
            file: undefined,
        },
    });

    const sendToAll = Boolean(watch("sendToAll"));
    const selectedUsers = watch("users") || [];

    useEffect(() => {
        if (files.length > 0) setValue("file", files[0], { shouldValidate: true });
        else {
            setValue("file", undefined);
            clearErrors("file");
        }
    }, [files, setValue, clearErrors]);

    useEffect(() => {
        if (sendToAll) setValue("users", []);
    }, [sendToAll, setValue]);

    const load = async (signal?: AbortSignal) => {
        if (!admissionId) return;
        setListLoading(true);
        try {
            const res = await axiosClient.get<any>(
                `/admin/admission/${admissionId}/notifications?page=${page}&limit=20`,
                { signal }
            );

            setItems(res.data?.data || []);
            setMeta(res.data?.pagination || null);
        } catch (e: any) {
            if (axios.isCancel?.(e) || e?.name === "CanceledError") return;
            setItems([]);
            setMeta(null);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admissionId, page]);

    const onFileReject = React.useCallback((file: File, message: string) => {
        showToast(message || `Fayl rad etildi: ${file.name}`, ToastType.Error);
    }, []);

    const onSubmit = async (data: FormValues) => {
        try {
            if (!admissionId) return;

            let uploadedFileKey: string | null = null;

            if (data.file) {
                const fd = new FormData();
                fd.append("scope", "admission");
                fd.append("admission_id", admissionId);
                fd.append("file", data.file);

                const up = await axiosClient.post("/user/application/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                uploadedFileKey = up?.data?.data?.path || up?.data?.data?.name || null;
            }

            await axiosClient.post(`/admin/admission/${admissionId}/notifications`, {
                title: data.title,
                comment: data.comment,
                file: uploadedFileKey,
                sendToAll: Boolean(data.sendToAll),
                users: data.users || [],
            });

            showToast("Xabar muvaffaqiyatli yuborildi", ToastType.Success);
            reset();
            setFiles([]);
            setOpen(false);
            setPage(1);
            await load();
        } catch (e: any) {
            showToast(
                e?.response?.data?.error || e?.response?.data?.message || "Xatolik yuz berdi",
                ToastType.Error
            );
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Bell className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">Xabarlar</h1>
                        <p className="text-sm text-muted-foreground">
                            Qabul bo'yicha foydalanuvchilarga xabar yuborish
                        </p>
                    </div>
                </div>

                <AlertDialog open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger asChild>
                        <Button className="gap-2 shrink-0 self-start sm:self-auto">
                            <Send className="size-4" />
                            Yangi xabar
                        </Button>
                    </AlertDialogTrigger>

                    {/* ── Dialog ── */}
                    <AlertDialogContent className="w-[95vw] max-w-xl max-h-[90dvh] overflow-y-auto p-0 gap-0">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            {/* Header */}
                            <AlertDialogHeader className="px-6 pt-6 pb-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Send className="size-4 text-primary" />
                                    </div>
                                    <div>
                                        <AlertDialogTitle className="text-base leading-tight">
                                            Yangi xabar yuborish
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs mt-0.5">
                                            Sarlavha, matn va ixtiyoriy PDF fayl biriktiring
                                        </AlertDialogDescription>
                                    </div>
                                </div>
                            </AlertDialogHeader>

                            {/* Body */}
                            <div className="px-6 py-5 space-y-5">
                                {/* Title field */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Sarlavha</label>
                                    <Input
                                        placeholder="Xabar sarlavhasi…"
                                        className="h-10"
                                        {...register("title")}
                                    />
                                    {errors.title && (
                                        <p className="text-xs text-destructive">{errors.title.message}</p>
                                    )}
                                </div>

                                {/* Send to all */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ")
                                            setValue("sendToAll", !sendToAll, { shouldValidate: true });
                                    }}
                                    onClick={() =>
                                        setValue("sendToAll", !sendToAll, { shouldValidate: true })
                                    }
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors select-none ${sendToAll
                                        ? "bg-primary/5 border-primary/30"
                                        : "hover:bg-muted/40"
                                        }`}
                                >
                                    <Checkbox
                                        checked={sendToAll}
                                        onCheckedChange={(v) =>
                                            setValue("sendToAll", Boolean(v), { shouldValidate: true })
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-tight">
                                            Barcha foydalanuvchilarga
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Belgilansa foydalanuvchi tanlash o'chiriladi
                                        </p>
                                    </div>
                                    {sendToAll && (
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                            Faol
                                        </Badge>
                                    )}
                                </div>

                                {/* User select */}
                                {!sendToAll && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Foydalanuvchilar</label>
                                        <UsersMultiSelect
                                            value={selectedUsers}
                                            onChange={(v) =>
                                                setValue("users", v, { shouldValidate: true })
                                            }
                                        />
                                        {errors.users && (
                                            <p className="text-xs text-destructive">
                                                Kamida 1 ta user tanlang
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Comment */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Xabar matni</label>
                                    <Textarea
                                        placeholder="Xabar matnini kiriting…"
                                        rows={4}
                                        className="resize-none"
                                        {...register("comment")}
                                    />
                                    {errors.comment && (
                                        <p className="text-xs text-destructive">{errors.comment.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {sendToAll
                                            ? "Barcha foydalanuvchilarga yuboriladi."
                                            : selectedUsers.length > 0
                                                ? `${selectedUsers.length} ta tanlangan foydalanuvchiga yuboriladi.`
                                                : "Foydalanuvchi tanlanmagan."}
                                    </p>
                                </div>

                                {/* File upload */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">
                                        PDF fayl{" "}
                                        <span className="font-normal text-muted-foreground">(ixtiyoriy)</span>
                                    </label>
                                    <FileUpload
                                        maxFiles={1}
                                        maxSize={MAX_FILE_SIZE}
                                        value={files}
                                        onValueChange={setFiles}
                                        onFileReject={onFileReject}
                                        accept="application/pdf"
                                    >
                                        <FileUploadDropzone className="border-dashed rounded-xl py-6">
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div className="size-10 rounded-xl border bg-muted flex items-center justify-center">
                                                    <Upload className="size-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Fayl yuklash</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        PDF · Maksimal 5 MB
                                                    </p>
                                                </div>
                                                <FileUploadTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-1 h-8 text-xs"
                                                        type="button"
                                                    >
                                                        Fayl tanlash
                                                    </Button>
                                                </FileUploadTrigger>
                                            </div>
                                        </FileUploadDropzone>

                                        <FileUploadList className="mt-2">
                                            {files.map((file, index) => (
                                                <FileUploadItem
                                                    key={index}
                                                    value={file}
                                                    className="rounded-lg border bg-muted/30 px-3 py-2 min-w-0"
                                                >
                                                    <FileUploadItemPreview className="size-8 shrink-0" />
                                                    <div className="min-w-0 flex-1 ml-2">
                                                        <p className="truncate text-sm font-medium leading-tight">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <FileUploadItemDelete asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <X className="size-3.5" />
                                                        </Button>
                                                    </FileUploadItemDelete>
                                                </FileUploadItem>
                                            ))}
                                        </FileUploadList>
                                    </FileUpload>
                                    {errors.file && (
                                        <p className="text-xs text-destructive">{errors.file.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <AlertDialogFooter className="px-6 py-4 border-t bg-muted/20 flex-row gap-2">
                                <AlertDialogCancel type="button" className="flex-1 sm:flex-none">
                                    Bekor qilish
                                </AlertDialogCancel>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 sm:flex-none gap-2"
                                >
                                    <Send className="size-4" />
                                    {isSubmitting ? "Yuborilmoqda…" : "Yuborish"}
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* ── List ── */}
            {listLoading ? (
                <TableSkeleton />
            ) : items.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    {/* Column headers */}
                    <div className="hidden md:grid grid-cols-12 gap-x-3 px-5 py-3 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-3">Sarlavha</div>
                        <div className="col-span-5">Xabar</div>
                        <div className="col-span-2">Qabul qiluvchilar</div>
                        <div className="col-span-2 text-right">Sana</div>
                    </div>

                    <div>
                        {items.map((n) => (
                            <div
                                key={n._id}
                                className="group grid grid-cols-12 gap-x-3 gap-y-2 px-5 py-4 hover:bg-muted/30 transition-colors border-b last:border-none items-start"
                            >
                                {/* Title */}
                                <div className="col-span-12 md:col-span-3 flex items-start gap-2.5 min-w-0">
                                    <div className="mt-0.5 shrink-0 size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Bell className="size-3.5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold leading-snug truncate">
                                            {truncate(n.title, 40)}
                                        </p>
                                        {n.file && (
                                            <Link href={n.file} target="_blank" rel="noopener noreferrer">
                                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
                                                    <FileText className="size-3" />
                                                    PDF
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div className="col-span-12 md:col-span-5 min-w-0">
                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                        {truncate(n.comment, 130)}
                                    </p>
                                </div>

                                {/* Recipients */}
                                <div className="col-span-6 md:col-span-2 flex items-center">
                                    <Badge variant="secondary" className="gap-1.5 font-normal text-xs">
                                        <Users className="size-3" />
                                        {n.users?.length || 0} ta
                                    </Badge>
                                </div>

                                {/* Date */}
                                <div className="col-span-6 md:col-span-2 text-right">
                                    <p className="text-xs font-medium text-foreground/70">
                                        {new Date(n.createdAt).toLocaleDateString("uz-UZ", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "2-digit",
                                        })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(n.createdAt).toLocaleTimeString("uz-UZ", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {meta && (
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