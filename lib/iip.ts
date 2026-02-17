import axios from "axios";

const BASE_URL = process.env.MSPD_URL!;
const AUTH = process.env.MSPD_SECRET!;

function authHeaders() {
    return {
        Authorization: `Bearer ${AUTH}`,
        "Content-Type": "application/json",
    };
}

export async function getEmployment(pinfl: string) {
    const url = `${BASE_URL}/employment?pinfl=${encodeURIComponent(pinfl)}`;
    const res = await axios.get(url, { headers: authHeaders(), maxBodyLength: Infinity });
    return res.data;
}

export async function refreshEmployment(pinfl: string) {
    const url = `${BASE_URL}/employment/refresh/${encodeURIComponent(pinfl)}`;
    const res = await axios.get(url, { headers: authHeaders(), maxBodyLength: Infinity });
    return res.data;
}

export async function getEducation(pinfl: string) {
    const url = `${BASE_URL}/education?pinfl=${encodeURIComponent(pinfl)}`;
    const res = await axios.get(url, { headers: authHeaders(), maxBodyLength: Infinity });
    return res.data;
}

export async function refreshEducation(pinfl: string) {
    const url = `${BASE_URL}/education/refresh/${encodeURIComponent(pinfl)}`;
    const res = await axios.get(url, { headers: authHeaders(), maxBodyLength: Infinity });
    return res.data;
}

export async function getWithRefreshIfEmpty<T>({
    getFn,
    refreshFn,
    pinfl,
    forceRefresh,
}: {
    getFn: (p: string) => Promise<T>;
    refreshFn: (p: string) => Promise<any>;
    pinfl: string;
    forceRefresh?: boolean;
}) {
    if (forceRefresh) {
        await refreshFn(pinfl);
        return await getFn(pinfl);
    }

    const data: any = await getFn(pinfl);
    const isEmpty =
        data == null ||
        (Array.isArray(data) && data.length === 0) ||
        (typeof data === "object" && Array.isArray(data.data) && data.data.length === 0);

    if (!isEmpty) return data;

    await refreshFn(pinfl);
    return await getFn(pinfl);
}