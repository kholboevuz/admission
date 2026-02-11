import * as z from "zod"

export const loginSchema = z.object({
    pinfl: z.string().length(14, "PINFL must be exactly 14 characters long"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
})

export const registerSchema = z
    .object({
        pinfl: z
            .string()
            .regex(/^\d{14}$/, "PINFL must consist of exactly 14 digits"),

        document: z
            .string()
            .regex(
                /^[A-Z]{2}\d{7}$/,
                "Passport series must be 2 uppercase letters followed by 7 digits (e.g. AA1234567)"
            ),

        birthDate: z
            .string()
            .refine((date) => {
                const parsed = new Date(date);
                const today = new Date();

                return (
                    !isNaN(parsed.getTime()) && parsed < today
                );
            }, {
                message: "Birth date must be a valid date and cannot be in the future",
            }),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters long"),

        confirmPassword: z
            .string()
            .min(6, "Confirm Password must be at least 6 characters long"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });