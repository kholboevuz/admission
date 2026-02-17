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
import { PaymentStep } from "./steps/PaymentStep";
import { ReviewStep } from "./steps/ReviewStep";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type Admission = {
    _id: string;
    title: string;
    starter_date: string;
    end_date: string;
    admission_type: { id: string; name: string }[];
    choices: { id: string; name: string }[];
    uuuid: string;
    status: boolean;
};

type ExistingApp = {
    admission_id: string;
    step: number;
    step_1?: any;
    esse?: string;
    payment_status?: boolean;
    application_status?: string;
};

const steps = [
    {
        value: "account",
        title: "Arizani rasmiylashtirish",
        description: "Talab etilgan barcha ma’lumotlarni to‘liq va aniq kiriting hamda keyingi bosqichga o‘ting.",
    },
    {
        value: "profile",
        title: "Motivatsion esse taqdim etish",
        description: "O‘zingiz haqingizda qisqacha ma’lumot bering va belgilangan talablar asosida esse yozing.",
    },
    {
        value: "review",
        title: "Ma’lumotlarni tasdiqlash",
        description: "Kiritilgan ma’lumotlarni tekshiring va tasdiqlang. Keyin to‘lov bosqichiga o‘tasiz.",
    },
    {
        value: "payment",
        title: "To‘lovni amalga oshirish",
        description: "Ariza uchun belgilangan to‘lovni amalga oshiring va to‘lovni tasdiqlang.",
    },
] as const;

type StepValue = (typeof steps)[number]["value"];

function stepIndex(val: StepValue) {
    return steps.findIndex((s) => s.value === val);
}

export type WizardData = {
    application?: ApplicationData;
    essay?: EssayData;
};

type Props = {
    admission: Admission;
    existing: ExistingApp | null;
    onLoad: () => void;
};

function mapExistingToWizard(existing: ExistingApp | null): WizardData {
    const step1 = existing?.step_1;

    return {
        application: step1
            ? {
                phone: step1.phone_number ?? "",
                phoneExtra: step1.phone_number_additional ?? "",
                email: step1.email ?? "",
                educationDirection: step1.choice?.id ?? "",
                hasCertificate: step1.isCertified ? "yes" : "no",
                examLanguage: step1.exam_language ?? "en",
                certificateFile: undefined,
                certificatePath: step1.certificate_file ?? undefined, // ✅ MUHIM
            }
            : undefined,
        essay: existing?.esse ? { essay: existing.esse } : undefined,
    };
}

export function StepperForm({ admission, existing, onLoad }: Props) {
    const initialStep: StepValue = React.useMemo(() => {
        const s = Number(existing?.step ?? 1);
        if (s <= 1) return "account";
        if (s === 2) return "profile";
        if (s === 3) return "review";
        return "payment";
    }, [existing?.step]);

    const [value, setValue] = React.useState<StepValue>(initialStep);

    const [data, setData] = React.useState<WizardData>(() => mapExistingToWizard(existing));

    React.useEffect(() => {
        setData(mapExistingToWizard(existing));
    }, [existing]);

    const [completed, setCompleted] = React.useState<Record<StepValue, boolean>>({
        account: !!existing?.step_1,
        profile: !!existing?.esse,
        review: false,
        payment: !!existing?.payment_status,
    });

    React.useEffect(() => {
        setCompleted({
            account: !!existing?.step_1,
            profile: !!existing?.esse,
            review: false,
            payment: !!existing?.payment_status,
        });
    }, [existing]);

    const [saving, setSaving] = React.useState(false);

    const goPrev = () => setValue((prev) => steps[Math.max(stepIndex(prev) - 1, 0)]!.value);
    const goNext = () => setValue((prev) => steps[Math.min(stepIndex(prev) + 1, steps.length - 1)]!.value);
    const markDone = (step: StepValue) => setCompleted((p) => ({ ...p, [step]: true }));

    const saveDraft = async (payload: { step: number; step_1?: any; esse?: string }) => {
        try {
            setSaving(true);
            await axiosClient.post("/user/application/save", {
                admission_id: admission._id,
                ...payload,
            });
        } catch (e) {
            console.error(e);
            showToast("Saqlashda xatolik bo‘ldi. Qayta urinib ko‘ring.", ToastType.Error);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full">
            <Stepper value={value} onValueChange={(v) => setValue(v as StepValue)}>
                <StepperList className="gap-3 rounded-2xl border bg-card p-4">
                    {steps.map((step, idx) => {
                        const isActive = step.value === value;
                        const isCompleted = completed[step.value];
                        const allowed =
                            idx === 0 ||
                            (idx === 1 && completed.account) ||
                            (idx === 2 && completed.profile) ||
                            (idx === 3 && completed.review);

                        return (
                            <StepperItem key={step.value} value={step.value} className="flex-1">
                                <div className="flex items-center gap-3">
                                    <StepperTrigger
                                        className={cn("group flex items-center gap-3", !allowed && "opacity-60 cursor-not-allowed")}
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
                                            <div className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>
                                                {step.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{step.description}</div>
                                        </div>
                                    </StepperTrigger>

                                    {idx !== steps.length - 1 && <StepperSeparator className="hidden md:block flex-1 opacity-60" />}
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
                            {saving ? <p className="text-xs text-muted-foreground mt-1">Saqlanmoqda...</p> : null}
                        </div>

                        {step.value === "account" && (
                            <ApplicationStep
                                admission={admission}
                                defaultValues={data.application}
                                onNext={async (payload) => {
                                    setData((p) => ({ ...p, application: payload }));

                                    const choice = admission.choices.find((x) => x.id === payload.educationDirection);

                                    await saveDraft({
                                        step: 2,
                                        step_1: {
                                            phone_number: payload.phone,
                                            phone_number_additional: payload.phoneExtra,
                                            email: payload.email,
                                            choice: { id: payload.educationDirection, name: choice?.name ?? "" },
                                            isCertified: payload.hasCertificate === "yes",
                                            certificate_file: payload.hasCertificate === "yes" ? payload.certificatePath : undefined,
                                            exam_language: payload.hasCertificate === "no" ? payload.examLanguage : undefined,
                                        },
                                    });

                                    markDone("account");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "profile" && (
                            <EssayStep
                                defaultValues={data.essay}
                                onBack={goPrev}
                                onNext={async (payload) => {
                                    setData((p) => ({ ...p, essay: payload }));
                                    await saveDraft({ step: 3, esse: payload.essay });
                                    markDone("profile");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "review" && (
                            <ReviewStep
                                admission={admission}
                                data={data}
                                onBack={goPrev}
                                onConfirm={async () => {
                                    await saveDraft({ step: 4 });
                                    markDone("review");
                                    goNext();
                                }}
                            />
                        )}

                        {step.value === "payment" && (
                            <PaymentStep
                                admissionId={admission._id}
                                amount={206_000}
                                onBack={goPrev}
                                onPaid={async () => markDone("payment")}
                                onLoad={onLoad}
                            />
                        )}
                    </StepperContent>
                ))}
            </Stepper>
        </div>
    );
}
