"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type AdmissionItem = {
    uuuid: string;
    title: string;
    starter_date: string;
    end_date: string;
    status: boolean;
};

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
    admissionUuuid?: string;
    createdAt: string;
};

type Props = {
    trigger: React.ReactNode;
    staff: StaffRow;
    onUpdated?: () => void;
};

export default function StaffEditDialog({ trigger, staff, onUpdated }: Props) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<"admin" | "modirator">(staff.role);
    const [password, setPassword] = useState("");
    const [allowedIps, setAllowedIps] = useState((staff.allowedIps || []).join("\n"));

    const [admissions, setAdmissions] = useState<AdmissionItem[]>([]);
    const [admissionUuuid, setAdmissionUuuid] = useState<string>(staff.admissionUuuid || "");
    const [loadingAdmissions, setLoadingAdmissions] = useState(false);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setRole(staff.role);
        setPassword("");
        setAllowedIps((staff.allowedIps || []).join("\n"));
        setAdmissionUuuid(staff.admissionUuuid || "");
    }, [open, staff]);

    useEffect(() => {
        if (!open) return;

        (async () => {
            setLoadingAdmissions(true);
            try {
                const res = await axiosClient.get("/admin/admission");
                if (res.data?.success) {
                    const list: AdmissionItem[] = res.data.data || [];
                    setAdmissions(list);
                    if (!admissionUuuid && list.length > 0) setAdmissionUuuid(list[0].uuuid);
                } else {
                    setAdmissions([]);
                    showToast(res.data?.message || "Admission ro‘yxatini olib bo‘lmadi", ToastType.Warning);
                }
            } catch (e: any) {
                setAdmissions([]);
                showToast(e?.message || "Admission list server error", ToastType.Error);
            } finally {
                setLoadingAdmissions(false);
            }
        })();
    }, [open]);

    const selectedAdmission = useMemo(
        () => admissions.find((a) => a.uuuid === admissionUuuid) || null,
        [admissions, admissionUuuid]
    );

    const doUpdate = async () => {
        setSaving(true);
        try {
            const res = await axiosClient.patch("/admin/staff/update", {
                id: staff._id,
                role,
                password: password.trim() || undefined,
                allowedIps,
                admissionUuuid,
            });

            if (res.data?.success) {
                showToast(res.data?.message || "Yangilandi", ToastType.Success);
                setOpen(false);
                onUpdated?.();
            } else {
                showToast(res.data?.message || "Xatolik yuz berdi", ToastType.Error);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Server error";
            showToast(msg, ToastType.Error);
        } finally {
            setSaving(false);
        }
    };

    const canSave = !!role && !!admissionUuuid;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>Staff tahrirlash</DialogTitle>
                </DialogHeader>

                <div className="rounded-lg border p-4 space-y-3">
                    <div className="space-y-1">
                        <div className="text-base font-semibold">
                            {staff.lastname} {staff.firstname}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            PINFL: <span className="font-mono">{staff.pinfl}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Passport: <span className="font-mono">{staff.document}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Tug‘ilgan sana: <span className="font-mono">{staff.brithday}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Qaysi qabul (admission) ga bog‘langan?</Label>
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
                                {loadingAdmissions ? "Admissionlar yuklanyapti..." : "Admission tanlanmadi"}
                            </p>
                        )}
                    </div>

                    <Separator />

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
                            <Label>Yangi password</Label>
                            <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Bo‘sh qoldirsangiz o‘zgarmaydi"
                                type="password"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Ruxsat berilgan IP manzillar</Label>
                        <Textarea
                            value={allowedIps}
                            onChange={(e) => setAllowedIps(e.target.value)}
                            placeholder={`Masalan:\n192.168.0.10\n10.10.1.5\n203.0.113.7`}
                            rows={5}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>
                            Bekor
                        </Button>
                        <Button onClick={doUpdate} disabled={saving || !canSave} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Saqlash
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}