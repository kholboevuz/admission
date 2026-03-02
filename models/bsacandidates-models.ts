import mongoose, { Schema, Document, Model } from "mongoose";

interface IBSACandidates extends Document {
    admissionId: string;
    candidates: Array<{
        pinfl: string;
        choice: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const BSACandidatesSchema: Schema = new Schema({
    admissionId: { type: String, required: true },
    candidates: [
        {
            pinfl: { type: String, required: true },
            choice: { type: String, required: true },
        },
    ],
}, { timestamps: true });


const BSACandidatesModel: Model<IBSACandidates> =
    mongoose.models.BSACandidates || mongoose.model<IBSACandidates>("BSACandidates", BSACandidatesSchema);

export default BSACandidatesModel;
