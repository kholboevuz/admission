import LanguageDropdown from "@/components/langue-switch";
import { RegisterForm } from "@/components/register-form";

export default function LoginPage() {
    return (
        <div className="grid min-h-[100svh] lg:grid-cols-2">
            {/* Left */}
            <div className="flex flex-col p-6 md:p-10">
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-lg items-center justify-center py-8">
                        <div className="w-full">
                            <RegisterForm />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right */}
            <div className="bg-muted relative hidden lg:block">
                <img
                    src="/assets/auth-page.png"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>
        </div>
    );
}
