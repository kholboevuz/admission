import mongoose, { Schema, Document, Model } from "mongoose";

export type EducationType = "bachelor" | "master";

export interface IInternationalDiploma extends Document {
    pinfl: string;
    university: string;
    direction: string;
    educationType: EducationType;
    diplomaNumber: string;
    diplomaFilePath: string;
    nostrificationFilePath: string;
    createdAt: Date;
    updatedAt: Date;
}

const InternationalDiplomaSchema = new Schema<IInternationalDiploma>(
    {
        pinfl: { type: String, required: true, index: true },
        university: { type: String, required: true },
        direction: { type: String, required: true },
        educationType: { type: String, enum: ["bachelor", "master"], required: true },
        diplomaNumber: { type: String, required: true },
        diplomaFilePath: { type: String, required: true },
        nostrificationFilePath: { type: String, required: true },
    },
    { timestamps: true }
);

const InternationalDiplomaModel: Model<IInternationalDiploma> =
    mongoose.models.InternationalDiploma ||
    mongoose.model<IInternationalDiploma>("InternationalDiploma", InternationalDiplomaSchema);

export default InternationalDiplomaModel;
