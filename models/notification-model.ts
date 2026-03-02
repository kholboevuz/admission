import mongoose, { Schema, Document, Model } from "mongoose";

interface Notification extends Document {
    admission_id: string;
    users: string[];
    title: string;
    file?: string;
    comment: string;
    unRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
    admission_id: { type: String, required: true },
    users: { type: [String], required: true },
    title: { type: String, required: true },
    file: { type: String },
    unRead: { type: Boolean, default: true },
    comment: { type: String, required: true },
}, { timestamps: true });

const NotificationModel: Model<Notification> =
    mongoose.models.Notification || mongoose.model<Notification>("Notification", NotificationSchema);

export default NotificationModel;