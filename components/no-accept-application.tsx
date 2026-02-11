"use client";

import * as React from "react";
import { FolderX } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    title?: string;
    description?: string;
    className?: string;
    action?: React.ReactNode;
};

export default function SubmissionClosed({
    title = "Hujjatlarni qabul qilish yopiq",
    description = "Hozirda hujjatlarni qabul qilish yopilgan. Iltimos, yangiliklardan bexabar bo‘lmaslik uchun veb-saytimizni kuzatib boring.",
    className,
    action,
}: Props) {
    return (
        <div
            className={cn(
                "w-full min-h-[60vh] flex items-center justify-center px-4",
                className
            )}
        >
            <div className="w-full max-w-2xl text-center">
                {/* Icon area */}
                <div className="mx-auto mb-5 grid place-items-center">
                    <div className="relative">
                        {/* soft papers behind */}
                        <div className="absolute -top-3 -left-10 h-14 w-20 rotate-[-18deg] rounded-lg bg-muted/40 border" />
                        <div className="absolute -top-4 left-2 h-14 w-20 rotate-[12deg] rounded-lg bg-muted/30 border" />

                        {/* main icon bubble */}
                        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-rose-500/15 border border-rose-500/20 shadow-sm">
                            <FolderX className="h-10 w-10 text-rose-500" />
                        </div>
                    </div>
                </div>

                {/* Text */}
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    {title}
                </h2>
                <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                    {description}
                </p>

                {/* Optional action */}
                {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
            </div>
        </div>
    );
}
