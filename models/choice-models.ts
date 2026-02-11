import mongoose, { Schema, Document, Model } from "mongoose";

interface IChoice extends Document {
    choice: {
        uz: string;
        ru: string;
        eng: string;
        kaa: string;
    };
}

const ChoiceSchema: Schema = new Schema({
    choice: {
        uz: { type: String, required: true },
        ru: { type: String, required: true },
        eng: { type: String, required: true },
        kaa: { type: String, required: true },
    },
});


const ChoiceModel: Model<IChoice> =
    mongoose.models.Choice || mongoose.model<IChoice>("Choice", ChoiceSchema);

export default ChoiceModel;
