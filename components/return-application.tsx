"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Undo2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const formSchema = z.object({
    reason: z.string().min(10, "Sabab kamida 10 ta belgidan iborat bo‘lishi kerak"),
    file: z
        .instanceof(File)
        .refine((file) => file.type === "application/pdf", { message: "Faqat PDF fayl yuklash mumkin" })
        .refine((file) => file.size <= MAX_FILE_SIZE, { message: "Fayl hajmi 5MB dan oshmasligi kerak" })
        .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReturnApplication({ application_id, onLoad }: { application_id: string; onLoad?: () => void }) {
    const [files, setFiles] = React.useState<File[]>([]);
    const [open, setOpen] = React.useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        clearErrors,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
    });

    React.useEffect(() => {
        if (files.length > 0) setValue("file", files[0], { shouldValidate: true });
        else {
            setValue("file", undefined);
            clearErrors("file");
        }
    }, [files, setValue, clearErrors]);

    const onFileReject = React.useCallback((file: File, message: string) => {
        toast(message, {
            description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
        });
    }, []);

    const onSubmit = async (data: FormValues) => {
        try {
            let uploadedFileKey: string | null = null;
            if (data.file) {
                const fd = new FormData();
                fd.append("scope", "admission");
                fd.append("admission_id", application_id);
                fd.append("file", data.file);

                const up = await axiosClient.post("/user/application/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                uploadedFileKey =
                    up?.data?.data?.path || up?.data?.data?.name || null;
            }

            await axiosClient.post("/manager/applications/message/return", {
                application_id,
                reason: data.reason,
                file: uploadedFileKey,
            });

            showToast("Ariza muvaffaqiyatli qaytarildi", ToastType.Success);
            reset();
            setFiles([]);
            setOpen(false);
            if (onLoad) onLoad();
        } catch (e: any) {
            console.error(e);
            showToast(e?.response?.data?.error || e?.response?.data?.message || "Xatolik yuz berdi", ToastType.Error);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="default" size="sm">
                    Arizani qaytarish <Undo2 className="ml-1 size-4" />
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="w-[95vw] max-w-lg sm:max-w-xl max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arizani qaytarish</AlertDialogTitle>
                        <AlertDialogDescription>
                            Iltimos, qaytarish sababini kiriting. PDF hujjat biriktirish ixtiyoriy.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Textarea placeholder="Qaytarish sababi..." {...register("reason")} />
                        {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <FileUpload
                            maxFiles={1}
                            maxSize={MAX_FILE_SIZE}
                            value={files}
                            onValueChange={setFiles}
                            onFileReject={onFileReject}
                            accept={"application/pdf"}
                        >
                            <FileUploadDropzone>
                                <div className="flex flex-col items-center gap-1 text-center">
                                    <div className="flex items-center justify-center rounded-full border p-2.5">
                                        <Upload className="size-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-sm">PDF faylni yuklang (ixtiyoriy)</p>
                                    <p className="text-muted-foreground text-xs">Maksimal 5MB</p>
                                </div>
                                <FileUploadTrigger asChild>
                                    <Button variant="outline" size="sm" className="mt-2 w-fit">
                                        Fayl tanlash
                                    </Button>
                                </FileUploadTrigger>
                            </FileUploadDropzone>

                            <FileUploadList className="max-h-40 overflow-y-auto pr-1">
                                {files.map((file, index) => (
                                    <FileUploadItem key={index} value={file} className="min-w-0">
                                        <FileUploadItemPreview />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">File yuklandi</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                        </div>
                                        <FileUploadItemDelete asChild>
                                            <Button variant="ghost" size="icon" className="shrink-0">
                                                <X className="size-4" />
                                            </Button>
                                        </FileUploadItemDelete>
                                    </FileUploadItem>
                                ))}
                            </FileUploadList>
                        </FileUpload>

                        {errors.file && <p className="text-sm text-red-500">{errors.file.message}</p>}
                    </div>

                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel type="button">Bekor qilish</AlertDialogCancel>
                        <Button type="submit" variant="destructive" disabled={isSubmitting}>
                            {isSubmitting ? "Yuklanmoqda..." : "Qaytarish"}
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}