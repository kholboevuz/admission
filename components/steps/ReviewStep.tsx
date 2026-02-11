"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { WizardData } from "../step-form";


type Props = {
    data: WizardData;
    onBack: () => void;
    onSubmit: () => void;
};

export function ReviewStep({ data, onBack, onSubmit }: Props) {
    const a = data.application;
    const e = data.essay;

    return (
        <div className="mt-5 space-y-6">
            <div className="rounded-xl border bg-background p-4">
                <h4 className="font-semibold">Ariza ma’lumotlari</h4>
                <div className="mt-3 grid gap-2 text-sm">
                    <div><span className="text-muted-foreground">Telefon:</span> {a?.phone ?? "-"}</div>
                    <div><span className="text-muted-foreground">Qo‘shimcha telefon:</span> {a?.phoneExtra ?? "-"}</div>
                    <div><span className="text-muted-foreground">Email:</span> {a?.email ?? "-"}</div>
                    <div><span className="text-muted-foreground">Yo‘nalish:</span> {a?.educationDirection ?? "-"}</div>
                    <div>
                        <span className="text-muted-foreground">Sertifikat:</span>{" "}
                        {a?.hasCertificate === "yes" ? "Bor" : "Yo‘q"}
                    </div>
                    {a?.hasCertificate === "yes" ? (
                        <div>
                            <span className="text-muted-foreground">Fayl:</span>{" "}
                            {a?.certificateFile?.name ?? "-"}
                        </div>
                    ) : (
                        <div>
                            <span className="text-muted-foreground">Imtihon tili:</span>{" "}
                            {a?.examLanguage === "en"
                                ? "Ingliz"
                                : a?.examLanguage === "de"
                                    ? "Nemis"
                                    : a?.examLanguage === "fr"
                                        ? "Fransuz"
                                        : "-"}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border bg-background p-4">
                <h4 className="font-semibold">Esse</h4>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {e?.essay ?? "-"}
                </p>
            </div>

            <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
                    Oldingi
                </Button>
                <Button type="button" className="rounded-xl" onClick={onSubmit}>
                    Arizani yuborish
                </Button>
            </div>
        </div>
    );
}
