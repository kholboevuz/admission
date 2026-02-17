import mongoose, { Schema, Document, Model } from "mongoose";

interface Click extends Document {
    id: string;
    user: string;
    amount: number;
    provider: string;
    state: number;
    create_time: number;
    prepare_id: number;
    perform_time: number;
    cancel_time: number;
}

const ClickSchema: Schema = new Schema({
    id: { type: String, index: true },
    user: { type: String, index: true },
    amount: { type: Number, required: true },
    provider: { type: String, default: "click" },
    state: { type: Number, default: 1 },
    create_time: { type: Number },
    prepare_id: { type: Number },
    perform_time: { type: Number },
    cancel_time: { type: Number },
});


const ClickModel: Model<Click> =
    mongoose.models.Click || mongoose.model<Click>("Click", ClickSchema);

export default ClickModel;