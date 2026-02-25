import path from "path";

export const UPLOAD_ROOT =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export function assertSafeSubPath(expectedBase: string, abs: string): void {
    const resolved = path.resolve(abs);
    const base = path.resolve(expectedBase);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
        throw new Error("Path traversal detected");
    }
}