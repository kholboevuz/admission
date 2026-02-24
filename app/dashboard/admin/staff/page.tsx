"use client";
import { useEffect, useMemo, useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { axiosClient } from "@/http/axios";
import StaffAddDialog from "@/components/staff-add-dialog";

type StaffRow = {
    _id: string;
    firstname: string;
    lastname: string;
    pinfl: string;
    document: string;
    brithday: string;
    role: "admin" | "modirator";
    status: boolean;
    allowedIps: string[];
    createdAt: string;
};

export default function Page() {
    const [rows, setRows] = useState<StaffRow[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get("/admin/staff/list");
            if (res.data?.success) setRows(res.data.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onToggle = async (id: string, next: boolean) => {

        setRows((p) => p.map((r) => (r._id === id ? { ...r, status: next } : r)));
        try {
            await axiosClient.patch("/admin/staff/status", { id, status: next });
        } catch (e) {

            setRows((p) => p.map((r) => (r._id === id ? { ...r, status: !next } : r)));
        }
    };

    const onDelete = async (id: string) => {

        const prev = rows;
        setRows((p) => p.filter((r) => r._id !== id));
        try {
            await axiosClient.delete(`/admin/staff/delete?id=${encodeURIComponent(id)}`);
        } catch (e) {
            setRows(prev);
        }
    };

    return (
        <div className="space-y-4" >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Xodim</h1>
                    <p className="text-sm text-muted-foreground">Admin / modiratorlarni boshqarish</p>
                </div>
                <StaffAddDialog
                    onCreated={() => load()}
                    trigger={
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Staff qo‘shish
                        </Button>
                    }
                />
            </div>

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>F.I.Sh</TableHead>
                            <TableHead>PINFL</TableHead>
                            <TableHead>Passport</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Allowed IP</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Xarakatlar</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                                    {loading ? "Yuklanmoqda..." : "Hozircha staff yo‘q"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((r) => (
                                <TableRow key={r._id}>
                                    <TableCell className="font-medium">
                                        {r.lastname} {r.firstname}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{r.pinfl}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.document}</TableCell>
                                    <TableCell>
                                        <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                                            {r.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {r.allowedIps?.length ? `${r.allowedIps.length} ta` : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={r.status} onCheckedChange={(v) => onToggle(r._id, v)} />
                                            <span className="text-xs text-muted-foreground">
                                                {r.status ? "true" : "false"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => onDelete(r._id)}>
                                            <Trash2 className="h-4 w-4" />
                                            O‘chirish
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