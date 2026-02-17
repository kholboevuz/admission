"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { WizardData } from "../step-form";
import { cn } from "@/lib/utils";
import { Download, ExternalLink } from "lucide-react";

type Admission = {
    choices: { id: string; name: string }[];
};

type Props = {
    admission: Admission;
    data: WizardData;
    onBack: () => void;
    onConfirm: () => void;
};

function langLabel(v?: string) {
    if (v === "en") return "Ingliz";
    if (v === "de") return "Nemis";
    if (v === "fr") return "Fransuz";
    return "-";
}

function fileNameFromPath(p?: string) {
    if (!p) return "";
    try {
        const s = p.split("?")[0] || p;
        return decodeURIComponent(s.split("/").pop() || "");
    } catch {
        return String(p);
    }
}

export function ReviewStep({ admission, data, onBack, onConfirm }: Props) {
    const a = data.application;
    const e = data.essay;

    const [agree, setAgree] = React.useState(false);

    const directionName =
        admission.choices?.find((x) => x.id === a?.educationDirection)?.name ?? "-";

    const certPath = a?.certificatePath;

    return (
        <div className="mt-5 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-background p-5">
                    <h4 className="text-base font-semibold">Ariza ma’lumotlari</h4>
                    <div className="mt-3 grid gap-2 text-sm">
                        <Row k="Telefon" v={a?.phone ?? "-"} />
                        <Row k="Qo‘shimcha telefon" v={a?.phoneExtra ?? "-"} />
                        <Row k="Email" v={a?.email ?? "-"} />
                        <Row k="Yo‘nalish" v={directionName} />
                        <Row k="Sertifikat" v={a?.hasCertificate === "yes" ? "Bor" : "Yo‘q"} />

                        {a?.hasCertificate === "yes" ? (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Sertifikat fayli:</span>

                                {certPath ? (
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={certPath}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                                            title={fileNameFromPath(certPath)}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Ko‘rish
                                        </a>

                                        <a
                                            href={certPath}
                                            download
                                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                                            title={fileNameFromPath(certPath)}
                                        >
                                            <Download className="h-4 w-4" />
                                            Yuklab olish
                                        </a>
                                    </div>
                                ) : (
                                    <span className="font-medium text-right">-</span>
                                )}
                            </div>
                        ) : (
                            <Row k="Imtihon tili" v={langLabel(a?.examLanguage)} />
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border bg-background p-5">
                    <h4 className="text-base font-semibold">Motivatsion esse</h4>
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {e?.essay ?? "-"}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border bg-card p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={agree}
                        onChange={(ev) => setAgree(ev.target.checked)}
                    />
                    <div className="text-sm">
                        <p className="font-medium">Kiritilgan ma’lumotlar to‘g‘ri ekanligini tasdiqlayman.</p>
                        <p className="text-muted-foreground">
                            Tasdiqlagandan so‘ng, keyingi bosqichda to‘lovni amalga oshirasiz.
                        </p>
                    </div>
                </label>
            </div>

            <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
                    Oldingi
                </Button>
                <Button type="button" className={cn("rounded-xl")} onClick={onConfirm} disabled={!agree}>
                    To‘lov bosqichiga o‘tish
                </Button>
            </div>
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{k}:</span>
            <span className="font-medium text-right">{v}</span>
        </div>
    );
}
