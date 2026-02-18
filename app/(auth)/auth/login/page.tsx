import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">

            <div className="relative flex flex-col gap-4 p-6 md:p-10 overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
                >
                    <source src="/assets/bg-video.mp4" type="video/mp4" />
                </video>

                {/* CONTENT */}
                <div className="relative flex flex-1 items-center justify-center">
                    <div className="w-full max-w-lg backdrop-blur-xl p-6 rounded-2xl ">
                        <LoginForm />
                    </div>
                </div>

            </div>

            {/* RIGHT — IMAGE */}
            <div className="bg-muted relative hidden lg:block">
                <img
                    src="/assets/auth-page.png"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>

        </div>
    )
}
