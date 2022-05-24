import { Request, Response, NextFunction } from 'express';

//检查邮箱格式
export const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

//检查电话号码格式
// export const validatePhone = (phone: string) => {
//     //中国手机号
//     return (/^1[0-9]{10}$/).test(phone);
// };

export const validRegister = async (req: Request, res: Response, next:NextFunction ) => {
    const { name, account, password } = req.body;

    const errors = [];

    if(!name){
        errors.push('请添加昵称')
    }else if(name.length > 20){
        errors.push('昵称不能超过20个字符');
    }

    if(!account){
        errors.push('请添加账号(邮箱或手机号)')
    }else if(!validateEmail(account)){
        errors.push('请添加正确的邮箱',)
    }

    if(!password){
        errors.push('请添加密码',);
    }else if(password.length < 6){
        errors.push('密码不能少于6位');
    }

    if(errors.length > 0) return res.status(400).json({msg:errors});

    next();

}
