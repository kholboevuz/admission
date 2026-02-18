"use client";

import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { axiosClient } from "@/http/axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const MAX_PDF = 5 * 1024 * 1024;

export type InternationalDiplomaItem = {
    _id: string;
    university: string;
    direction: string;
    educationType: "bachelor" | "master";
    diplomaNumber: string;
    diplomaFilePath?: string;
    nostrificationFilePath?: string;
    createdAt?: string;
};

const SchemaCreate = z.object({
    university: z.string().min(2, "Universitet nomini kiriting"),
    direction: z.string().min(2, "Yo‘nalishni kiriting"),
    educationType: z.enum(["bachelor", "master"]),
    diplomaNumber: z.string().min(3, "Diplom seriya/raqamini kiriting"),
    diplomaFile: z.custom<File>((v) => v instanceof File, "Diplom PDF faylini yuklang"),
    nostrificationFile: z.custom<File>((v) => v instanceof File, "Nostrifikatsiya PDF faylini yuklang"),
});

const SchemaEdit = z.object({
    university: z.string().min(2, "Universitet nomini kiriting"),
    direction: z.string().min(2, "Yo‘nalishni kiriting"),
    educationType: z.enum(["bachelor", "master"]),
    diplomaNumber: z.string().min(3, "Diplom seriya/raqamini kiriting"),
    diplomaFile: z.custom<File | null>().optional(),
    nostrificationFile: z.custom<File | null>().optional(),
});

type ValuesCreate = z.infer<typeof SchemaCreate>;
type ValuesEdit = z.infer<typeof SchemaEdit>;

function DropzoneOne({
    label,
    file,
    setFile,
}: {
    label: string;
    file: File | null;
    setFile: (f: File | null) => void;
}) {
    const [files, setFiles] = React.useState<File[]>(file ? [file] : []);

    React.useEffect(() => {
        setFiles(file ? [file] : []);
    }, [file]);

    return (
        <FileUpload
            maxFiles={1}
            maxSize={MAX_PDF}
            className="w-full"
            value={files}
            accept="application/pdf"
            onValueChange={(v) => {
                setFiles(v);
                setFile(v?.[0] ?? null);
            }}
            onFileReject={() => { }}
            multiple={false}
        >
            <FileUploadDropzone className="rounded-xl">
                <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex items-center justify-center rounded-full border p-2.5">
                        <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm">Drag & drop PDF</p>
                    <p className="text-muted-foreground text-xs">Browse (max 1 file, 5MB)</p>
                </div>

                <FileUploadTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 w-fit">
                        Browse files
                    </Button>
                </FileUploadTrigger>
            </FileUploadDropzone>

            <FileUploadList>
                {files.map((f, idx) => (
                    <FileUploadItem key={idx} value={f}>
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata />
                        <FileUploadItemDelete asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => {
                                    setFile(null);
                                    setFiles([]);
                                }}
                            >
                                <X />
                            </Button>
                        </FileUploadItemDelete>
                    </FileUploadItem>
                ))}
            </FileUploadList>
        </FileUpload>
    );
}

type Props = {
    mode?: "create" | "edit";
    item?: InternationalDiplomaItem | null;
    onSaved?: () => void;
    onDeleted?: () => void;
    load?: () => void;
};

