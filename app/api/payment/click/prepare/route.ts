export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
    ClickAction,
    ClickError,
    TransactionState,
    FIXED_AMOUNT,
} from "@/lib/click/constants";
import { clickCheckTokenPrepare } from "@/lib/click/signature";
import { connectDB } from "@/config/dbconn";

import ClickModel from "@/models/click-transaction-model";
import UsersModel from "@/models/users-models";

type PrepareBody = {
    click_trans_id: string;
    service_id: number;
    merchant_trans_id: string;
    amount: number;
    action: number;
    sign_time: string;
    sign_string: string;
};

function json(data: any, status = 200) {
    return NextResponse.json(data, { status });
}

async function parsePrepareBody(req: NextRequest): Promise<PrepareBody | null> {
    const ct = req.headers.get("content-type") || "";

    try {
        if (ct.includes("application/json")) {
            const b = (await req.json()) as any;
            return {
                click_trans_id: String(b.click_trans_id ?? ""),
                service_id: Number(b.service_id ?? 0),
                merchant_trans_id: String(b.merchant_trans_id ?? ""),
                amount: Number(b.amount ?? 0),
                action: Number(b.action ?? 0),
                sign_time: String(b.sign_time ?? ""),
                sign_string: String(b.sign_string ?? ""),
            };
        }

        if (ct.includes("application/x-www-form-urlencoded")) {
            const raw = await req.text();
            const p = new URLSearchParams(raw);
            return {
                click_trans_id: String(p.get("click_trans_id") ?? ""),
                service_id: Number(p.get("service_id") ?? 0),
                merchant_trans_id: String(p.get("merchant_trans_id") ?? ""),
                amount: Number(p.get("amount") ?? 0),
                action: Number(p.get("action") ?? 0),
                sign_time: String(p.get("sign_time") ?? ""),
                sign_string: String(p.get("sign_string") ?? ""),
            };
        }

        if (ct.includes("multipart/form-data")) {
            const fd = await req.formData();
            return {
                click_trans_id: String(fd.get("click_trans_id") ?? ""),
                service_id: Number(fd.get("service_id") ?? 0),
                merchant_trans_id: String(fd.get("merchant_trans_id") ?? ""),
                amount: Number(fd.get("amount") ?? 0),
                action: Number(fd.get("action") ?? 0),
                sign_time: String(fd.get("sign_time") ?? ""),
                sign_string: String(fd.get("sign_string") ?? ""),
            } as PrepareBody;
        }

        const url = new URL(req.url);
        if (url.searchParams.has("click_trans_id")) {
            const q = url.searchParams;
            return {
                click_trans_id: String(q.get("click_trans_id") ?? ""),
                service_id: Number(q.get("service_id") ?? 0),
                merchant_trans_id: String(q.get("merchant_trans_id") ?? ""),
                amount: Number(q.get("amount") ?? 0),
                action: Number(q.get("action") ?? 0),
                sign_time: String(q.get("sign_time") ?? ""),
                sign_string: String(q.get("sign_string") ?? ""),
            };
        }

        return null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await parsePrepareBody(req);
        if (!body) {
            console.log({ error: ClickError.BadRequest, error_note: "Invalid or unsupported body format" })
            return json(
                { error: ClickError.BadRequest, error_note: "Invalid or unsupported body format" },
                400
            );

        }

        const {
            click_trans_id,
            service_id,
            merchant_trans_id,
            amount,
            action,
            sign_time,
            sign_string,
        } = body;


        const secret = process.env.NEXT_PUBLIC_PAYMENT_SECRET_KEY || "";

        const ok = clickCheckTokenPrepare(
            {
                click_trans_id: String(click_trans_id),
                service_id,
                merchant_trans_id,
                amount,
                action,
                sign_time,
            },
            sign_string,
            secret
        );

        if (!ok) {
            console.log({ error: ClickError.SignFailed, error_note: "Invalid sign" })
            return json({ error: ClickError.SignFailed, error_note: "Invalid sign" }, 400);
        }

        if (Number(action) !== ClickAction.Prepare) {
            console.log({ error: ClickError.ActionNotFound, error_note: "Action not found" })
            return json(
                { error: ClickError.ActionNotFound, error_note: "Action not found" },
                400
            );
        }
        const expected = ((Number(FIXED_AMOUNT) * 0.01) + Number(FIXED_AMOUNT));
        if (Number(amount) !== expected) {

            console.log({ error: ClickError.InvalidAmount, error_note: "Incorrect parameter amount" })
            return json(
                { error: ClickError.InvalidAmount, error_note: "Incorrect parameter amount" },
                400
            );
        }
        console.log("Amount is valid:", merchant_trans_id);
        const user = await UsersModel.findOne({ pinfl: merchant_trans_id });
        console.log({ error: ClickError.UserNotFound, error_note: "User not found" })
        if (!user) {
            return json({ error: ClickError.UserNotFound, error_note: "User not found" }, 400);
        }

        const already = await ClickModel.findOne({
            user: merchant_trans_id,
            provider: "click",
            state: TransactionState.Paid,
        });
        console.log({ error: ClickError.AlreadyPaid, error_note: "Already paid" })
        if (already) {
            return json({ error: ClickError.AlreadyPaid, error_note: "Already paid" }, 400);
        }

        const existing = await ClickModel.findOne({ id: String(click_trans_id) });


        if (existing && existing.state === ClickError.TransactionCanceled) {
            console.log({ error: ClickError.TransactionCanceled, error_note: "Transaction canceled" })
            return json(
                { error: ClickError.TransactionCanceled, error_note: "Transaction canceled" },
                400
            );
        }

        const time = Date.now();

        await ClickModel.create({
            id: String(click_trans_id),
            user: merchant_trans_id,
            state: TransactionState.Pending,
            create_time: time,
            amount: Number(FIXED_AMOUNT),
            prepare_id: time,
            provider: "click",
        });

        return json({
            click_trans_id: String(click_trans_id),
            merchant_trans_id,
            merchant_prepare_id: time,
            error: ClickError.Success,
            error_note: "Success",
        });
    } catch (e) {
        console.error(e);
        return json({ error: ClickError.BadRequest, error_note: "Server error" }, 500);
    }
}
