"use client";

import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { axiosClient } from "@/http/axios";
import { showToast, ToastType } from "@/utils/toast-utils";

type ChoiceDoc = { _id: string; choice: { uz: string } };
type Option = { value: string; label: string };

export type AdmissionDoc = {
    _id: string;
    title: string;
    starter_date: string;
    end_date: string;
    admission_type: { id: string; name: string }[];
    choices: { id: string; name: string }[];
    uuuid: string;
    status: boolean;
};

function toYMD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseYMD(s: string) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function axiosErrorMessage(error: any) {
    return (
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Xatolik yuz berdi"
    );
}

const AdmissionTypeEnum = z.enum(["OPEN_COMPETITION", "ORDER_BASED"]);
type AdmissionType = z.infer<typeof AdmissionTypeEnum>;

const admissionTypeOptions: { value: AdmissionType; label: string }[] = [
    { value: "OPEN_COMPETITION", label: "Ochiq tanlov" },
    { value: "ORDER_BASED", label: "Buyurtma asosida" },
];

const formSchema = z
    .object({
        title: z.string().min(3, "Nomi kamida 3 ta belgidan iborat bo'lishi kerak").max(120),
        startDate: z.date().nullable().refine((v) => v !== null, { message: "Boshlanish sanasini tanlang" }),
        endDate: z.date().nullable().refine((v) => v !== null, { message: "Tugash sanasini tanlang" }),
        admissionTypes: z.array(AdmissionTypeEnum).min(1, "Kamida 1 ta tanlov turini tanlang"),
        directions: z.array(z.string().min(1)).min(1, "Kamida 1 ta yo'nalishni tanlang"),
        isOpen: z.boolean(),
    })
    .refine(
        (d) => {
            if (!d.startDate || !d.endDate) return true;
            return d.endDate >= d.startDate;
        },
        { message: "Tugash sanasi boshlanish sanasidan oldinroq bo'lishi mumkin emas", path: ["endDate"] }
    );

type FormInput = z.input<typeof formSchema>;

function MultiSelect<T extends string>({
    label,
    placeholder = "Tanlang...",
    options,
    value,
    onChange,
    error,
    disabled,
}: {
    label: string;
    placeholder?: string;
    options: { value: T; label: string }[];
    value: T[];
    onChange: (v: T[]) => void;
    error?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

    const selectedLabels = React.useMemo(
        () => options.filter((o) => value.includes(o.value)).map((o) => o.label),
        [options, value]
    );

    const toggleItem = (itemValue: T) => {
        if (disabled) return;
        if (value.includes(itemValue)) onChange(value.filter((v) => v !== itemValue));
        else onChange([...value, itemValue]);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        type="button"
                        disabled={disabled}
                        className={cn("w-full justify-between", error && "border-destructive")}
                    >
                        <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
                            {selectedLabels.length ? (
                                <>
                                    {selectedLabels.slice(0, 2).map((lbl) => (
                                        <Badge key={lbl} variant="secondary" className="font-normal">
                                            {lbl}
                                        </Badge>
                                    ))}
                                    {selectedLabels.length > 2 && (
                                        <Badge variant="secondary" className="font-normal">
                                            +{selectedLabels.length - 2}
                                        </Badge>
                                    )}
                                </>
                            ) : (
                                <span className="text-muted-foreground">{placeholder}</span>
                            )}
                        </div>

                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                        <CommandList>
                            <CommandEmpty>Hech narsa topilmadi</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => {
                                    const isSelected = value.includes(opt.value);
                                    return (
                                        <CommandItem
                                            key={opt.value}
                                            value={opt.value}
                                            onSelect={() => toggleItem(opt.value)}
                                            className="cursor-pointer"
                                        >
                                            <div
                                                className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                )}
                                            >
                                                <Check className="h-4 w-4" />
                                            </div>
                                            <span>{opt.label}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>

                    <div className="flex items-center justify-end gap-2 border-t p-2">
                        <Button type="button" size="sm" onClick={() => setOpen(false)} className="h-8 px-3 text-xs">
                            Tayyor
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    );
}

function DatePicker({
    label,
    value,
    onChange,
    error,
    disabled,
}: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
    error?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        type="button"
                        disabled={disabled}
                        className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", error && "border-destructive")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, "dd.MM.yyyy") : <span>Sanani tanlang</span>}
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value ?? undefined}
                        onSelect={(date) => {
                            onChange(date ?? null);
                            if (date) setOpen(false);
                        }}
                        initialFocus
                        disabled={disabled}
                    />
                </PopoverContent>
            </Popover>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    );
}

