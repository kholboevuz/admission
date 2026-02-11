"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PaymentData = {
    confirmed: boolean;
};

type Props = {
    amount?: number;
    defaultValues?: Partial<PaymentData>;
    onBack: () => void;
    onNext: (data: PaymentData) => void;
};

function formatUZS(n: number) {
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${s} so'm`;
}

export function PaymentStep({
    amount = 206_000,
    defaultValues,
    onBack,
    onNext,
}: Props) {

    return (
        <div className="mt-6 space-y-6">

            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                {/* subtle background */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.15),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.14),transparent_40%)]" />

                <div className="relative p-5 sm:p-6">

                    {/* Left: brand + info */}
                    <div className="flex justify-between max-lg:flex-col max-lg:gap-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-background">
                                <Image
                                    src="/logo/click.png"
                                    alt="Click"
                                    width={80}
                                    height={80}
                                    className="object-contain"
                                    priority
                                />
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
                                <span className="text-xs text-muted-foreground">
                                    To‘lovdan so‘ng “Keyingi” tugmasi orqali davom eting.
                                </span>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">To‘lov summasi</p>
                                    <p className="text-2xl font-bold tracking-tight max-lg:text-lg">
                                        {formatUZS(amount)}
                                    </p>
                                </div>

                                <Button className="max-lg:text-sm">To'lov qilish</Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
                    Oldingi
                </Button>

                <Button
                    type="button"
                    className={cn("rounded-xl")}
                    disabled
                >
                    Keyingi
                </Button>
            </div>
        </div>
    );
}
