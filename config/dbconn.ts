
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI muhit o'zgaruvchisi mavjud emas!");
}

const globalForMongoose = global as unknown as { mongoose?: typeof mongoose };

export const connectDB = async () => {
    if (globalForMongoose.mongoose) {
        console.log("MongoDB allaqachon ulangan.");
        return globalForMongoose.mongoose;
    }

    try {
        const connection = await mongoose.connect(MONGODB_URI, {
            dbName: "admission",
        });

        return connection;
    } catch (error) {
        console.error("MongoDB-ga ulanishda xatolik:", error);
        throw error;
    }
};