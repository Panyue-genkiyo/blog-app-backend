import {Response, Request} from 'express';
import {IReqAuth} from "../config/interface";
import User from '../models/userModel';
import bcrypt from "bcrypt";
import { io } from '../index';

const userCtrl = {
    updateUser: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({message: '无权限操作'});
        try{
             const { avatar, name } = req.body;
             const user = await User.findByIdAndUpdate({ _id: req.user._id }, {avatar, name}, {new: true}).select({
                 password: 0,
                 __v: 0,
                 updatedAt: 0
             });
             if(name !== user.name){
                 io.to('home').emit('getNewHomeBlogs');
                 io.to('home').emit('getNewUserInfoInCategoryBlog');
                 io.to('home').emit('getNewBlog');
             }
             io.to('home').emit('getNewComment');
             io.to(`profile_${user._id.toString()}`).emit('updateUser', user);
             res.json({ msg: '更新成功' });
        }catch (err){
             res.status(500).json({ msg: err.message});
        }
    },
    resetPassword: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({message: '无权限操作'});
        if(req.user.type !== 'register') return res.status(401).json({message: `使用${req.user.type}快速登录的账户不能修改密码`});
        try{
            const { password } = req.body;
            const passwordHash = await bcrypt.hash(password, 12);
            await User.findByIdAndUpdate({ _id: req.user._id }, {
                password: passwordHash
            });
            res.json({ msg: '更新成功' });
        }catch (err){
            res.status(500).json({ msg: err.message});
        }
    },
    getUser: async (req: Request,res: Response) => {
        try{
            const user = await User.findById(req.params.id).select('-password');
            res.json(user);
        }catch (err){
            res.status(500).json({ msg: err.message});
        }
    }
};

export default userCtrl;
