"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";
import { LoaderCircle, Trash2 } from "lucide-react";

const schema = z.object({
    uz: z.string().min(2, "O‘zbekcha nom kamida 2 ta belgi bo‘lsin").max(120),
    ru: z.string().min(2, "Ruscha nom kamida 2 ta belgi bo‘lsin").max(120),
    en: z.string().min(2, "Inglizcha nom kamida 2 ta belgi bo‘lsin").max(120),
    kaa: z.string().min(2, "Qoraqalpoqcha nom kamida 2 ta belgi bo‘lsin").max(120),
});

type FormValues = z.infer<typeof schema>;

type DirectionRow = {
    id: string;
    uz: string;
    ru: string;
    en: string;
    kaa: string;
    createdAt: string;
};

export default function ChoiceSettings() {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState<DirectionRow[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { uz: "", ru: "", en: "", kaa: "" },
        mode: "onChange",
    });

    const getData = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get("/admin/choice");
            const data = response.data.data;
            setRows(data.map((item: any) => ({
                id: item._id,
                uz: item.choice.uz,
                ru: item.choice.ru,
                en: item.choice.eng,
                kaa: item.choice.kaa,
                createdAt: item.createdAt,
            })));
        } catch (error) {
            console.error("Error fetching data:", error);
            showToast(`Ma'lumotlarni olishda xatolik yuz berdi: ${error}`, ToastType.Error);
        } finally {
            setLoading(false);
        }
    }
    const deleteData = async (id: string) => {
        try {
            await axiosClient.delete(`/admin/choice?id=${id}`);
            showToast("Yo‘nalish muvaffaqiyatli o‘chirildi", ToastType.Success);
            getData();
        } catch (error) {
            console.error("Error deleting data:", error);
            showToast(`Yo‘nalishni o‘chirishda xatolik yuz berdi: ${error}`, ToastType.Error);
        }
    }
    const onSubmit = async (values: FormValues) => {
        try {
            const response = await axiosClient.post("/admin/choice", values);
            console.log("Response:", response.data);
        } catch (error) {
            console.error("Error:", error);
            showToast(`Yo‘nalish qo‘shishda xatolik yuz berdi: ${error}`, ToastType.Error);
        } finally {
            getData();
            reset();
            setOpen(false);
        }
    }
    React.useEffect(() => {
        getData();
    }, []);
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Yo‘nalishlar</h2>
                    <p className="text-sm text-muted-foreground">
                        Yo‘nalish nomlarini 4 tilda kiriting (UZ/RU/EN/KAA).
                    </p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>Yo&apos;nalish qo&apos;shish</Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Yo&apos;nalish qo&apos;shish</DialogTitle>
                                <DialogDescription>
                                    Har bir til uchun nomni kiriting.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="uz">O‘zbek</Label>
                                    <Input id="uz" placeholder="Masalan: Davlat boshqaruvi" {...register("uz")} />
                                    {errors.uz?.message ? (
                                        <p className="text-sm text-destructive">{errors.uz.message}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="ru">Русский</Label>
                                    <Input id="ru" placeholder="Например: Государственное управление" {...register("ru")} />
                                    {errors.ru?.message ? (
                                        <p className="text-sm text-destructive">{errors.ru.message}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="en">English</Label>
                                    <Input id="en" placeholder="E.g.: Public administration" {...register("en")} />
                                    {errors.en?.message ? (
                                        <p className="text-sm text-destructive">{errors.en.message}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="kaa">Qoraqalpoq</Label>
                                    <Input id="kaa" placeholder="Mısalı: Memleket basqarıwı" {...register("kaa")} />
                                    {errors.kaa?.message ? (
                                        <p className="text-sm text-destructive">{errors.kaa.message}</p>
                                    ) : null}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-2">
                                <DialogClose asChild>
                                    <Button variant="outline" type="button">
                                        Bekor qilish
                                    </Button>
                                </DialogClose>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <>
                                        <LoaderCircle className="animate-spin" /> Saqlash
                                    </> : "Saqlash"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-xl border">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <LoaderCircle className="animate-spin" size={24} />
                    </div>
                ) : <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[56px]">#</TableHead>
                                <TableHead>O‘zbek</TableHead>
                                <TableHead>Русский</TableHead>
                                <TableHead>English</TableHead>
                                <TableHead>Qoraqalpoq</TableHead>
                                <TableHead className="text-right">Amallar</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rows.length ? (
                                rows.map((row, idx) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium">{row.uz}</TableCell>
                                        <TableCell>{row.ru}</TableCell>
                                        <TableCell>{row.en}</TableCell>
                                        <TableCell>{row.kaa}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="destructive" size="sm" onClick={() => deleteData(row.id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                        Hozircha yo‘nalish yo‘q.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </>}

            </div>
        </div>
    );
}

