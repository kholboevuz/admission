"use client";

import React, { useEffect, useMemo, useState } from "react";


import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { showToast, ToastType } from "@/utils/toast-utils";
import { axiosClient } from "@/http/axios";

type UserRow = {
    _id: string;
    firstname: string;
    lastname: string;
    document: string;
    brithday: string;
    role: string;
    status: boolean;
    pinfl: string;
    createdAt?: string;
};

type Meta = {
    page: number;
    limit: number;
    total: number;
    pages: number;
};

export default function Page() {
    const [items, setItems] = useState<UserRow[]>([]);
    const [meta, setMeta] = useState<Meta>({ page: 1, limit: 50, total: 0, pages: 1 });

    const [pinfl, setPinfl] = useState("");
    const [pinflApplied, setPinflApplied] = useState(""); // qidirish bosilganda ishlaydi

    const [loading, setLoading] = useState(false);

    const fetchUsers = async (page = 1, limit = 50, pinflQ = "") => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set("page", String(page));
            qs.set("limit", String(limit));
            if (pinflQ.trim()) qs.set("pinfl", pinflQ.trim());

            const res = await axiosClient.get(`/admin/users/list?${qs.toString()}`);
            if (res.data?.success) {
                setItems(res.data.data.items || []);
                setMeta(res.data.data.meta);
            } else {
                showToast(res.data?.message || "Users yuklashda xatolik", ToastType.Error);
            }
        } catch (e: any) {
            showToast(e?.response?.data?.message || e?.message || "Server error", ToastType.Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(1, 50, "");
    }, []);

    const onSearch = () => {
        const q = pinfl.trim();
        setPinflApplied(q);
        fetchUsers(1, meta.limit, q);
    };

    const onReset = () => {
        setPinfl("");
        setPinflApplied("");
        fetchUsers(1, meta.limit, "");
    };

    const goPrev = () => {
        if (meta.page <= 1) return;
        fetchUsers(meta.page - 1, meta.limit, pinflApplied);
    };

    const goNext = () => {
        if (meta.page >= meta.pages) return;
        fetchUsers(meta.page + 1, meta.limit, pinflApplied);
    };

    const onToggleStatus = async (id: string, next: boolean) => {
        // optimistic
        setItems((p) => p.map((u) => (u._id === id ? { ...u, status: next } : u)));

        try {
            const res = await axiosClient.patch("/admin/users/status", { id, status: next });
            if (res.data?.success) {
                showToast("Status yangilandi", ToastType.Success);
            } else {
                throw new Error(res.data?.message || "Status update error");
            }
        } catch (e: any) {
            // rollback
            setItems((p) => p.map((u) => (u._id === id ? { ...u, status: !next } : u)));
            showToast(e?.response?.data?.message || e?.message || "Server error", ToastType.Error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Umumiy foydalanuvchilar</h1>

                </div>

                <div className="flex gap-2 items-center">
                    <div className="w-[280px]">
                        <Input
                            value={pinfl}
                            onChange={(e) => setPinfl(e.target.value)}
                            placeholder="PINFL bo‘yicha qidirish..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onSearch();
                            }}
                        />
                    </div>
                    <Button onClick={onSearch} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Qidirish
                    </Button>
                    <Button variant="secondary" onClick={onReset} disabled={loading}>
                        Reset
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>F.I.Sh</TableHead>
                            <TableHead>PINFL</TableHead>
                            <TableHead>Passport</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                    {loading ? "Yuklanmoqda..." : "Natija topilmadi"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((u) => (
                                <TableRow key={u._id}>
                                    <TableCell className="font-medium">
                                        {u.lastname} {u.firstname}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{u.pinfl}</TableCell>
                                    <TableCell className="font-mono text-xs">{u.document}</TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={u.status} onCheckedChange={(v) => onToggleStatus(u._id, v)} />
                                            <span className="text-xs text-muted-foreground">{u.status ? "true" : "false"}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Jami: <b>{meta.total}</b> • Sahifa: <b>{meta.page}</b>/<b>{meta.pages}</b> • Limit: <b>{meta.limit}</b>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={goPrev} disabled={loading || meta.page <= 1} className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Oldingi
                    </Button>
                    <Button variant="secondary" onClick={goNext} disabled={loading || meta.page >= meta.pages} className="gap-2">
                        Keyingi
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}