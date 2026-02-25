import mongoose, { Schema, Document, Model } from "mongoose";

interface Order extends Document {
    user: string;
    amount: number;
    status: boolean;
    admission_id: string;
}
const OrderSchema: Schema = new Schema({
    user: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: Boolean, default: false },
    admission_id: { type: String, required: true },
});

const OrderModel: Model<Order> =
    mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default OrderModel;