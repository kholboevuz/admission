"use client";

import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
    trigger?: ReactNode;
    defaultOpen?: boolean;
    align?: "start" | "center" | "end";
};

type LangKey = "uz" | "ru" | "en" | "kaa";

const LANGS: { value: LangKey; label: string; flagSrc: string }[] = [
    { value: "uz", label: "O‘zbek", flagSrc: "/flag/uz.svg" },
    { value: "ru", label: "Русский", flagSrc: "/flag/ru.svg" },
    { value: "en", label: "English", flagSrc: "/flag/en.svg" },
    { value: "kaa", label: "Qaraqalpaq", flagSrc: "/flag/kaa.svg" },
];

const LOCALES: LangKey[] = ["uz", "ru", "en", "kaa"];

function getCookie(name: string): string | undefined {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie.match(
        new RegExp(
            "(^| )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]+)"
        )
    );
    return match ? decodeURIComponent(match[2]) : undefined;
}

export default function LanguageDropdown({
    defaultOpen,
    align = "end",
    trigger,
}: Props) {
    const router = useRouter();
    const [language, setLanguage] = useState<LangKey>("uz");
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const cookieLocale = getCookie("locale") as LangKey | undefined;
        if (cookieLocale && LOCALES.includes(cookieLocale)) {
            setLanguage(cookieLocale);
        }
    }, []);

    const current = useMemo(
        () => LANGS.find((l) => l.value === language) ?? LANGS[0],
        [language]
    );

    async function onChange(next: string) {
        const nextLocale = next as LangKey;
        if (!LOCALES.includes(nextLocale) || nextLocale === language) return;

        // UI darhol o‘zgarib tursin
        setLanguage(nextLocale);

        setPending(true);
        try {
            await fetch("/api/locale", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locale: nextLocale }),
            });

            router.refresh();
        } finally {
            setPending(false);
        }
    }

    return (
        <DropdownMenu defaultOpen={defaultOpen}>
            <DropdownMenuTrigger asChild>
                {trigger ? (
                    trigger
                ) : (

                    <button
                        type="button"
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-60"
                    >
                        <Image
                            src={current.flagSrc}
                            alt={current.label}
                            width={20}
                            height={20}
                            className="rounded-sm"
                        />
                        <span className="font-medium">{current.label}</span>
                    </button>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align={align}>

                <DropdownMenuRadioGroup value={language} onValueChange={onChange}>
                    {LANGS.map((l) => (
                        <DropdownMenuRadioItem
                            key={l.value}
                            value={l.value}
                            className="pl-2 text-base data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground [&>span:first-child]:hidden"
                            disabled={pending}
                        >
                            <span className="mr-2 inline-flex w-6 justify-center">
                                <Image
                                    src={l.flagSrc}
                                    alt={l.label}
                                    width={18}
                                    height={18}
                                    className="rounded-sm"
                                />
                            </span>
                            <span>{l.label}</span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
