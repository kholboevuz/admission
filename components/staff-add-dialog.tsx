"use client";
import { useMemo, useState } from "react";

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

    const [saving, setSaving] = useState(false);

    const canSearch = pinfl.trim().length >= 10 && document.trim().length >= 5 && brithday.trim().length >= 8;

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

        setSaving(true);
        try {
            const res = await axiosClient.post("/admin/staff/create", {
                pinfl: found.pinfl,
                document: found.document,
                brithday: found.brithday,
                role,
                password,
                allowedIps,
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

                onCreated?.();
            } else {
                showToast(res.data?.message || "Xatolik yuz berdi", ToastType.Error);
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "Server error";

            showToast(msg, ToastType.Error);
            console.error("Create error:", err?.response?.data || err);
        } finally {
            setSaving(false);
        }
    };
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
                        <Input
                            type="date"
                            value={brithday}
                            onChange={(e) => setBrithday(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={doSearch} disabled={!canSearch || searching} className="gap-2">
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Qidirish
                    </Button>

                    {found ? (
                        <Badge variant="secondary">
                            Topildi: {found.lastname} {found.firstname}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">MSPD’dan tekshirish</span>
                    )}
                </div>

                <Separator />

                {/* Found preview */}
                {found ? (
                    <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-start gap-4">
                            {found.photoBase64 ? (
                                // base64 jpeg bo‘lishi mumkin; agar format aniq bo‘lmasa ham ishlaydi
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

                        {/* Role + password + allowed IPs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                                    <SelectTrigger>
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
                            <Button onClick={doCreate} disabled={saving || !password.trim()} className="gap-2">
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