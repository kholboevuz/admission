import mongoose, { Schema, Document, Model } from "mongoose";

interface IAdmission extends Document {
    title: string;
    starter_date: string;
    end_date: string;
    admission_type: Array<{
        name: string;
        id: string;
    }>;
    choices: Array<{
        name: string;
        id: string;
    }>;
    uuuid: string;
    status: boolean;
}

const AdmissionSchema: Schema = new Schema({
    title: { type: String, required: true },
    starter_date: { type: String, required: true },
    end_date: { type: String, required: true },
    admission_type: [
        {
            name: { type: String, required: true },
            id: { type: String, required: true },
        },
    ],
    choices: [
        {
            name: { type: String, required: true },
            id: { type: String, required: true },
        },
    ],
    uuuid: { type: String, required: true },
    status: { type: Boolean, required: true },
});


const AdmissionModel: Model<IAdmission> =
    mongoose.models.Admission || mongoose.model<IAdmission>("Admission", AdmissionSchema);

export default AdmissionModel;
