"use client";
import React, { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Search, UserPlus, Loader2 } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type Props = {
    trigger: React.ReactNode;
    onCreated?: () => void;
};

type SearchResult = {
    firstname: string;
    lastname: string;
    pinfl: string;
    document: string;
    brithday: string;
    photoBase64?: string | null;
    raw?: any;
};

type AdmissionItem = {
    uuuid: string;
    title: string;
    starter_date: string;
    end_date: string;
    status: boolean;
};

export default function StaffAddDialog({ trigger, onCreated }: Props) {
    const [open, setOpen] = useState(false);

    const [pinfl, setPinfl] = useState("");
    const [document, setDocument] = useState("");
    const [brithday, setBrithday] = useState("");

    const [searching, setSearching] = useState(false);
    const [found, setFound] = useState<SearchResult | null>(null);

    const [role, setRole] = useState<"admin" | "modirator">("modirator");
    const [password, setPassword] = useState("");
    const [allowedIps, setAllowedIps] = useState("");

    // ✅ Admission select uchun
    const [admissions, setAdmissions] = useState<AdmissionItem[]>([]);
    const [admissionUuuid, setAdmissionUuuid] = useState<string>(""); // tanlangan admission

    const [loadingAdmissions, setLoadingAdmissions] = useState(false);

    const [saving, setSaving] = useState(false);

    const canSearch = pinfl.trim().length >= 10 && document.trim().length >= 5 && brithday.trim().length >= 8;

    useEffect(() => {
        if (!open) return;

        (async () => {
            setLoadingAdmissions(true);
            try {

                const res = await axiosClient.get("/admin/admission");

                if (res.data?.success) {
                    const list: AdmissionItem[] = res.data.data || [];
                    setAdmissions(list);

                    if (!admissionUuuid && list.length > 0) {
                        setAdmissionUuuid(list[0].uuuid);
                    }
                } else {
                    showToast(res.data?.message || "Admission ro‘yxatini olib bo‘lmadi", ToastType.Warning);
                    setAdmissions([]);
                }
            } catch (e: any) {
                showToast(e?.message || "Admission list server error", ToastType.Error);
                setAdmissions([]);
            } finally {
                setLoadingAdmissions(false);
            }
        })();

    }, [open]);

    const selectedAdmission = useMemo(
        () => admissions.find((a) => a.uuuid === admissionUuuid) || null,
        [admissions, admissionUuuid]
    );

    const doSearch = async () => {
        setSearching(true);
        setFound(null);
        try {
            const res = await axiosClient.post("/admin/staff/search", {
                pinfl: pinfl.trim(),
                document: document.trim(),
                brithday: brithday.trim(),
            });

            if (res.data?.success) {
                showToast("Shaxs MSPD’dan topildi", ToastType.Success);
                setFound(res.data.data);
            } else {
                setFound(null);
                showToast(res.data?.message || "Shaxs topilmadi", ToastType.Warning);
            }
        } finally {
            setSearching(false);
        }
    };

    const doCreate = async () => {
        if (!found) return;

        if (!admissionUuuid) {
            showToast("Qaysi qabul (admission) ga qo‘shilishini tanlang", ToastType.Warning);
            return;
        }

        setSaving(true);
        try {
            const res = await axiosClient.post("/admin/staff/create", {
                pinfl: found.pinfl,
                document: found.document,
                brithday: found.brithday,
                role,
                password,
                allowedIps,
                admissionUuuid,
            });

            if (res.data?.success) {
                showToast(res.data.message || "Staff qo‘shildi", ToastType.Success);

                setOpen(false);

                setPinfl("");
                setDocument("");
                setBrithday("");
                setFound(null);
                setPassword("");
                setAllowedIps("");
                setRole("modirator");
                setAdmissionUuuid("");

                onCreated?.();
            } else {
                showToast(res.data?.message || "Xatolik yuz berdi", ToastType.Error);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Server error";
            showToast(msg, ToastType.Error);
            console.error("Create error:", err?.response?.data || err);
        } finally {
            setSaving(false);
        }
    };

    const canCreate = !!found && !!password.trim() && !!admissionUuuid;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>Staff qo‘shish</DialogTitle>
                </DialogHeader>

                {/* Search inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label>PINFL</Label>
                        <Input value={pinfl} onChange={(e) => setPinfl(e.target.value)} placeholder="PINFL..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Passport seria/raqam</Label>
                        <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="AA1234567" />
                    </div>
                    <div className="space-y-2">
                        <Label>Tug‘ilgan sana</Label>
                        <Input type="date" value={brithday} onChange={(e) => setBrithday(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={doSearch} disabled={!canSearch || searching} className="gap-2">
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Qidirish
                    </Button>

                    {found ? (
                        <Badge variant="secondary">Topildi: {found.lastname} {found.firstname}</Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">MSPD’dan tekshirish</span>
                    )}
                </div>

                <Separator />

                {found ? (
                    <div className="space-y-2">
                        <Label>Qaysi qabul (admission) ga qo‘shilsin?</Label>
                        <Select value={admissionUuuid} onValueChange={setAdmissionUuuid}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={loadingAdmissions ? "Yuklanmoqda..." : "Admission tanlang"} />
                            </SelectTrigger>
                            <SelectContent>
                                {admissions.map((a) => (
                                    <SelectItem key={a.uuuid} value={a.uuuid}>
                                        {a.title} ({a.starter_date} — {a.end_date})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedAdmission ? (
                            <p className="text-xs text-muted-foreground">
                                Tanlandi: <b>{selectedAdmission.title}</b>
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {loadingAdmissions ? "Admissionlar yuklanyapti..." : "Admission ro‘yxati bo‘sh yoki tanlanmadi"}
                            </p>
                        )}
                    </div>
                ) : null}

                <Separator />

                {/* Found preview */}
                {found ? (
                    <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-start gap-4">
                            {found.photoBase64 ? (
                                <img
                                    src={`data:image/jpeg;base64,${found.photoBase64}`}
                                    alt="photo"
                                    className="h-20 w-20 rounded-md object-cover border"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-md border flex items-center justify-center text-xs text-muted-foreground">
                                    photo yo‘q
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="text-base font-semibold">
                                    {found.lastname} {found.firstname}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    PINFL: <span className="font-mono">{found.pinfl}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Passport: <span className="font-mono">{found.document}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Tug‘ilgan sana: <span className="font-mono">{found.brithday}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Role + password */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Roleni tanlang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">admin</SelectItem>
                                        <SelectItem value="modirator">modirator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Yangi parol..."
                                    type="password"
                                />
                            </div>
                        </div>

                        {/* allowed IPs */}
                        <div className="space-y-2">
                            <Label>Ruxsat berilgan IP manzillar</Label>
                            <Textarea
                                value={allowedIps}
                                onChange={(e) => setAllowedIps(e.target.value)}
                                placeholder={`Masalan:\n192.168.0.10\n10.10.1.5\n203.0.113.7`}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                IP’larni vergul, bo‘sh joy yoki yangi qatordan ajrating.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" onClick={() => setOpen(false)}>
                                Bekor
                            </Button>
                            <Button onClick={doCreate} disabled={saving || !canCreate} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                Staff qo‘shish
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                        Avval PINFL + passport + tug‘ilgan sanani kiriting va <b>Qidirish</b> bosing.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}