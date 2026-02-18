import axios from "axios";

export const SERVER_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api`;

export const axiosClient = axios.create({
    baseURL: SERVER_URL,
    headers: {
        "Content-Type": "application/json",
    },
    maxBodyLength: Infinity,
});

