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
import { clickCheckTokenComplete } from "@/lib/click/signature";
import { connectDB } from "@/config/dbconn";

import ClickModel from "@/models/click-transaction-model";
import OrderModel from "@/models/order-models";
import ApplicationsModel from "@/models/application-models";

type CompleteBody = {
    click_trans_id: string;
    service_id: number;
    click_paydoc_id?: string;
    merchant_trans_id: string;
    merchant_prepare_id: number;
    amount: number;
    action: number;
    error: number;
    error_note?: string;
    sign_time: string;
    sign_string: string;
};

function json(data: any, status = 200) {
    return NextResponse.json(data, { status });
}

async function parseCompleteBody(req: NextRequest): Promise<CompleteBody | null> {
    const ct = req.headers.get("content-type") || "";

    try {
        if (ct.includes("application/json")) {
            const b = (await req.json()) as any;
            return {
                click_trans_id: String(b.click_trans_id ?? ""),
                service_id: Number(b.service_id ?? 0),
                click_paydoc_id: b.click_paydoc_id ? String(b.click_paydoc_id) : undefined,
                merchant_trans_id: String(b.merchant_trans_id ?? ""),
                merchant_prepare_id: Number(b.merchant_prepare_id ?? 0),
                amount: Number(b.amount ?? 0),
                action: Number(b.action ?? 0),
                error: Number(b.error ?? 0),
                error_note: b.error_note ? String(b.error_note) : undefined,
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
                click_paydoc_id: p.get("click_paydoc_id") ?? undefined,
                merchant_trans_id: String(p.get("merchant_trans_id") ?? ""),
                merchant_prepare_id: Number(p.get("merchant_prepare_id") ?? 0),
                amount: Number(p.get("amount") ?? 0),
                action: Number(p.get("action") ?? 0),
                error: Number(p.get("error") ?? 0),
                error_note: p.get("error_note") ?? undefined,
                sign_time: String(p.get("sign_time") ?? ""),
                sign_string: String(p.get("sign_string") ?? ""),
            };
        }

        if (ct.includes("multipart/form-data")) {
            const fd = await req.formData();
            return {
                click_trans_id: String(fd.get("click_trans_id") ?? ""),
                service_id: Number(fd.get("service_id") ?? 0),
                click_paydoc_id: (fd.get("click_paydoc_id") as string) ?? undefined,
                merchant_trans_id: String(fd.get("merchant_trans_id") ?? ""),
                merchant_prepare_id: Number(fd.get("merchant_prepare_id") ?? 0),
                amount: Number(fd.get("amount") ?? 0),
                action: Number(fd.get("action") ?? 0),
                error: Number(fd.get("error") ?? 0),
                error_note: (fd.get("error_note") as string) ?? undefined,
                sign_time: String(fd.get("sign_time") ?? ""),
                sign_string: String(fd.get("sign_string") ?? ""),
            };
        }

        const url = new URL(req.url);
        if (url.searchParams.has("click_trans_id")) {
            const q = url.searchParams;
            return {
                click_trans_id: String(q.get("click_trans_id") ?? ""),
                service_id: Number(q.get("service_id") ?? 0),
                click_paydoc_id: q.get("click_paydoc_id") ?? undefined,
                merchant_trans_id: String(q.get("merchant_trans_id") ?? ""),
                merchant_prepare_id: Number(q.get("merchant_prepare_id") ?? 0),
                amount: Number(q.get("amount") ?? 0),
                action: Number(q.get("action") ?? 0),
                error: Number(q.get("error") ?? 0),
                error_note: q.get("error_note") ?? undefined,
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

        const body = await parseCompleteBody(req);
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
            merchant_prepare_id,
            amount,
            action,
            sign_time,
            sign_string,
            error,
        } = body;

        const secret = process.env.NEXT_PUBLIC_PAYMENT_SECRET_KEY || "";
        if (!secret) {
            return json(
                { error: ClickError.BadRequest, error_note: "CLICK_SECRET_KEY not set" },
                500
            );
        }

        const ok = clickCheckTokenComplete(
            {
                click_trans_id: String(click_trans_id),
                service_id,
                merchant_trans_id,
                merchant_prepare_id,
                amount,
                action,
                sign_time,
            },
            sign_string,
            secret
        );
        if (!ok) {

            return json({ error: ClickError.SignFailed, error_note: "Invalid sign" }, 400);
        }

        if (Number(action) !== ClickAction.Complete) {
            return json({ error: ClickError.ActionNotFound, error_note: "Action not found" }, 400);
        }

        const expected = ((Number(FIXED_AMOUNT) * 0.01) + Number(FIXED_AMOUNT));
        if (Number(amount) !== expected) {
            return json(
                { error: ClickError.InvalidAmount, error_note: "Incorrect parameter amount" },
                400
            );
        }

        const prepared = await ClickModel.findOne({
            prepare_id: Number(merchant_prepare_id),
            provider: "click",
        });

        if (!prepared) {
            return json(
                { error: ClickError.TransactionNotFound, error_note: "Transaction not found" },
                400
            );
        }

        const pinfl = prepared.user;
        console.log("Complate case in Prepared transaction found for user:", pinfl);
        const alreadyPaid = await ClickModel.findOne({
            user: pinfl,
            state: TransactionState.Paid,
            provider: "click",
        });
        if (alreadyPaid) {
            return json({ error: ClickError.AlreadyPaid, error_note: "Already paid for course" }, 400);
        }

        const trx = await ClickModel.findOne({ id: String(click_trans_id) });
        if (trx && trx.state === ClickError.TransactionCanceled) {
            return json(
                { error: ClickError.TransactionCanceled, error_note: "Transaction canceled" },
                400
            );
        }

        const time = Date.now();

        if (typeof error === "number" && error !== 0) {
            await ClickModel.findOneAndUpdate(
                { id: String(click_trans_id) },
                { state: ClickError.TransactionCanceled, cancel_time: time },
                { upsert: false }
            );

            return json(
                {
                    click_trans_id: String(click_trans_id),
                    merchant_trans_id: pinfl,
                    merchant_confirm_id: time,
                    error,
                    error_note: "Payment canceled",
                },
                200
            );
        }

        await ClickModel.findOneAndUpdate(
            { id: String(click_trans_id) },
            { state: TransactionState.Paid, perform_time: time, provider: "click" },
            { upsert: true }
        );

        const order = await OrderModel.findOne({ user: pinfl })
        console.log("Order found for user:", order);
        if (!order) {
            return json({ error: ClickError.TransactionNotFound, error_note: "Order not found" }, 400);
        }
        const admissionId = order?.admission_id;

        await ApplicationsModel.findOneAndUpdate({
            admission_id: admissionId,
            pinfl: pinfl,
        }, {
            payment_status: true,
            application_status: "paid",
        })

        await OrderModel.findOneAndUpdate(
            { user: merchant_trans_id },
            { status: true },
        );


        return json({
            click_trans_id: String(click_trans_id),
            merchant_trans_id: pinfl,
            merchant_confirm_id: time,
            error: ClickError.Success,
            error_note: "Success",
        });
    } catch (e) {
        console.error(e);
        return json({ error: ClickError.BadRequest, error_note: "Server error" }, 500);
    }
}
