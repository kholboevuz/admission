"use client";

import Image from "next/image";
import { LogOut, Settings, User } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

type UserNavProps = {
    name: string;
    role: string;
    image?: string;
};

const data = {
    name: "Xolboyev Sevinchbek",
    role: "Nomzod",
    image: "/assets/avatar.png",
}

export function UserNav() {
    const { name, role, image } = data;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-auto px-2 py-1 rounded-xl hover:bg-muted flex items-center gap-3"
                >
                    {/* Avatar */}
                    <div className="relative size-9 rounded-full overflow-hidden border">
                        <Image
                            src={image}
                            alt="User avatar"
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Name + role */}
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-sm font-semibold">{name}</span>
                        <span className="text-xs text-muted-foreground">{role}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl"
            >
                <DropdownMenuLabel>
                    <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{role}</span>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 cursor-pointer">
                    <User className="size-4" />
                    Profil
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Settings className="size-4" />
                    Sozlamalar
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 text-destructive cursor-pointer">
                    <LogOut className="size-4" />
                    Chiqish
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
