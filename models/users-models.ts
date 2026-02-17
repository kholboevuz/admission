import mongoose, { Schema, Document, Model } from "mongoose";

interface IUsers extends Document {
    firstname: string;
    lastname: string;
    password: string;
    document: string;
    brithday: Date;
    role: string;
    status: boolean;
    pinfl: string;
}

const UsersSchema: Schema = new Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    password: { type: String, required: true },
    document: { type: String, required: true },
    brithday: { type: Date, required: true },
    role: { type: String, required: true },
    status: { type: Boolean, default: true },
    pinfl: { type: String, required: true },
});


const UsersModel: Model<IUsers> =
    mongoose.models.Users || mongoose.model<IUsers>("Users", UsersSchema);

export default UsersModel;
