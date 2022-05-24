import { Response, NextFunction } from 'express';
import User from '../models/userModel';
import jwt from 'jsonwebtoken';
import { IDecodedToken } from '../config/interface';
import { IReqAuth } from "../config/interface";

/*更新用户中间件*/
export const auth = async (req: IReqAuth, res: Response, next: NextFunction) => {
    try{
        const token = req.header('Authorization');
        if(!token) return res.status(500).json({ msg: '无权限操作' });
        const decoded = <IDecodedToken>jwt.verify(token, `${process.env.ACCESS_TOKEN_SECRET}`);
        if(!decoded) return res.status(500).json({ msg: '无权限操作' });
        const user = await User.findOne({_id: decoded.id}).select('-password');
        if(!user) return res.status(500).json({ msg: '用户未登录无权限操作' });
        req.user = user;
        next();
    }catch (err:any){
        return res.status(500).json({msg: err.message})
    }
}
