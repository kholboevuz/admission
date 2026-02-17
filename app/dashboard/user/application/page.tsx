"use client";

import SubmissionClosed from "@/components/no-accept-application";
import { StepperForm } from "@/components/step-form";
import { TimelineApplication } from "@/components/time-line";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import { Loader2 } from "lucide-react";
import React from "react";

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
    admission_id: string;
    step: number;
    step_1?: any;
    esse?: string;
    payment_status?: boolean;
    application_status?: string;
    createdAt?: string;
    updatedAt?: string;
};

const TIMELINE_STATUSES = new Set([
    "submitted",
    "returned",
    "reviewed",
    "accepted",
    "rejected",
]);

function normStatus(s: unknown) {
    return String(s ?? "").trim().toLowerCase();
}
function toISOorNull(v: any): string | null {
    if (!v) return null;

    // Date bo‘lsa
    if (v instanceof Date) return v.toISOString();

    // String bo‘lsa (ISO yoki boshqa)
    if (typeof v === "string") {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
        return null;
    }

    // MongoDate object kelib qolsa: { $date: ... }
    if (typeof v === "object" && v.$date) {
        const d = new Date(v.$date);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
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

export default function Page() {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [admission, setAdmission] = React.useState<ActiveAdmission | null>(null);
    const [existing, setExisting] = React.useState<ExistingApp | null>(null);
    const [applicationData, setApplicationData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [editLoading, setEditLoading] = React.useState(false);
    const load = async () => {
        try {
            setLoading(true);

            let active: ActiveAdmission | null = null;
            try {
                const a = await axiosClient.get("/user/application/active");
                active = (a.data?.data as ActiveAdmission) || null;
            } catch (e) {
                active = null;
            }

            try {
                const s = await axiosClient.get("/user/application/status");
                setIsOpen(!!s.data?.data?.status);
            } catch (e) {
                setIsOpen(false);
            }

            setAdmission(active && active.status ? active : null);

            let app: any = null;
            try {
                const me = await axiosClient.get("/user/application/me", {
                    params: active?._id ? { admission_id: active._id } : undefined,
                });
                app = me.data?.data ?? null;
            } catch (e) {
                app = null;
            }

            setApplicationData(app);
            setExisting(app);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        load();
    }, []);


    const onEdit = async () => {
        try {
            setEditLoading(true);

            const res = await axiosClient.post("/user/application/status/update", {
                applicationId: applicationData._id,
                admissionId: applicationData.admission_id,
                pinfl: applicationData.pinfl,
                status: "draft",
            });

            if (res.data?.success) {
                showToast("Ariza tahrirlash rejimiga o‘tkazildi", ToastType.Success);
                await load();
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


    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    const hasApp = !!applicationData?._id;
    const st = normStatus(applicationData?.application_status);

    if (hasApp) {
        if (TIMELINE_STATUSES.has(st)) {
            return (
                <TimelineApplication
                    status={st as any}
                    submittedAt={formatUZDateTime(applicationData?.createdAt)}
                    onEdit={onEdit}
                    editLoading={editLoading}
                />
            );
        }

        if (!isOpen) {
            return (
                <TimelineApplication
                    status={(st || "submitted") as any}
                    submittedAt={formatUZDateTime(applicationData?.createdAt)}
                    onEdit={onEdit}
                    editLoading={editLoading}
                />
            );
        }

        if (admission) {
            return <StepperForm admission={admission} existing={existing} onLoad={load} />;
        }

        return <StepperForm admission={admission as any} existing={existing} onLoad={load} />;
    }

    if (!isOpen || !admission) return <SubmissionClosed />;

    return <StepperForm admission={admission} existing={existing} onLoad={load} />;
}
