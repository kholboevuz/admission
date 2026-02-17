import mongoose, { Schema, Document, Model } from "mongoose";

export type ApplicationStatus = "draft" | "reviewed" | "submitted" | "paid" | "rejected" | "accepted" | "returned";

export interface IApplicationComment {
    comment: string;
    date: string;
    file?: string;
}

export interface IApplications extends Document {
    admission_id: string;
    step: number;
    pinfl: string;
    step_1: {
        phone_number: string;
        phone_number_additional?: string;
        email: string;
        choice: { id: string; name: string };
        isCertified: boolean;
        certificate_file?: string;
        exam_language?: string;
    };

    esse?: string;

    payment_status: boolean;
    application_status: ApplicationStatus;

    comments: IApplicationComment[];

    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IApplicationComment>(
    {
        comment: { type: String, required: true },
        date: { type: String, required: true },
        file: { type: String },
    },
    { _id: false }
);

const ApplicationsSchema = new Schema<IApplications>(
    {
        admission_id: { type: String, required: true, index: true },
        step: { type: Number, required: true, default: 1 },

        pinfl: { type: String, required: true, index: true },

        step_1: {
            phone_number: { type: String, required: true },
            phone_number_additional: { type: String },
            email: { type: String, required: true },
            choice: {
                id: { type: String, required: true },
                name: { type: String, required: true },
            },
            isCertified: { type: Boolean, required: true },
            certificate_file: { type: String },
            exam_language: { type: String },
        },

        esse: { type: String },

        payment_status: { type: Boolean, default: false },
        application_status: { type: String, default: "draft" },

        comments: { type: [CommentSchema], default: [] },
    },
    { timestamps: true, versionKey: false }
);

ApplicationsSchema.index({ admission_id: 1, pinfl: 1 }, { unique: true });

const ApplicationsModel: Model<IApplications> =
    mongoose.models.Applications ||
    mongoose.model<IApplications>("Applications", ApplicationsSchema);

export default ApplicationsModel;
