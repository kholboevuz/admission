import mongoose, { Schema, Document, Model } from "mongoose";

interface ModeratorApplications extends Document {
    application_id: string;
    moderator_pinfl: string;
    comment?: Array<{
        comment: string;
        files?: Array<string>;
        date: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const ModeratorApplicationsSchema: Schema = new Schema({
    application_id: { type: String, required: true },
    moderator_pinfl: { type: String, required: true },
    comment: [
        {
            comment: { type: String, },
            files: { type: [String] },
            date: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });

const ModeratorApplicationsModel: Model<ModeratorApplications> =
    mongoose.models.ModeratorApplications || mongoose.model<ModeratorApplications>("ModeratorApplications", ModeratorApplicationsSchema);

export default ModeratorApplicationsModel;