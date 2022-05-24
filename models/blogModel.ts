import mongoose from "mongoose";
import { IBlog } from "../config/interface";

const blogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 5,
        maxLength: 50
    },
    content: {
        type: String,
        required: true,
        minLength: 20,
    },
    description:{
        type: String,
        required: true,
        trim: true,
        minLength: 10,
        maxLength: 200
    },
    thumbnail: {
        type: String,
        default: 'https://images.pexels.com/photos/3586966/pexels-photo-3586966.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    },
    profileBlogThumbnail:{
        type: String,
        default: 'https://images.pexels.com/photos/11419080/pexels-photo-11419080.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500'
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: 'category'
    },
    likes: {
        type: [{
            type: mongoose.Types.ObjectId,
            ref: 'User'
        }],
    },
    saved: {
        type: [{
            type: mongoose.Types.ObjectId,
            ref: 'User'
        }],
    },
    savedLength: {
        type: Number,
        default: 0,
    },
    likesLength: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true
});

export default mongoose.model<IBlog>("Blog", blogSchema);