export default function AddInternationalDiplom({ mode = "create", item, onSaved, onDeleted, load }: Props) {
    const [open, setOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const isEdit = mode === "edit";

    const formCreate = useForm<ValuesCreate>({
        resolver: zodResolver(SchemaCreate),
        defaultValues: {
            university: "",
            direction: "",
            educationType: "bachelor",
            diplomaNumber: "",
            diplomaFile: undefined as any,
            nostrificationFile: undefined as any,
        },
    });

    const formEdit = useForm<ValuesEdit>({
        resolver: zodResolver(SchemaEdit),
        defaultValues: {
            university: item?.university || "",
            direction: item?.direction || "",
            educationType: item?.educationType || "bachelor",
            diplomaNumber: item?.diplomaNumber || "",
            diplomaFile: null,
            nostrificationFile: null,
        },
    });

    React.useEffect(() => {
        if (!isEdit) return;
        formEdit.reset({
            university: item?.university || "",
            direction: item?.direction || "",
            educationType: item?.educationType || "bachelor",
            diplomaNumber: item?.diplomaNumber || "",
            diplomaFile: null,
            nostrificationFile: null,
        });
    }, [isEdit, item?._id]);

    const onSubmitCreate = async (v: ValuesCreate) => {
        try {
            setSaving(true);
            const fd = new FormData();
            fd.append("university", v.university);
            fd.append("direction", v.direction);
            fd.append("educationType", v.educationType);
            fd.append("diplomaNumber", v.diplomaNumber);
            fd.append("diplomaFile", v.diplomaFile);
            fd.append("nostrificationFile", v.nostrificationFile);

            const res = await axiosClient.post("/user/international-diploma", fd, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true,
            });

            if (res.data?.success) {
                setOpen(false);
                load?.();
            }
        } finally {
            setSaving(false);
        }
    };

    const onSubmitEdit = async (v: ValuesEdit) => {
        if (!item?._id) return;
        try {
            setSaving(true);
            const fd = new FormData();
            fd.append("university", v.university);
            fd.append("direction", v.direction);
            fd.append("educationType", v.educationType);
            fd.append("diplomaNumber", v.diplomaNumber);

            if (v.diplomaFile instanceof File) fd.append("diplomaFile", v.diplomaFile);
            if (v.nostrificationFile instanceof File) fd.append("nostrificationFile", v.nostrificationFile);

            const res = await axiosClient.put(`/user/international-diploma/${item._id}`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true,
            });

            if (res.data?.success) {
                setOpen(false);
                onSaved?.();
            }
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!item?._id) return;
        try {
            setDeleting(true);
            const res = await axiosClient.delete(`/user/international-diploma/${item._id}`, { withCredentials: true });
            if (res.data?.success) {
                setOpen(false);
                onDeleted?.();
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {isEdit ? (
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl">
                        <Pencil className="size-4" />
                    </Button>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button className="rounded-xl">
                        <Plus className="mr-2 size-4" />
                        Xalqaro diplom qo‘shish
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Xalqaro diplomni tahrirlash" : "Xalqaro diplom qo‘shish"}</DialogTitle>
                </DialogHeader>

                {!isEdit ? (
                    <Form {...formCreate}>
                        <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={formCreate.control}
                                    name="university"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Universitet nomi</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formCreate.control}
                                    name="direction"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yo‘nalish</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formCreate.control}
                                    name="educationType"
                                    render={({ field }) => (
                                        <FormItem >
                                            <FormLabel>Ta’lim turi</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl className="w-full">
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder="Tanlang" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="bachelor">Bakalavr</SelectItem>
                                                    <SelectItem value="master">Magistr</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formCreate.control}
                                    name="diplomaNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Diplom seriya/raqami</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-5">
                                <FormField
                                    control={formCreate.control}
                                    name="diplomaFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Diplom PDF</FormLabel>
                                            <DropzoneOne
                                                label="Diplom PDF"
                                                file={field.value instanceof File ? field.value : null}
                                                setFile={(f) => field.onChange(f as any)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formCreate.control}
                                    name="nostrificationFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nostrifikatsiya PDF</FormLabel>
                                            <DropzoneOne
                                                label="Nostrifikatsiya PDF"
                                                file={field.value instanceof File ? field.value : null}
                                                setFile={(f) => field.onChange(f as any)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                                    Bekor qilish
                                </Button>
                                <Button type="submit" className="rounded-xl" disabled={saving}>
                                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <Form {...formEdit}>
                        <form onSubmit={formEdit.handleSubmit(onSubmitEdit)} className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={formEdit.control}
                                    name="university"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Universitet nomi</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formEdit.control}
                                    name="direction"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yo‘nalish</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formEdit.control}
                                    name="educationType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ta’lim turi</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl className="w-full">
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder="Tanlang" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="bachelor">Bakalavr</SelectItem>
                                                    <SelectItem value="master">Magistr</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formEdit.control}
                                    name="diplomaNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Diplom seriya/raqami</FormLabel>
                                            <FormControl>
                                                <Input className="rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-5">
                                <FormField
                                    control={formEdit.control}
                                    name="diplomaFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Diplom PDF (xohlasangiz almashtiring)</FormLabel>
                                            <DropzoneOne
                                                label="Diplom PDF"
                                                file={field.value instanceof File ? field.value : null}
                                                setFile={(f) => field.onChange(f as any)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={formEdit.control}
                                    name="nostrificationFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nostrifikatsiya PDF (xohlasangiz almashtiring)</FormLabel>
                                            <DropzoneOne
                                                label="Nostrifikatsiya PDF"
                                                file={field.value instanceof File ? field.value : null}
                                                setFile={(f) => field.onChange(f as any)}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="rounded-xl" disabled={deleting}>
                                            <Trash2 className="mr-2 size-4" />
                                            O‘chirish
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>O‘chirishni tasdiqlang</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Xalqaro diplom yozuvi va unga tegishli fayllar o‘chiriladi.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-xl">Bekor</AlertDialogCancel>
                                            <AlertDialogAction className="rounded-xl" onClick={doDelete}>
                                                {deleting ? "O‘chirilmoqda..." : "Ha, o‘chirish"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                                        Yopish
                                    </Button>
                                    <Button type="submit" className="rounded-xl" disabled={saving}>
                                        {saving ? "Saqlanmoqda..." : "Yangilash"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
