import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStaff extends Document {
    firstname: string;
    lastname: string;

    pinfl: string;
    document: string;
    brithday: Date;

    role: "admin" | "modirator";
    status: boolean;

    allowedIps: string[];

    encData?: string;
    keyId?: string;

    createdAt: Date;
    updatedAt: Date;
}

const StaffSchema: Schema = new Schema(
    {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },

        pinfl: { type: String, required: true, unique: true, index: true },
        document: { type: String, required: true, index: true },
        brithday: { type: Date, required: true },

        role: { type: String, enum: ["admin", "modirator"], required: true },
        status: { type: Boolean, default: true },

        allowedIps: { type: [String], default: [] },

        encData: { type: String },
        keyId: { type: String },
    },
    { timestamps: true }
);

const StaffModel: Model<IStaff> =
    mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);

export default StaffModel;