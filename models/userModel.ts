import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, '请添加昵称'],
        trim: true,
        maxlength: [20, '昵称不能超过20个字符'],
    },
    account:{
        type: String,
        unique:true,
        required: [true, '请添加邮箱或者你的电话号码'],
        trim: true,
    },
    password:{
        type: String,
        required: [true, '请添加密码']
    },
    avatar:{
        type:String,
        default: 'https://res.cloudinary.com/devatchannel/image/upload/v1602752402/avatar/avatar_cugq40.png'
    },
    role:{
        type: String,
        default: 'user',
    },
    type: {
        type: String,
        default: 'register' // fast
    },
    rf_token:{
        type: String,
        select:false
    }
}, {
    timestamps: true,
});


export default mongoose.model('User', userSchema);
