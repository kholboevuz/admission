import crypto from "crypto";

export type ClickHashComplete = {
    click_trans_id: string | number;
    service_id: number;
    merchant_trans_id: string;
    merchant_prepare_id?: number | string | null;
    amount: number;
    action: number;
    sign_time: string;
};

export type ClickHashPrepare = {
    click_trans_id: string | number;
    service_id: number;
    merchant_trans_id: string;
    amount: number;
    action: number;
    sign_time: string;
};

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

export function clickCheckTokenComplete(
    data: ClickHashComplete,
    signString: string,
    secret: string
) {
    const {
        click_trans_id,
        service_id,
        merchant_trans_id,
        merchant_prepare_id,
        amount,
        action,
        sign_time,
    } = data;

    const prepareId = merchant_prepare_id ?? "";
    const signature = `${click_trans_id}${service_id}${secret}${merchant_trans_id}${prepareId}${amount}${action}${sign_time}`;
    return md5(signature) === signString;
}

export function clickCheckTokenPrepare(
    data: ClickHashPrepare,
    signString: string,
    secret: string
) {
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time } = data;
    const signature = `${click_trans_id}${service_id}${secret}${merchant_trans_id}${amount}${action}${sign_time}`;
    return md5(signature) === signString;
}
