'use client'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { axiosClient } from "@/http/axios"
import { showToast, ToastType } from "@/utils/toast-utils"
import { ChevronRight } from "lucide-react"
import { useState } from "react"

type Moderator = {
    application_id: string;
    applicationLoadList: () => void;
}
export function AcceptApplication({
    application_id,
    applicationLoadList,
}: Moderator
) {
    const [loading, setLoading] = useState(false);

    const acceptApplication = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.post("/manager/applications/accept", { application_id });
            if (res.data.success) {
                showToast("Ariza muvaffaqiyatli qabul qilindi, Arizani mening arizalarim bo'limida ko'rishingiz mumkin", ToastType.Success);
                applicationLoadList();
            } else {
                showToast(`Arizani qabul qilishda xatolik: ${res.data.error}`, ToastType.Error);
            }
        } catch (e) {
            console.error(e);
            showToast("Server bilan bog'lanishda xatolik yuz berdi", ToastType.Error);
        } finally {
            setLoading(false);
        }
    };
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size={'sm'} disabled={loading}> Qabul qilish
                    <ChevronRight className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Siz ushbu arizani qabul qilmoqchimisiz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Arizani qabul qilganingizdan so'ng, ariza beruvchiga ariza holati haqida xabar yuboriladi. Arizani qabul qilishni tasdiqlaysizmi?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                    <AlertDialogAction onClick={acceptApplication} disabled={loading}>
                        {loading ? "Yuklanmoqda..." : "Davom etish"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
