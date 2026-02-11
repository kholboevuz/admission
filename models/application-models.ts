import mongoose, { Schema, Document, Model } from "mongoose";

interface IApplications extends Document {
    admission_id: string;
    step: number;
    pinfl: string;
    step_1: {
        phone_number: string;
        phone_number_additional: string;
        email: string;
        choice: {
            id: string;
            name: string;
        },
        isCertified: boolean;
        certificate_file: string;
        exam_language: string;
    },
    esse: string;
    payment_status: boolean;
    application_status: string;
    comments: [{
        comment: string;
        date: string;
        file: string;
    }];
}

const ApplicationsSchema: Schema = new Schema({
    admission_id: { type: String, required: true },
    step: { type: Number, required: true },
    pinfl: { type: String, required: true },
    step_1: {
        phone_number: { type: String, required: true },
        phone_number_additional: { type: String, required: false },
        email: { type: String, required: true },
        choice: {
            id: { type: String, required: true },
            name: { type: String, required: true },
        },
        isCertified: { type: Boolean, required: true },
        certificate_file: { type: String },
        exam_language: { type: String },
    },
    esse: { type: String, required: false },
    payment_status: { type: Boolean, default: false },
    application_status: { type: String, default: "draft" },
    comments: [{
        comment: { type: String },
        date: { type: String },
        file: { type: String },
    }],
});

const ApplicationsModel: Model<IApplications> =
    mongoose.models.Applications || mongoose.model<IApplications>("Applications", ApplicationsSchema);

export default ApplicationsModel;
