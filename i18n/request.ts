import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const locales = ["uz", "ru", "en", "kaa"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
    const store = await cookies();
    const cookieLocale = store.get("locale")?.value;

    const locale: Locale =
        locales.includes(cookieLocale as Locale)
            ? (cookieLocale as Locale)
            : "uz";

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
