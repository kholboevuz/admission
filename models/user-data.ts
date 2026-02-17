import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUsersData extends Document {
    pinflHash: string;
    encData: string;
    keyId: string;
    createdAt: Date;
    updatedAt: Date;
}

const UsersDataSchema = new Schema<IUsersData>(
    {
        pinflHash: { type: String, required: true, index: true, unique: true },
        encData: { type: String, required: true },
        keyId: { type: String, required: true, default: "v1" },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const UsersDataModel: Model<IUsersData> =
    (mongoose.models.UsersData as Model<IUsersData>) ||
    mongoose.model<IUsersData>("UsersData", UsersDataSchema);

export default UsersDataModel;