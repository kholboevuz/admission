"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from "next-intl";

import { loginSchema } from "@/schema/schema";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";


type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const t = useTranslations("LoginPage");
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      pinfl: "",
      password: "",
    },
    mode: "onSubmit",
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    try {
      const res = await axiosClient.post("/auth/login", {
        pinfl: data.pinfl,
        password: data.password,
      });

      const payload = res.data;

      if (payload?.success) {
        showToast(payload.message || "Muvaffaqiyatli kirdingiz", ToastType.Success);

        const role = payload?.user?.role; // backend login responseda user.role bor
        if (role === "admin") router.push("/dashboard/admin");
        else router.push("/dashboard/user");

        form.reset();
      } else {
        showToast(payload?.error || payload?.message || "Login failed", ToastType.Error);
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message;

      showToast(
        backendMessage || "Serverda xatolik. Qayta urinib ko‘ring.",
        ToastType.Error
      );
    } finally {
      setLoading(false);
    }
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
              <FieldLabel htmlFor="pinfl">{t("input_field.username")}</FieldLabel>

              <Input
                id="pinfl"
                value={field.value}
                onChange={(e) => {
                  // faqat raqam + 14ta limit
                  const v = e.target.value.replace(/\D/g, "").slice(0, 14);
                  field.onChange(v);
                }}
                aria-invalid={fieldState.invalid}
                placeholder={t("input_field.username-placeholder")}
                autoComplete="off"
                inputMode="numeric"
                maxLength={14}
                disabled={loading}
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
                <FieldLabel htmlFor="password">{t("input_field.password")}</FieldLabel>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  {t("reset-password")}
                </Link>
              </div>

              <Input
                {...field}
                id="password"
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder={t("input_field.password-placeholder")}
                autoComplete="current-password"
                disabled={loading}
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Submit */}
        <Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Kirish..." : t("button-login-with-password")}
          </Button>
        </Field>

        {/* <FieldSeparator>{t("or-conitinu")}</FieldSeparator> */}

        <Field>
          {/* <Button
            variant="outline"
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => {
              window.location.href = "/api/auth/oneid/start";
            }}
          >
            <img src={"/logo/one-id.png"} width={20} height={20} alt="OneID" className="inline-block" />
            {t("buttton-login")}
          </Button>
 */}

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