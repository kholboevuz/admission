"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { Button } from "@/components/ui/button"

import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useTranslations } from "next-intl"
import Link from "next/link"

const formSchema = z.object({
    pinfl: z.string().min(14, "PINFL must be exactly 14 characters.").max(14, "PINFL must be exactly 14 characters."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(100, "Password must be at most 100 characters."),
})

export function SignForm() {
    const t = useTranslations('LoginPage');
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            pinfl: "",
            password: "",
        },
    })

    function onSubmit(data: z.infer<typeof formSchema>) {
        toast("You submitted the following values:", {
            description: (
                <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
                    <code>{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
            position: "bottom-right",
            classNames: {
                content: "flex flex-col gap-2",
            },
            style: {
                "--border-radius": "calc(var(--radius)  + 4px)",
            } as React.CSSProperties,
        })
    }

    return (

        <form id="form-rhf-demo" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="pt-3">
                <Controller
                    name="pinfl"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="form-rhf-demo-pinfl">
                                {t("input_field.username")}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="form-rhf-demo-pinfl"
                                aria-invalid={fieldState.invalid}
                                placeholder={t("input_field.username-placeholder")}
                                autoComplete="off"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

            </FieldGroup>
            <FieldGroup>
                <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="form-rhf-demo-password">
                                {t("input_field.password")}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="form-rhf-demo-password"
                                aria-invalid={fieldState.invalid}
                                placeholder={t("input_field.password-placeholder")}
                                autoComplete="off"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

            </FieldGroup>
            <Button type="submit" className="w-full">
                {t("button")}
            </Button>
            <p>Ro‘yxatdan o‘tmaganmisiz? <Link href="/auth/signup" className="t">Ro‘yxatdan o‘tish</Link></p>
        </form>

    )
}
