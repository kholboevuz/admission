import mongoose, { Schema, Model, Document } from "mongoose";

export type RelativeItem = {
    relation: string;
    fio: string;
    birth: string;
    job: string;
    address: string;
};

export type MalumotnomaPayload = {
    orgLine1: string;
    orgLine2: string;

    birthYear: string;
    birthPlace: string;
    nationality: string;
    party: string;
    education: string;
    specialty: string;
    degree: string;
    title: string;
    languages: string;
    awards: string;
    deputy: string;

    relatives: RelativeItem[];
};

export interface IMalumotnoma extends Document {
    pinfl: string;
    full_name?: string | null; // snapshot (ixtiyoriy)
    passport_series_number?: string | null; // snapshot (ixtiyoriy)
    payload: MalumotnomaPayload;
    status: boolean;
    updatedAt: Date;
}

const RelativeSchema = new Schema<RelativeItem>(
    {
        relation: { type: String, required: true },
        fio: { type: String, required: true },
        birth: { type: String, required: true },
        job: { type: String, required: true },
        address: { type: String, required: true },
    },
    { _id: false }
);

const PayloadSchema = new Schema<MalumotnomaPayload>(
    {
        orgLine1: { type: String, required: true },
        orgLine2: { type: String, required: true },

        birthYear: { type: String, required: true },
        birthPlace: { type: String, required: true },
        nationality: { type: String, required: true },
        party: { type: String, required: true },
        education: { type: String, required: true },
        specialty: { type: String, required: true },
        degree: { type: String, required: true },
        title: { type: String, required: true },
        languages: { type: String, required: true },
        awards: { type: String, required: true },
        deputy: { type: String, required: true },

        relatives: { type: [RelativeSchema], default: [], required: true },
    },
    { _id: false }
);

const MalumotnomaSchema = new Schema<IMalumotnoma>(
    {
        pinfl: { type: String, required: true, unique: true, index: true },

        full_name: { type: String, default: null },
        passport_series_number: { type: String, default: null },

        payload: { type: PayloadSchema, required: true },

        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const MalumotnomaModel: Model<IMalumotnoma> =
    mongoose.models.Malumotnoma ||
    mongoose.model<IMalumotnoma>("Malumotnoma", MalumotnomaSchema);

export default MalumotnomaModel;