export function AdmissionDialog({
    open,
    onOpenChange,
    mode,
    initial,
    onSaved,
    hasActiveAdmission,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    mode: "create" | "edit";
    initial?: AdmissionDoc | null;
    onSaved: () => void;
    hasActiveAdmission: boolean;
}) {
    const [choiceLoading, setChoiceLoading] = React.useState(false);
    const [choiceOptions, setChoiceOptions] = React.useState<Option[]>([]);
    const [choiceMap, setChoiceMap] = React.useState<Record<string, ChoiceDoc>>({});

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormInput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            startDate: null,
            endDate: null,
            admissionTypes: [],
            directions: [],
            isOpen: true,
        },
        mode: "onChange",
    });

    const isOpenValue = watch("isOpen");

    const loadChoices = React.useCallback(async () => {
        setChoiceLoading(true);
        try {
            const res = await axiosClient.get("/admin/choice");
            const list: ChoiceDoc[] = res.data?.data ?? [];

            const map: Record<string, ChoiceDoc> = {};
            const opts: Option[] = list.map((c) => {
                map[c._id] = c;
                return { value: c._id, label: c.choice?.uz ?? "Noma'lum" };
            });

            setChoiceMap(map);
            setChoiceOptions(opts);
        } catch (e) {
            console.error(e);
            showToast("Yo'nalishlarni olishda xatolik", ToastType.Error);
        } finally {
            setChoiceLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (!open) return;

        loadChoices();

        if (mode === "edit" && initial) {
            reset({
                title: initial.title,
                startDate: parseYMD(initial.starter_date),
                endDate: parseYMD(initial.end_date),
                admissionTypes: (initial.admission_type ?? []).map((x) => x.id) as any,
                directions: (initial.choices ?? []).map((x) => x.id),
                isOpen: Boolean(initial.status),
            });
        } else {
            reset({
                title: "",
                startDate: null,
                endDate: null,
                admissionTypes: [],
                directions: [],
                isOpen: true,
            });
        }
    }, [open, mode, initial, reset, loadChoices]);

    const disableFields = isSubmitting || choiceLoading;

    const onSubmit = async (values: FormInput) => {
        try {
            const parsed = formSchema.parse(values);

            if (mode === "create" && hasActiveAdmission) {
                showToast("Sizda aktiv admission bor. Yangi admission qo‘shib bo‘lmaydi.", ToastType.Warning);
                return;
            }

            const admissionTypesPayload = parsed.admissionTypes.map((id) => ({
                id,
                name: admissionTypeOptions.find((x) => x.value === id)?.label ?? id,
            }));

            const choicesPayload = parsed.directions.map((id) => ({
                id,
                name: choiceMap[id]?.choice?.uz ?? "Noma'lum",
            }));

            const body = {
                title: parsed.title,
                startDate: toYMD(parsed.startDate as Date),
                endDate: toYMD(parsed.endDate as Date),
                admissionTypes: admissionTypesPayload,
                choices: choicesPayload,
                isOpen: parsed.isOpen,
            };

            const res =
                mode === "create"
                    ? await axiosClient.post("/admin/admission", body)
                    : await axiosClient.put(`/admin/admission?id=${initial?._id}`, body);

            const message =
                res.data?.message ||
                (mode === "create" ? "Admission yaratildi" : "Admission yangilandi");

            showToast(message, ToastType.Success);

            onOpenChange(false);
            onSaved();
        } catch (error: any) {
            console.error(error);
            showToast(axiosErrorMessage(error), ToastType.Error);
        }
    };

    const onInvalid = () => {
        showToast("Iltimos, forma xatolarini tekshiring", ToastType.Warning);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "create" ? "Yangi admission qo‘shish" : "Admissionni tahrirlash"}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === "create"
                                ? "Qabul jarayoni uchun zarur ma’lumotlarni kiriting"
                                : "Kerakli ma’lumotlarni yangilang"}
                        </DialogDescription>
                    </DialogHeader>

                    {mode === "create" && hasActiveAdmission && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            Sizda hozir aktiv admission mavjud. Yangi admission qo‘shish uchun avval aktiv admissionni yopishingiz kerak.
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Nomi <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="Masalan: 2026-yil qabul 1-bosqich"
                                {...register("title")}
                                disabled={disableFields}
                                className={cn(errors.title && "border-destructive")}
                            />
                            {errors.title?.message && (
                                <p className="text-sm font-medium text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        {/* dates */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Controller
                                control={control}
                                name="startDate"
                                render={({ field }) => (
                                    <DatePicker
                                        label="Boshlanish sanasi"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.startDate?.message}
                                        disabled={disableFields}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="endDate"
                                render={({ field }) => (
                                    <DatePicker
                                        label="Tugash sanasi"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.endDate?.message}
                                        disabled={disableFields}
                                    />
                                )}
                            />
                        </div>

                        {/* admission type */}
                        <Controller
                            control={control}
                            name="admissionTypes"
                            render={({ field }) => (
                                <MultiSelect<AdmissionType>
                                    label="Tanlov turi"
                                    options={admissionTypeOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.admissionTypes?.message}
                                    disabled={disableFields}
                                />
                            )}
                        />

                        {/* directions */}
                        <Controller
                            control={control}
                            name="directions"
                            render={({ field }) => (
                                <MultiSelect<string>
                                    label="Yo‘nalish"
                                    options={choiceOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={choiceLoading ? "Yuklanmoqda..." : "Yo‘nalishlarni tanlang"}
                                    error={errors.directions?.message}
                                    disabled={disableFields || choiceOptions.length === 0}
                                />
                            )}
                        />

                        {/* status switch */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">Admission holati</div>
                                <div className="text-xs text-muted-foreground">
                                    Ochiq bo‘lsa foydalanuvchilar foydalanishi mumkin
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={isOpenValue ? "default" : "secondary"}>
                                    {isOpenValue ? "Ochiq" : "Yopiq"}
                                </Badge>
                                <Switch
                                    checked={isOpenValue}
                                    onCheckedChange={(v) => setValue("isOpen", v)}
                                    disabled={disableFields || (mode === "create" && hasActiveAdmission)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" type="button" disabled={isSubmitting}>
                                Bekor qilish
                            </Button>
                        </DialogClose>

                        <Button type="submit" disabled={disableFields || (mode === "create" && hasActiveAdmission)}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saqlanmoqda
                                </>
                            ) : mode === "create" ? (
                                "Yaratish"
                            ) : (
                                "Yangilash"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
