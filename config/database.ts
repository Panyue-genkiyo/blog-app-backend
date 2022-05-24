import mongoose from "mongoose";

const dbURI = process.env.MONGODB_URI;

mongoose.connect(`${dbURI}`, {
    autoIndex: true,
},(err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to MongoDB successfully!");
    }
});

