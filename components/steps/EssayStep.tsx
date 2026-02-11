"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
    defaultValues?: Partial<EssayData>;
    onBack: () => void;
    onNext: (data: EssayData) => void;
};

const essaySchema = z.object({
    essay: z
        .string()
        .min(200, "Esse kamida 200 ta belgi bo'lishi kerak")
        .max(8000, "Esse juda uzun (max: 8000 belgi)"),
});

export type EssayData = z.infer<typeof essaySchema>;

function htmlToText(html: string) {
    if (typeof window === "undefined") return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").trim();
}

export function EssayStep({ defaultValues, onBack, onNext }: Props) {
    const form = useForm<EssayData>({
        resolver: zodResolver(essaySchema),
        mode: "onSubmit",
        defaultValues: { essay: defaultValues?.essay ?? "" },
    });

    // ✅ hydration mismatch bo‘lmasligi uchun editor’ni client’da render qilamiz
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [charCount, setCharCount] = React.useState<number>(
        defaultValues?.essay?.length ?? 0
    );

    const editor = useEditor(
        {
            // ✅ MUHIM: SSR warning yechimi
            immediatelyRender: false,

            extensions: [
                StarterKit,
                Placeholder.configure({
                    placeholder: "Motivatsion esseingizni bu yerga yozing...",
                }),
            ],
            content: defaultValues?.essay ?? "",
            editorProps: {
                attributes: {
                    class:
                        "min-h-[260px] px-4 py-3 outline-none prose prose-sm max-w-none dark:prose-invert",
                },
            },
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                const text = htmlToText(html);

                setCharCount(text.length);
                form.setValue("essay", text, { shouldValidate: true });
            },
        },
        // ✅ TipTap docs tavsiyasi: deps
        [defaultValues?.essay]
    );

    const error = form.formState.errors.essay?.message;
    const isTooShort = charCount < 200;
    const isTooLong = charCount > 8000;

    return (
        <form
            className="mt-5 space-y-6"
            onSubmit={form.handleSubmit(() => onNext(form.getValues()))}
        >
            <div className="space-y-4">
                <div
                    className={cn(
                        "rounded-2xl border bg-card overflow-hidden transition-all",
                        error && "border-destructive ring-1 ring-destructive"
                    )}
                >
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
                        <ToolbarButton
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            active={!!editor?.isActive("bold")}
                            disabled={!editor}
                        >
                            B
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            active={!!editor?.isActive("italic")}
                            disabled={!editor}
                        >
                            I
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            active={!!editor?.isActive("bulletList")}
                            disabled={!editor}
                        >
                            • List
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            active={!!editor?.isActive("orderedList")}
                            disabled={!editor}
                        >
                            1. List
                        </ToolbarButton>

                        <div className="ml-auto flex items-center gap-2">
                            <ToolbarButton
                                onClick={() => editor?.chain().focus().undo().run()}
                                disabled={!editor}
                            >
                                Undo
                            </ToolbarButton>
                            <ToolbarButton
                                onClick={() => editor?.chain().focus().redo().run()}
                                disabled={!editor}
                            >
                                Redo
                            </ToolbarButton>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="bg-background">
                        {/* ✅ mounted bo‘lmaguncha editor render qilmaymiz */}
                        {mounted && editor ? (
                            <EditorContent editor={editor} />
                        ) : (
                            <div className="min-h-[320px] flex items-center justify-center bg-muted/10">
                                <p className="text-sm text-muted-foreground">Editor yuklanmoqda...</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs">
                        <span
                            className={cn(
                                "font-medium",
                                isTooShort && "text-amber-600",
                                !isTooShort && !isTooLong && "text-green-600",
                                isTooLong && "text-destructive"
                            )}
                        >
                            {charCount} / 8000 belgi
                        </span>

                        {isTooShort ? (
                            <span className="text-amber-600 font-medium">
                                Yana {200 - charCount} belgi yozing
                            </span>
                        ) : isTooLong ? (
                            <span className="text-destructive font-medium">Juda ko‘p!</span>
                        ) : (
                            <span className="text-green-600 font-medium">✓ Yetarli</span>
                        )}
                    </div>
                </div>

                {error ? (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                ) : null}
            </div>

            <div className="flex items-center justify-between pt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="rounded-xl px-6"
                    onClick={onBack}
                >
                    Orqaga
                </Button>
                <Button
                    type="submit"
                    size="lg"
                    className="rounded-xl px-8"
                    disabled={isTooShort || isTooLong}
                >
                    Keyingi
                </Button>
            </div>
        </form>
    );
}

function ToolbarButton({
    children,
    onClick,
    active,
    disabled,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-9 rounded-xl border px-3 text-xs font-medium transition",
                "bg-background hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed",
                active && "border-primary bg-primary/10"
            )}
        >
            {children}
        </button>
    );
}
