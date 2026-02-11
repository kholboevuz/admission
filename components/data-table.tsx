"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2, RefreshCcw } from "lucide-react";

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type AdmissionDoc = {
    _id: string;
    title: string;
    starter_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    admission_type: { id: string; name: string }[];
    choices: { id: string; name: string }[];
    uuuid: string;
    status: boolean;
};

function formatDateSafe(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr; // fallback
    return format(d, "dd.MM.yyyy");
}

function joinLimited(items: { name: string }[], limit = 2) {
    if (!items?.length) return "-";
    const names = items.map((x) => x.name).filter(Boolean);
    if (names.length <= limit) return names.join(", ");
    return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}

export function AdmissionTable() {
    const [loading, setLoading] = React.useState(false);
    const [items, setItems] = React.useState<AdmissionDoc[]>([]);

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

    const onDelete = async (id: string) => {
        try {
            const res = await axiosClient.delete(`/admin/admission?id=${id}`);
            if (res.status !== 200) throw new Error("Delete error");

            setItems((prev) => prev.filter((x) => x._id !== id));
            showToast("Admission o‘chirildi", ToastType.Success);
        } catch (e) {
            console.error(e);
            showToast("O‘chirishda xatolik", ToastType.Error);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Admissions</h2>
                    <p className="text-sm text-muted-foreground">Qabul jarayonlari ro‘yxati</p>
                </div>

                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    <RefreshCcw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                    Yangilash
                </Button>
            </div>

            <div className="rounded-xl border">
                <Table>
                    <TableCaption>Qabul jarayonlari jadvali</TableCaption>

                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[320px]">Nomi</TableHead>
                            <TableHead className="w-[170px]">Sana</TableHead>
                            <TableHead>Tanlov turi</TableHead>
                            <TableHead>Yo‘nalishlar</TableHead>
                            <TableHead className="w-[120px]">Holat</TableHead>
                            <TableHead className="w-[90px] text-right">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                    Yuklanmoqda...
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
                                <TableRow key={row._id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="line-clamp-1">{row.title}</span>
                                            <span className="text-xs text-muted-foreground">UUID: {row.uuuid}</span>
                                        </div>
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
                                        {row.status ? (
                                            <Badge>Ochiq</Badge>
                                        ) : (
                                            <Badge variant="secondary">Yopiq</Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(row._id)}
                                            title="O‘chirish"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
