"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // sizda "./ui/textarea" bo‘lsa shunga moslang

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


const MAX_FILES = 2;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
    title: z.string().min(3, "Nomi kamida 3 ta belgidan iborat bo‘lsin").max(120, "Nomi juda uzun"),
    description: z.string().max(1000, "Izoh 1000 belgidan oshmasin").optional().or(z.literal("")),
    files: z
        .array(z.instanceof(File))
        .min(1, "Kamida 1 ta fayl yuklang")
        .max(MAX_FILES, `Ko‘pi bilan ${MAX_FILES} ta fayl`)
        .superRefine((files, ctx) => {
            for (const file of files) {
                if (file.size > MAX_SIZE) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `"${file.name}" 5MB dan katta bo‘lishi mumkin emas`,
                    });
                }
            }
        }),
});

type FormValues = z.infer<typeof formSchema>;

export function AddDocs() {
    const [open, setOpen] = React.useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            files: [],
        },
        mode: "onChange",
    });

    const onSubmit = async (values: FormValues) => {


        toast("Saqlashga tayyor ✅", {
            description: `${values.files.length} ta fayl tanlandi`,
        });

        reset();
        setOpen(false);
    };

    const onInvalid = () => {
        toast("Formada xatolar bor", { description: "Maydonlarni tekshirib chiqing." });
    };

    const onFileReject = React.useCallback((file: File, message: string) => {
        toast.success(message, {
            description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" rejected`,
        });
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Hujjat qo&apos;shish</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Hujjat qo&apos;shish</DialogTitle>
                        <DialogDescription>Hujjat haqida ma&apos;lumot kiriting.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field className="space-y-1">
                            <Label htmlFor="title">Nomi</Label>
                            <Input id="title" {...register("title")} placeholder="Masalan: Buyruq №12" required />
                            {errors.title?.message ? (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            ) : null}
                        </Field>

                        <Field className="space-y-1">
                            <Label htmlFor="description">Izoh</Label>
                            <Textarea id="description" {...register("description")} placeholder="Qisqacha izoh..." required />
                            {errors.description?.message ? (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            ) : null}
                        </Field>

                        <Field className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Fayllar</Label>
                                <span className="text-xs text-muted-foreground">
                                    max {MAX_FILES} ta, har biri {Math.round(MAX_SIZE / (1024 * 1024))}MB
                                </span>
                            </div>

                            <Controller
                                control={control}
                                name="files"
                                render={({ field }) => (
                                    <FileUpload
                                        maxFiles={MAX_FILES}
                                        maxSize={MAX_SIZE}
                                        className="w-full"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        onFileReject={onFileReject}
                                        multiple
                                    >
                                        <FileUploadDropzone>
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <div className="flex items-center justify-center rounded-full border p-2.5">
                                                    <Upload className="size-6 text-muted-foreground" />
                                                </div>
                                                <p className="font-medium text-sm">Drag & drop files here</p>
                                                <p className="text-muted-foreground text-xs">
                                                    Yoki bosing (max {MAX_FILES} ta, {Math.round(MAX_SIZE / (1024 * 1024))}MB gacha)
                                                </p>
                                            </div>

                                            <FileUploadTrigger asChild>
                                                <Button variant="outline" size="sm" className="mt-2 w-fit">
                                                    Browse files
                                                </Button>
                                            </FileUploadTrigger>
                                        </FileUploadDropzone>

                                        <FileUploadList>
                                            {field.value?.map((file, index) => (
                                                <FileUploadItem key={`${file.name}-${file.size}-${index}`} value={file}>
                                                    <FileUploadItemPreview />
                                                    <FileUploadItemMetadata />
                                                    <FileUploadItemDelete asChild>
                                                        <Button variant="ghost" size="icon" className="size-7">
                                                            <X />
                                                        </Button>
                                                    </FileUploadItemDelete>
                                                </FileUploadItem>
                                            ))}
                                        </FileUploadList>
                                    </FileUpload>
                                )}
                            />

                            {errors.files?.message ? (
                                <p className="text-sm text-destructive">{errors.files.message}</p>
                            ) : null}
                        </Field>
                    </FieldGroup>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" type="button">
                                Bekor qilish
                            </Button>
                        </DialogClose>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
