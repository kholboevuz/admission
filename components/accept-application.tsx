"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, Loader2 } from "lucide-react";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

export default function AcceptApplication({
    application_id,
    onLoad,
}: {
    application_id: string;
    onLoad?: () => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        try {
            setSubmitting(true);

            await axiosClient.post("/manager/applications/message/accept", {
                application_id,
            });

            showToast("Ariza muvaffaqiyatli tasdiqlandi", ToastType.Success);
            setOpen(false);
            if (onLoad) onLoad();
        } catch (err: any) {
            showToast(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Xatolik yuz berdi",
                ToastType.Error,
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm">
                    Arizani tasdiqlash <CircleCheckBig className="ml-1 size-4" />
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="w-[95vw] max-w-lg sm:max-w-xl max-h-[80vh] overflow-y-auto">
                <form onSubmit={onSubmit} className="space-y-4">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Siz rostdan ham ushbu arizani tasdiqlamoqchimisiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tasdiqlashdan avval ariza ma'lumotlarini diqqat bilan tekshirib chiqing.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel type="button">Bekor qilish</AlertDialogCancel>
                        <Button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Yuklanmoqda...
                                </>
                            ) : (
                                "Tasdiqlash"
                            )}
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}