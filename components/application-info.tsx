"use client";

import * as React from "react";
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
import { axiosClient } from "@/http/axios";
import { Loader2, Paperclip } from "lucide-react";

type Props = {
    button: string;
    title: string;
    application_id: string;
};

type ApiResp = {
    success: boolean;
    data: null | {
        application_id: string;
        moderator_pinfl: string;
        comment: string;
        files: string[];
        date: string;
        updatedAt: string;
        createdAt: string;
    };
};

export function ApplicationInfo({ button, title, application_id }: Props) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<ApiResp["data"]>(null);
    const [err, setErr] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await axiosClient.get<ApiResp>(
                `/user/application/get-info?application_id=${encodeURIComponent(application_id)}`
            );
            if (!res.data?.success) {
                setData(null);
                setErr("Ma'lumot topilmadi");
            } else {
                setData(res.data.data);
            }
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.response?.data?.message || "Server xatoligi");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [application_id]);

    React.useEffect(() => {
        if (open) load();
    }, [open, load]);

    const fmt = (iso?: string) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString("uz-UZ", {
            year: "numeric",
            month: "long",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const fileName = (urlOrName: string) => {
        try {
            const u = new URL(urlOrName, typeof window !== "undefined" ? window.location.origin : "http://localhost");
            return u.searchParams.get("name") || urlOrName.split("/").pop() || urlOrName;
        } catch {
            return urlOrName.split("/").pop() || urlOrName;
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline">{button}</Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="w-[95vw] max-w-lg sm:max-w-xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Moderatorning eng oxirgi izohi va biriktirilgan hujjatlar (agar mavjud bo‘lsa).
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="mt-3 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : err ? (
                        <div className="rounded-xl border bg-red-50 p-3 text-sm text-red-700">{err}</div>
                    ) : !data ? (
                        <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                            Hozircha izoh mavjud emas.
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-muted-foreground">Sana</p>
                                    <p className="text-xs font-medium">{fmt(data.date)}</p>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Izoh</p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm">{data.comment}</p>
                                </div>
                            </div>

                            {Array.isArray(data.files) && data.files.length > 0 && (
                                <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                        <Paperclip className="h-4 w-4" />
                                        Biriktirilgan fayl(lar)
                                    </div>
                                    <div className="space-y-2">
                                        {data.files.map((f, idx) => (
                                            <a
                                                key={idx}
                                                href={f}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                                            >
                                                {fileName(f)}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel>Yopish</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}