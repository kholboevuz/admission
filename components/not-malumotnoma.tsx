"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Props = {
    title?: string;
    description?: string;
    className?: string;
    action?: React.ReactNode;
};

export default function MalumotnomaRequiredSimple({
    title = "Ma’lumotnoma to‘ldirilmagan",
    description = "Arizani davom ettirish uchun avval ma’lumotnoma (obyektivka) bo‘limini to‘ldiring.",
    className,
    action,
}: Props) {
    return (
        <div className={cn("w-full min-h-[60vh] flex items-center justify-center px-4", className)}>
            <div className="w-full max-w-2xl text-center">

                <div className="mx-auto mb-5 grid place-items-center">
                    <div className="relative">

                        <div className="absolute -top-3 -left-10 h-14 w-20 rotate-[-18deg] rounded-lg bg-muted/40 border" />
                        <div className="absolute -top-4 left-2 h-14 w-20 rotate-[12deg] rounded-lg bg-muted/30 border" />

                        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-sky-500/15 border border-sky-500/20 shadow-sm">
                            <FileText className="h-10 w-10 text-sky-600" />
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
                <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>

                <div className="mt-6 flex justify-center">
                    <Image src={'/assets/info.png'} alt="Info" width={500} height={200} className="mx-auto mb-4 border p-3 border-red-500 rounded-b-lg shadow-2xl shadow-red-500/10" />
                </div>

            </div>
        </div>
    );
}
