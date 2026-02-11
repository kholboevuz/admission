import axios from "axios";

export const SERVER_URL = '/api';

export const axiosClient = axios.create({
    baseURL: SERVER_URL,
    headers: {
        "Content-Type": "application/json",
    },
    maxBodyLength: Infinity,
});

