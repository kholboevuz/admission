"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
    admissionId: string;
    amount?: number;
    onBack: () => void;
    onPaid: () => void;
    onLoad: () => void;
};

function formatUZS(n: number) {
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${s} so'm`;
}

function PaymentSkeleton() {
    return (
        <div className="mt-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.10),transparent_40%)]" />
                <div className="relative p-5 sm:p-6">
                    <div className="flex justify-between max-lg:flex-col max-lg:gap-5">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-24 w-24 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-40" />
                            </div>
                        </div>

                        <div className="w-full max-w-[440px] rounded-xl border bg-background/60 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-3 w-56" />
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-3">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-8 w-36" />
                                </div>
                                <Skeleton className="h-10 w-32 rounded-lg" />
                            </div>

                            <div className="mt-3">
                                <Skeleton className="h-3 w-44" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 space-y-2">
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-52" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-44 rounded-xl" />
            </div>
        </div>
    );
}

export function PaymentStep({ admissionId, amount = 206_000, onBack, onPaid, onLoad }: Props) {
    const [loading, setLoading] = React.useState(false);
    const [checking, setChecking] = React.useState(true);
    const [paymentUrl, setPaymentUrl] = React.useState<string | null>(null);
    const [paid, setPaid] = React.useState(false);

    const onPaidRef = React.useRef(onPaid);
    React.useEffect(() => {
        onPaidRef.current = onPaid;
    }, [onPaid]);

    React.useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!admissionId) {
                setChecking(false);
                return;
            }

            try {
                setChecking(true);

                const res = await axiosClient.get("/user/application/payment/status", {
                    params: { admission_id: admissionId },
                    withCredentials: true,
                });

                const ok = !!res.data?.success;
                if (!ok) throw new Error("status failed");

                const isPaid = !!res.data?.data?.payment_status;
                if (cancelled) return;

                setPaid(isPaid);

                if (isPaid) {
                    setPaymentUrl(null);
                    onPaidRef.current?.();
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) setChecking(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [admissionId]);

    const initPayment = async () => {
        try {
            if (paid) return;

            setLoading(true);
            const res = await axiosClient.post(
                "/user/application/payment/init",
                { admission_id: admissionId, amount },
                { withCredentials: true }
            );

            const url = res.data?.data?.paymentUrl as string | undefined;
            if (!res.data?.success || !url) throw new Error("payment init failed");

            setPaymentUrl(url);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
            console.error(e);
            showToast("To‘lovni boshlashda xatolik", ToastType.Error);
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async () => {
        try {
            if (paid) return;

            setLoading(true);
            const res = await axiosClient.post(
                "/user/application/payment/confirm",
                { admission_id: admissionId },
                { withCredentials: true }
            );

            const ok = !!res.data?.success && !!res.data?.data?.payment_status;
            if (!ok) throw new Error("confirm failed");

            setPaid(true);
            setPaymentUrl(null);
            onPaidRef.current?.();
            showToast("To‘lov tasdiqlandi", ToastType.Success);
        } catch (e) {
            console.error(e);
            showToast("To‘lov tasdiqlanmadi (yoki hali tushmagan).", ToastType.Error);
        } finally {
            setLoading(false);
        }
    };

    const submitApplication = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.post(
                "/user/application/submit",
                { admission_id: admissionId },
                { withCredentials: true }
            );

            const ok = !!res.data?.success && !!res.data?.data?.payment_status;
            if (!ok) throw new Error("confirm failed");

            setPaid(true);
            setPaymentUrl(null);
            onPaidRef.current?.();
            showToast("Ariza muvaffaqiyatli topshirildi", ToastType.Success);
        } catch (e) {
            console.error(e);
            showToast("Ariza topshirilmadi (yoki hali tasdiqlanmagan).", ToastType.Error);
        } finally {
            setLoading(false);
            onLoad();
        }
    };

    if (checking) return <PaymentSkeleton />;

    return (
        <div className="mt-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.15),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.14),transparent_40%)]" />
                <div className="relative p-5 sm:p-6">
                    <div className="flex justify-between max-lg:flex-col max-lg:gap-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-background">
                                <Image src="/logo/click.png" alt="Click" width={80} height={80} className="object-contain" priority />
                            </div>
                            <div className="leading-tight">
                                <p className="text-sm text-muted-foreground">To‘lov usuli</p>
                                <p className="font-semibold">Click orqali to‘lov</p>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-background/60 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                                    Yarim BHM
                                </span>
                                <span className="text-xs text-muted-foreground">To‘lovdan so‘ng “Tasdiqlash” tugmasini bosing.</span>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">To‘lov summasi</p>
                                    <p className="text-2xl font-bold tracking-tight max-lg:text-lg">{formatUZS(amount)}</p>
                                </div>

                                {paid ? (
                                    <Button disabled className="opacity-100">
                                        To‘lov qilingan
                                    </Button>
                                ) : (
                                    <Button onClick={initPayment} disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "To'lov qilish"}
                                    </Button>
                                )}
                            </div>

                            {!paid && paymentUrl ? (
                                <p className="mt-2 text-xs text-muted-foreground">To‘lov oynasi ochilmasa, qayta bosing.</p>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onBack} disabled={loading}>
                    Oldingi
                </Button>
                {paid ? (
                    <Button type="button" variant="default" className="rounded-xl" onClick={submitApplication} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Arizani yuborish"}
                    </Button>
                ) : (
                    <Button type="button" onClick={confirmPayment} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "To'lovni tekshirish"}
                    </Button>
                )}
            </div>
        </div>
    );
}
