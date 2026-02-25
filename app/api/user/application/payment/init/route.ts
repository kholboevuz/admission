import OrderModel from "@/models/order-models";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}
export async function POST(req: NextRequest) {
    try {
        const { admission_id, amount } = await req.json();
        if (!admission_id || !amount) {
            return NextResponse.json({ success: false, error: "Required fields are missing" }, { status: 400 });
        }

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const checkOrder = await OrderModel.findOne({ user: pinfl, status: false, amount: amount, admission_id: admission_id });
        const paymentUrl = `https://my.click.uz/services/pay?service_id=${process.env.NEXT_PUBLIC_SERVICEID}&merchant_id=${process.env.NEXT_PUBLIC_MERCHANT_ID}&merchant_user_id=${process.env.NEXT_PUBLIC_MERCHANT_USER_ID}&amount=${amount}&transaction_param=${pinfl}&return_url=${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/user/application&card_type=humo`

        if (checkOrder) {
            const updatedOrder = await OrderModel.findByIdAndUpdate(checkOrder._id, { amount: amount }, { new: true });
            return NextResponse.json({ success: true, orderId: updatedOrder?._id, paymentUrl }, { status: 200 });
        }

        const order = await OrderModel.create({
            user: pinfl,
            amount: amount,
            admission_id: admission_id,
            status: false,
        });
        return NextResponse.json({ success: true, orderId: order._id, paymentUrl }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
