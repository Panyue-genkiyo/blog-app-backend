import jwt from 'jsonwebtoken';
import { Response} from 'express'
const {
    ACTIVE_TOKEN_SECRET ,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET
} = process.env;


export const generateActiveToken = (payload: object) => {
     return jwt.sign(payload,`${ACTIVE_TOKEN_SECRET}`, { expiresIn: '5m' });
};

export const generateAccessToken = (payload: object) => {
    return jwt.sign(payload, `${ACCESS_TOKEN_SECRET}`, { expiresIn: '1d' });
};

export const generateRefreshToken = (payload: object, res: Response) => {
    const refresh_token =  jwt.sign(payload, `${REFRESH_TOKEN_SECRET}`, { expiresIn: '1d' });
    res.cookie('refreshtoken', refresh_token, {
        sameSite: 'none',
        secure: true,
        httpOnly: true,
        path: '/api/refresh_token',
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
    return refresh_token;
};
