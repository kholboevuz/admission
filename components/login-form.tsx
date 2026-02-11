"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { loginSchema } from "@/schema/schema";
import Link from "next/link";

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const t = useTranslations("LoginPage");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      pinfl: "",
      password: "",
    },
    mode: "onSubmit",
  });

  function onSubmit(data: LoginFormValues) {
    console.log("login payload:", data);
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <Image
            src={"/logo/logo-dark.svg"}
            alt="Logo"
            width={100}
            height={100}
            priority
          />
          <h1 className="text-lg font-semibold">{t("logo-name")}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {t("subtitle")}
          </p>
        </div>

        {/* PINFL */}
        <Controller
          name="pinfl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pinfl">
                {t("input_field.username")}
              </FieldLabel>
              <Input
                {...field}
                id="pinfl"
                aria-invalid={fieldState.invalid}
                placeholder={t("input_field.username-placeholder")}
                autoComplete="off"
                inputMode="numeric"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">
                  {t("input_field.password")}
                </FieldLabel>
                <a
                  href="#"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  {t("reset-password")}
                </a>
              </div>

              <Input
                {...field}
                id="password"
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder={t("input_field.password-placeholder")}
                autoComplete="current-password"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Submit */}
        <Field>
          <Button type="submit" className="w-full">
            {t("button-login-with-password")}
          </Button>
        </Field>

        <FieldSeparator>{t("or-conitinu")}</FieldSeparator>


        <Field>
          <Button variant="outline" type="button" className="w-full">
            {t("buttton-login")}
          </Button>

          <FieldDescription className="text-center">
            {t("no-register")}{" "}
            <Link href="/auth/register" className="underline underline-offset-4">
              {t("register")}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
