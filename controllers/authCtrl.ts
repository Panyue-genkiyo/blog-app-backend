import {Request, Response} from 'express'
import User from '../models/userModel'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import {OAuth2Client} from "google-auth-library";
import fetch from "cross-fetch";
import {generateActiveToken, generateAccessToken, generateRefreshToken} from '../config/generateToken';
import sendEmail from "../config/sendEmail";
import {validateEmail} from "../middlewares/vaild";
import {IDecodedToken, IUser, IGgPayload, IUserParams, IReqAuth} from "../config/interface";

const client = new OAuth2Client(`${process.env.MAIL_CLIENT_ID}`);
const CLIENT_URL = `${process.env.BASE_URL}`;

//登录账户
const loginUser = async (user: IUser, password: string, res: Response) => {

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        let msgError = user.type === 'register' ? '密码错误' : `密码错误，这个账号是用${user.type}快速登入的`;
        return res.status(400).json({msg: msgError});
    }

    const access_token = generateAccessToken({id: user._id});
    const refresh_token = generateRefreshToken({id: user._id}, res);

    await User.findOneAndUpdate({_id: user._id}, {
        rf_token: refresh_token,
    });

    console.log(refresh_token);

    res.json({
        msg: '登录成功',
        access_token,
        user: {
            ...user._doc,
            password: '',
        }
    })
}

//注册账户
const registerUser = async (user: IUserParams, res: Response) => {
    const newUser = new User(user);
    const access_token = generateAccessToken({id: newUser._id});
    const refresh_token = generateRefreshToken({id: newUser._id}, res);


    newUser.rf_token = refresh_token;
    await newUser.save();

    res.json({
        msg: '登录成功',
        access_token,
        user: {
            ...newUser._doc,
            password: '',
        }
    })
}

const authCtrl = {
    register: async (req: Request, res: Response) => {
        try {
            const {name, account, password} = req.body
            const user = await User.findOne({account});
            if (user) {
                return res.status(400).json({msg: '邮箱已经存在'})
            }
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = {
                name,
                account,
                password: passwordHash,
            }
            const active_token = generateActiveToken({newUser});

            const url = `${CLIENT_URL}/active/${active_token}`

            if (validateEmail(account)) {
                sendEmail(account, url, '激活邮件');
                return res.json({msg: '邮件已发送，请前往邮箱激活'})
            }

        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    activeAccount: async (req: Request, res: Response) => {
        try {
            const {active_token} = req.body;
            const decoded = <IDecodedToken>jwt.verify(active_token, `${process.env.ACTIVE_TOKEN_SECRET}`);
            const {newUser} = decoded;
            if (!newUser) return res.status(400).json({msg: '无效的激活token',})
            const user = await User.findOne({account: newUser.account});
            if (user) return res.status(400).json({msg: '用户已存在'})
            const new_user = new User(newUser);
            await new_user.save();
            res.json({msg: "账户已被激活成功"});

        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    login: async (req: Request, res: Response) => {
        try {
            const {account, password} = req.body;
            const user = await User.findOne({account});
            if (!user) return res.status(400).json({msg: '该账户不存在'});
            loginUser(user, password, res);
        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    loginOut: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(400).json({msg: '请先登录'})
        try {
            res.clearCookie('refreshtoken', {
                path: '/api/refresh_token',
            });
            await User.findOneAndUpdate({_id: req.user._id}, {
                rf_token: '',
            });
        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    refreshToken: async (req: Request, res: Response) => {
        try {
            const rf_token = req.cookies.refreshtoken;
            if (!rf_token) return res.status(400).json({msg: '登录状态已过期,请先登录'});
            const decoded = <IDecodedToken>jwt.verify(rf_token, `${process.env.REFRESH_TOKEN_SECRET}`);
            if (!decoded.id) return res.status(400).json({msg: '登录状态已过期,请先登录'});

            const user = await User.findById(decoded.id).select('-password +rf_token');
            if (!user) return res.status(400).json({msg: '该账户不存在'});

            if(rf_token !== user.rf_token) return res.status(400).json({msg: '登录状态已过期,请先登录'});

            const access_token = generateAccessToken({id: user._id});
            const refresh_token = generateRefreshToken({id: user._id}, res);

            await User.findOneAndUpdate({_id: user._id}, {
                rf_token: refresh_token,
            });

            res.json({
                access_token,
                user,
            });
        } catch (err: any) {
            return res.status(400).json({msg: '登录状态已过期,请先登录'})
        }
    },
    googleLogin: async (req: Request, res: Response) => {
        try {
            const {id_token} = req.body;
            const verify = await client.verifyIdToken({
                idToken: id_token,
                audience: `${process.env.MAIL_CLIENT_ID}`
            });
            const {
                email,
                email_verified,
                name,
                picture
            } = <IGgPayload>verify.getPayload();

            if (!email_verified) return res.status(500).json({msg: "邮箱未验证"});

            const password = email + 'wearyou1432!qwakl';
            const passwordHash = await bcrypt.hash(password, 12);
            const user = await User.findOne({account: email});
            if (user) {
                loginUser(user, password, res);
            }else if(!user){
                const newUser = {
                    name,
                    account: email,
                    password: passwordHash,
                    avatar: picture,
                    type: 'google',
                }
                registerUser(newUser, res);
            }
        } catch (err: any) {
            console.log(err);
            return res.status(500).json({msg: err.message})
        }
    },
    facebookLogin: async (req: Request, res: Response) => {
        try {
            const {accessToken, userID} = req.body;
            const URL = `https://graph.facebook.com/v3.0/${userID}?fields=id,name,email,picture&access_token=${accessToken}`;

            //cross-fetch请求解决跨域问题
            const data = await fetch(URL).then(res => res.json())
                .then(res => res);

            console.log(data);

            const {email, name, picture} = data;

            const password = email + '(eK6AAfH.jW?)Am';
            const passwordHash = await bcrypt.hash(password, 12);
            const user = await User.findOne({account: email});
            console.log(user);
            if (user){
                loginUser(user, password, res);
            }else{
                const newUser = {
                    name,
                    account: email,
                    password: passwordHash,
                    avatar: picture.data.url,
                    type: 'facebook',
                }
                registerUser(newUser, res);
            }

        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    forgotPassword: async (req: Request, res: Response) => {
        try{
            const { account } = req.body
            const user = await User.findOne({account});
            if(!user) return res.status(400).json({msg: '该账户不存在'});
            if(user.type !== 'register')
                return res.status(400).json({msg: `使用${user.type}快速登录的账号无需修改密码`});
            const access_token = generateAccessToken({id: user._id});
            const url = `${CLIENT_URL}/reset_password/${access_token}`;
            if(validateEmail(account)){
                sendEmail(account, url, '忘记密码');
                return res.json({ msg: '邮件已发送成功，请检查您的邮箱' });
            }
        }catch (err:any){
            res.status(500).json({msg: err.message})
        }
    }
}

export default authCtrl;
