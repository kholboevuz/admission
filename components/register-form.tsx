"use client";

import * as React from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field";

import { registerSchema } from "@/schema/schema";
import Link from "next/link";

type FormValues = z.infer<typeof registerSchema>;

export function RegisterForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const t = useTranslations("LoginPage");

    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            pinfl: "",
            document: "",
            birthDate: "",
            password: "",
            confirmPassword: "",
        },
        mode: "onChange",
    });

    async function onSubmit(data: FormValues) {
        setServerError(null);
        setLoading(true);
        try {
            console.log("register payload:", data);

        } catch (e) {
            setServerError("Serverda xatolik. Qayta urinib ko‘ring.");
        } finally {
            setLoading(false);
        }
    }

    const isDisabled = loading || !form.formState.isValid;

    return (
        <form
            className={cn("flex flex-col gap-6", className)}
            onSubmit={form.handleSubmit(onSubmit)}
            {...props}
        >
            <FieldGroup>
                {/* Header */}
                <div className="flex flex-col items-center gap-2 text-center">
                    <Image src={"/logo/logo-dark.svg"} alt="Logo" width={84} height={84} priority />
                    <h1 className="text-base md:text-lg font-semibold leading-snug">
                        {t("logo-name")}
                    </h1>
                    <p className="text-muted-foreground text-sm text-balance">{t("subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* PINFL */}
                    <Controller
                        name="pinfl"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="md:col-span-1">
                                <FieldLabel htmlFor="pinfl">{t("input_field.username")}</FieldLabel>
                                <Input
                                    id="pinfl"
                                    value={field.value}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                                        field.onChange(digits);
                                    }}
                                    placeholder={t("input_field.username-placeholder")}
                                    inputMode="numeric"
                                    enterKeyHint="next"
                                    autoComplete="off"
                                    aria-invalid={fieldState.invalid}
                                    maxLength={14}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                        )}
                    />

                    {/* Passport */}
                    <Controller
                        name="document"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="md:col-span-1">
                                <FieldLabel htmlFor="document">{t("document")}</FieldLabel>
                                <Input
                                    id="document"
                                    value={field.value}
                                    onChange={(e) => {
                                        const v = e.target.value
                                            .toUpperCase()
                                            .replace(/[^A-Z0-9]/g, "")
                                            .slice(0, 9);
                                        field.onChange(v);
                                    }}
                                    placeholder="AA1234567"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    inputMode="text"
                                    enterKeyHint="next"
                                    aria-invalid={fieldState.invalid}
                                    maxLength={9}
                                />

                            </Field>
                        )}
                    />

                    {/* Birth date */}
                    <Controller
                        name="birthDate"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                                <FieldLabel htmlFor="birthDate">{t("brth-date")}</FieldLabel>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    aria-invalid={fieldState.invalid}
                                />

                            </Field>
                        )}
                    />
                </div>

                {/* ✅ Parollar ham yonma-yon (md+) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Password */}
                    <Controller
                        name="password"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="password">{t("input_field.password")}</FieldLabel>

                                <div className="relative">
                                    <Input
                                        {...field}
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t("input_field.password-placeholder")}
                                        autoComplete="new-password"
                                        enterKeyHint="next"
                                        aria-invalid={fieldState.invalid}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>


                            </Field>
                        )}
                    />

                    {/* Confirm password */}
                    <Controller
                        name="confirmPassword"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="confirmPassword">{t("confirm-password")}</FieldLabel>

                                <div className="relative">
                                    <Input
                                        {...field}
                                        id="confirmPassword"
                                        type={showConfirm ? "text" : "password"}
                                        placeholder={t("placeholder-confirm-password")}
                                        autoComplete="new-password"
                                        enterKeyHint="done"
                                        aria-invalid={fieldState.invalid}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                                        aria-label={showConfirm ? "Hide password" : "Show password"}
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                            </Field>
                        )}
                    />
                </div>

                {/* Submit */}
                <Field>
                    <Button type="submit" className="w-full" disabled={isDisabled}>
                        {t("register")}
                    </Button>
                </Field>

                <FieldSeparator>{t("or-conitinu")}</FieldSeparator>


                <Field>
                    <Button variant="outline" type="button" className="w-full">
                        {t("buttton-login")}
                    </Button>

                    <FieldDescription className="text-center">
                        {t("login-yes")} {" "}
                        <Link href="/auth/login" className="underline underline-offset-4">
                            {t("button")}
                        </Link>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    );
}
