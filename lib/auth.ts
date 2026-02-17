import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function requireAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        throw new Error("Unauthorized");
    }

    return jwt.verify(token, process.env.JWT_SECRET!);
}