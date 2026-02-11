"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2, Loader2, Pencil } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import { AdmissionDialog, AdmissionDoc } from "./add-admission";
import Link from "next/link";


function formatDateSafe(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return format(d, "dd.MM.yyyy");
}

function joinLimited(items: { name: string }[], limit = 2) {
    if (!items?.length) return "-";
    const names = items.map((x) => x.name).filter(Boolean);
    if (names.length <= limit) return names.join(", ");
    return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}

function axiosErrorMessage(error: any) {
    return (
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Xatolik yuz berdi"
    );
}

export function AdmissionTable({ add }: { add?: boolean } = {}) {
    const [loading, setLoading] = React.useState(false);
    const [items, setItems] = React.useState<AdmissionDoc[]>([]);

    // delete dialog
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<AdmissionDoc | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // create/edit dialog
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
    const [editing, setEditing] = React.useState<AdmissionDoc | null>(null);

    const hasActiveAdmission = React.useMemo(
        () => items.some((x) => x.status === true),
        [items]
    );

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get("/admin/admission");
            const data: AdmissionDoc[] = res.data?.data ?? [];
            setItems(data);
        } catch (e) {
            console.error(e);
            showToast("Admissionlarni olishda xatolik", ToastType.Error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        if (hasActiveAdmission) {
            showToast("Sizda aktiv admission bor. Yangi admission qo‘shib bo‘lmaydi.", ToastType.Warning);
            return;
        }
        setDialogMode("create");
        setEditing(null);
        setDialogOpen(true);
    };

    const openEdit = (row: AdmissionDoc) => {
        setDialogMode("edit");
        setEditing(row);
        setDialogOpen(true);
    };

    const askDelete = (row: AdmissionDoc) => {
        setDeleteTarget(row);
        setConfirmOpen(true);
    };

    const onDeleteConfirmed = async () => {
        if (!deleteTarget?._id) return;

        setDeleting(true);
        try {
            const res = await axiosClient.delete(`/admin/admission?id=${deleteTarget._id}`);
            if (res.status !== 200) throw new Error("Delete error");

            setItems((prev) => prev.filter((x) => x._id !== deleteTarget._id));
            showToast(res.data?.message || "Admission o‘chirildi", ToastType.Success);

            setConfirmOpen(false);
            setDeleteTarget(null);
        } catch (e: any) {
            console.error(e);
            showToast(axiosErrorMessage(e), ToastType.Error);
        } finally {
            setDeleting(false);
        }
    };

    const changeStatus = async (row: AdmissionDoc) => {
        try {
            const res = await axiosClient.put(`/admin/admission/status?id=${row._id}`);
            const updated: AdmissionDoc = res.data?.data;

            setItems((prev) =>
                prev.map((x) => (x._id === row._id ? { ...x, status: updated.status } : x))
            );

            showToast(res.data?.message || "Admission holati yangilandi", ToastType.Success);
        } catch (error: any) {
            console.error(error);
            showToast(axiosErrorMessage(error), ToastType.Error);
        }
    };

    return (
        <div className="space-y-3">
            {add && (
                <div className="flex justify-end">
                    <Button onClick={openCreate}>Yangi admission</Button>
                </div>
            )}

            <div className="rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[320px]">Nomi</TableHead>
                            <TableHead className="w-[170px]">Sana</TableHead>
                            <TableHead>Tanlov turi</TableHead>
                            <TableHead>Yo‘nalishlar</TableHead>
                            <TableHead className="w-[120px]">Holat</TableHead>
                            <TableHead className="w-[160px] text-right">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                    Hozircha admission yo‘q
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((row) => (
                                <TableRow key={row._id} >

                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/admin/admission/${row._id}`} className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <span className="line-clamp-1">{row.title}</span>
                                                <span className="text-xs text-muted-foreground">UUID: {row.uuuid}</span>
                                            </div>
                                        </Link>
                                    </TableCell>

                                    <TableCell>
                                        <div className="text-sm">
                                            {formatDateSafe(row.starter_date)} — {formatDateSafe(row.end_date)}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-sm">{joinLimited(row.admission_type, 2)}</span>
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-sm">{joinLimited(row.choices, 2)}</span>
                                    </TableCell>

                                    <TableCell>
                                        {row.status ? <Badge>Ochiq</Badge> : <Badge variant="secondary">Yopiq</Badge>}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Switch checked={row.status} onCheckedChange={() => changeStatus(row)} />

                                            <Button variant="outline" size="icon" onClick={() => openEdit(row)} title="Tahrirlash">
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <Button variant="destructive" size="icon" onClick={() => askDelete(row)} title="O‘chirish">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit dialog */}
            <AdmissionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                initial={editing}
                onSaved={load}
                hasActiveAdmission={hasActiveAdmission}
            />

            {/* Delete confirm */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>O‘chirishni tasdiqlaysizmi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium">{deleteTarget?.title ?? "Ushbu admission"}</span> butunlay o‘chiriladi.
                            Bu amalni qaytarib bo‘lmaydi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Bekor qilish</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeleteConfirmed} disabled={deleting}>
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    O‘chirilmoqda
                                </>
                            ) : (
                                "Ha, o‘chirilsin"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
