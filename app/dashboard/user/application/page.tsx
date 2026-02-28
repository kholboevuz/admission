"use client";

import SubmissionClosed from "@/components/no-accept-application";
import { StepperForm } from "@/components/step-form";
import { TimelineApplication } from "@/components/time-line";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import { Loader2 } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import MalumotnomaRequiredSimple from "@/components/not-malumotnoma";

type ActiveAdmission = {
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
    _id?: string;
    admission_id: string;
    step: number;
    step_1?: any;
    esse?: string;
    payment_status?: boolean;
    application_status?: string;
    createdAt?: string;
    updatedAt?: string;
    pinfl?: string;
};

type SessionResponse = {
    success: boolean;
    user: null | {
        id: string;
        firstname: string;
        lastname: string;
        role: string;
        pinfl: string;
    };
};

const TIMELINE_STATUSES = new Set(["submitted", "returned", "reviewed", "accepted", "rejected"]);

function normStatus(s: unknown) {
    return String(s ?? "").trim().toLowerCase();
}

function toISOorNull(v: any): string | null {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (typeof v === "object" && v.$date) {
        const d = new Date(v.$date);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
}

function formatUZDateTime(v: any): string {
    const iso = toISOorNull(v);
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("uz-UZ", {
        timeZone: "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}


function CenterLoader() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="animate-spin" />
        </div>
    );
}

export default function Page() {
    const [bootLoading, setBootLoading] = React.useState(true);

    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [admission, setAdmission] = React.useState<ActiveAdmission | null>(null);

    const [applicationData, setApplicationData] = React.useState<ExistingApp | null>(null);
    const [existing, setExisting] = React.useState<ExistingApp | null>(null);

    const [editLoading, setEditLoading] = React.useState(false);

    const [malumotnoma, setMalumotnoma] = React.useState<boolean | null>(null);

    const [pinfl, setPinfl] = React.useState<string | null>(null);

    const loadAll = React.useCallback(async () => {
        setBootLoading(true);

        try {
            let sessionPinfl: string | null = null;
            try {
                const sess = await axiosClient.get<SessionResponse>("/auth/session");
                sessionPinfl = sess.data?.user?.pinfl ?? null;
            } catch {
                sessionPinfl = null;
            }
            setPinfl(sessionPinfl);

            let active: ActiveAdmission | null = null;
            try {
                const a = await axiosClient.get("/user/application/active");
                active = (a.data?.data as ActiveAdmission) || null;
            } catch {
                active = null;
            }

            try {
                const s = await axiosClient.get("/user/application/status");
                console.log("Status response:", s.data);
                setIsOpen(!!s.data?.data?.ok);
            } catch {
                setIsOpen(false);
            }
            console.log("Active admission:", active);
            setAdmission(active ? active : null);

            let app: ExistingApp | null = null;
            try {

                const me = await axiosClient.get("/user/application/me", {
                    params: active?._id ? { admission_id: active._id } : undefined,
                });
                app = (me.data?.data as ExistingApp) ?? null;
            } catch {
                app = null;
            }

            setApplicationData(app);
            setExisting(app);

            const p = (app as any)?.pinfl || sessionPinfl;

            if (!p) {

                setMalumotnoma(false);
            } else {
                setMalumotnoma(null);
                try {
                    const res = await axiosClient.get("/user/malumotnoma/get/status", { params: { pinfl: p } });
                    if (res.data?.success) setMalumotnoma(!!res.data?.data?.status);
                    else setMalumotnoma(false);
                } catch {
                    setMalumotnoma(false);
                }
            }
        } finally {
            setBootLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadAll();
    }, [loadAll]);

    const onEdit = async () => {
        try {
            setEditLoading(true);

            if (!applicationData?._id) {
                showToast("Ariza topilmadi", ToastType.Error);
                return;
            }

            const res = await axiosClient.post("/user/application/status/update", {
                applicationId: applicationData._id,
                admissionId: applicationData.admission_id,
                pinfl: applicationData.pinfl,
                status: "draft",
            });

            if (res.data?.success) {
                showToast("Ariza tahrirlash rejimiga o‘tkazildi", ToastType.Success);
                await loadAll();
            } else {
                showToast(res.data?.error || "Noma’lum xatolik", ToastType.Error);
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                "Ariza holatini yangilashda xatolik yuz berdi.";
            showToast(message, ToastType.Error);
        } finally {
            setEditLoading(false);
        }
    };

    if (bootLoading) return <CenterLoader />;

    const hasApp = !!applicationData?._id;
    const st = normStatus(applicationData?.application_status);

    if (hasApp && TIMELINE_STATUSES.has(st)) {
        return (
            <TimelineApplication
                status={st as any}
                submittedAt={formatUZDateTime((applicationData as any)?.createdAt)}
                onEdit={onEdit}
                editLoading={editLoading}
                application_id={applicationData._id!}
            />
        );
    }
    console.log("Is open:", isOpen, "Admission:", admission, "Has app:", hasApp, "Status:", st);
    if (!isOpen || !admission) {
        if (hasApp) {
            return (
                <TimelineApplication
                    status={(st || "submitted") as any}
                    submittedAt={formatUZDateTime((applicationData as any)?.createdAt)}
                    onEdit={onEdit}
                    editLoading={editLoading}
                    application_id={applicationData._id!}
                />
            );
        }
        return <SubmissionClosed />;
    }

    if (malumotnoma === null) return <CenterLoader />;

    if (malumotnoma === false) {
        return <MalumotnomaRequiredSimple />;
    }

    return <StepperForm admission={admission} existing={existing} onLoad={loadAll} />;
}
