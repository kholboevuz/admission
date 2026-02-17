import mongoose, { Schema, Document, Model } from "mongoose";

interface Order extends Document {
    user: string;
    status: boolean;
}
const OrderSchema: Schema = new Schema({
    user: { type: String, required: true },
    status: { type: Boolean, default: false },
});

const OrderModel: Model<Order> =
    mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default OrderModel;