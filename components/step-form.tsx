"use client";

import * as React from "react";
import {
    Stepper,
    StepperContent,
    StepperIndicator,
    StepperItem,
    StepperList,
    StepperSeparator,
    StepperTrigger,
} from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { ApplicationData, ApplicationStep } from "./steps/ApplicationStep";
import { EssayData, EssayStep } from "./steps/EssayStep";
import { PaymentData, PaymentStep } from "./steps/PaymentStep";
import { ReviewStep } from "./steps/ReviewStep";


const steps = [
    {
        value: "account",
        title: "Arizani rasmiylashtirish",
        description:
            "Talab etilgan barcha ma’lumotlarni to‘liq va aniq kiriting hamda keyingi bosqichga o‘ting.",
    },
    {
        value: "profile",
        title: "Motivatsion esse taqdim etish",
        description:
            "O‘zingiz haqingizda qisqacha ma’lumot bering va belgilangan talablar asosida esse yozing.",
    },
    {
        value: "payment",
        title: "To‘lovni amalga oshirish",
        description:
            "Ariza uchun belgilangan to‘lovni amalga oshiring va to‘lovni tasdiqlang.",
    },
    {
        value: "complete",
        title: "Arizani yakunlash va yuborish",
        description:
            "Kiritilgan ma’lumotlarni qayta ko‘rib chiqing va arizani yakuniy tasdiq uchun yuboring.",
    },
] as const;

type StepValue = (typeof steps)[number]["value"];

function stepIndex(val: StepValue) {
    return steps.findIndex((s) => s.value === val);
}

export type WizardData = {
    application?: ApplicationData;
    essay?: EssayData;
    payment?: PaymentData;
};

export function StepperForm() {
    const [value, setValue] = React.useState<StepValue>("account");

    const [completed, setCompleted] = React.useState<Record<StepValue, boolean>>({
        account: false,
        profile: false,
        payment: false,
        complete: false,
    });

    const [data, setData] = React.useState<WizardData>({});

    const currentIndex = stepIndex(value);
    const isLast = currentIndex === steps.length - 1;

    const handleValueChange = (next: StepValue) => {
        const nextIndex = stepIndex(next);

        const maxAllowedIndex = (() => {
            if (completed.payment) return 3;
            if (completed.profile) return 2;
            if (completed.account) return 1;
            return 0;
        })();

        if (nextIndex <= maxAllowedIndex) setValue(next);
    };

    const goPrev = () => {
        setValue((prev) => steps[Math.max(stepIndex(prev) - 1, 0)]!.value);
    };

    const goNext = () => {
        setValue((prev) => steps[Math.min(stepIndex(prev) + 1, steps.length - 1)]!.value);
    };

    const markDone = (step: StepValue) => {
        setCompleted((p) => ({ ...p, [step]: true }));
    };

    return (
        <div className="w-full">
            <Stepper value={value} onValueChange={(v) => handleValueChange(v as StepValue)}>
                <StepperList className="gap-3 rounded-2xl border bg-card p-4">
                    {steps.map((step, idx) => {
                        const isActive = step.value === value;
                        const isCompleted = completed[step.value];
                        const allowed =
                            idx === 0 ||
                            (idx === 1 && completed.account) ||
                            (idx === 2 && completed.profile) ||
                            (idx === 3 && completed.payment);

                        return (
                            <StepperItem key={step.value} value={step.value} className="flex-1">
                                <div className="flex items-center gap-3">
                                    <StepperTrigger
                                        className={cn(
                                            "group flex items-center gap-3",
                                            !allowed && "opacity-60 cursor-not-allowed"
                                        )}
                                        aria-disabled={!allowed}
                                        onClick={(e) => {
                                            if (!allowed) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }}
                                    >
                                        <StepperIndicator
                                            className={cn(
                                                "grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold transition",
                                                isActive && "border-primary ring-4 ring-primary/10",
                                                isCompleted && "border-primary bg-primary text-primary-foreground",
                                                !isActive && !isCompleted && "bg-background"
                                            )}
                                        >
                                            {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
                                        </StepperIndicator>

                                        <div className="hidden md:flex flex-col text-left leading-tight">
                                            <div
                                                className={cn(
                                                    "text-sm font-semibold",
                                                    isActive ? "text-foreground" : "text-muted-foreground"
                                                )}
                                            >
                                                {step.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{step.description}</div>
                                        </div>
                                    </StepperTrigger>

                                    {idx !== steps.length - 1 && (
                                        <StepperSeparator className="hidden md:block flex-1 opacity-60" />
                                    )}
                                </div>
                            </StepperItem>
                        );
                    })}
                </StepperList>

                {steps.map((step) => (
                    <StepperContent
                        key={step.value}
                        value={step.value}
                        className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm"
                    >
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-semibold">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>

                        {/* Step body: har biri alohida form */}
                        {step.value === "account" && (
                            <ApplicationStep
                                defaultValues={data.application}
                                onNext={(payload) => {
                                    setData((p) => ({ ...p, application: payload }));
                                    markDone("account");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "profile" && (
                            <EssayStep
                                defaultValues={data.essay}
                                onBack={goPrev}
                                onNext={(payload) => {
                                    setData((p) => ({ ...p, essay: payload }));
                                    markDone("profile");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "payment" && (
                            <PaymentStep
                                defaultValues={data.payment}
                                onBack={goPrev}
                                onNext={(payload) => {
                                    setData((p) => ({ ...p, payment: payload }));
                                    markDone("payment");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "complete" && (
                            <ReviewStep
                                data={data}
                                onBack={goPrev}
                                onSubmit={() => {

                                }}
                            />
                        )}

                        {!isLast ? null : null}
                    </StepperContent>
                ))}
            </Stepper>
        </div>
    );
}
