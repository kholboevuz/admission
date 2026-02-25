import {
    User,
    ListChecks,
    Info,
    FileText,
    GraduationCap,
    ShieldCheck,
    FolderKanban,
    Bell,
    Settings2,
    Users2,
    UserCheck2,
    FileCheck,
} from "lucide-react";

export type NavItem = {
    title: string;
    href: string;
    icon: any;
};

export const DASHBOARD_NAV_ADMIN: NavItem[] = [
    { title: "Profil", href: "/dashboard/admin", icon: User },
    { title: "Tanlov sozlamalari", href: "/dashboard/admin/settings", icon: Settings2 },
    { title: "Qabull jadvali", href: "/dashboard/admin/admission", icon: ListChecks },
    { title: "Nizom", href: "/dashboard/admin/regulation", icon: ShieldCheck },
    { title: "PF-78 Farmon", href: "/dashboard/admin/decree", icon: Info },
    { title: "Boshqaruv hodimlari", href: "/dashboard/admin/staff", icon: UserCheck2 },
    { title: "Foydalanuvchilar", href: "/dashboard/admin/users", icon: Users2 },
];

export const DASHBOARD_NAV_USER: NavItem[] = [
    { title: "Profil", href: "/dashboard/user", icon: User },
    { title: "Ariza yuborish", href: "/dashboard/user/application", icon: FolderKanban },
    { title: "Nizom", href: "/dashboard/user/regulation", icon: ShieldCheck },
    { title: "PF-78 Farmon", href: "/dashboard/user/decree", icon: Info },
];

export const DASHBOARD_NAV_MODERATOR: NavItem[] = [
    { title: "Arizalar", href: "/dashboard/manager", icon: FileText },
    { title: "Mening arizalarim", href: "/dashboard/manager/my-applications", icon: FileCheck },
    { title: "PF-78 Farmon", href: "/dashboard/manager/decree", icon: Info },
    { title: "Nizom", href: "/dashboard/manager/regulation", icon: ShieldCheck },
];