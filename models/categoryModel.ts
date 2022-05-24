import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, '请添加分类'],
        trim: true,
        unique: true,
        maxlength: [50, '分类名称不能超过50个字符']
    }
}, {
    timestamps: true,
});

export default mongoose.model("Category", categorySchema);
