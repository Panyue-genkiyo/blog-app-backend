const nodeMailer = require('nodemailer');
import {OAuth2Client} from 'google-auth-library'

const OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';
const CLIENT_ID = `${process.env.MAIL_CLIENT_ID}`;
const CLIENT_SECRET = `${process.env.MAIL_CLIENT_SECRET}`;
const REFRESH_TOKEN = `${process.env.MAIL_REFRESH_TOKEN}`;
const SENDER_MAIL = `${process.env.SENDER_EMAIL_ADDRESS}`;


//发送邮件
const sendEmail = async (to: string, url: string, txt: string) => {
    const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, OAUTH_PLAYGROUND);
    oAuth2Client.setCredentials({
        refresh_token: REFRESH_TOKEN
    });
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: SENDER_MAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                access_token: accessToken
            }
        });
        const mailOptions = {
            from: SENDER_MAIL,
            to: to,
            subject: 'blog-app',
            html: `
               <div style="max-width: 700px; margin:auto; border: 10px solid #ddd; padding: 50px 20px; font-size: 110%;">
              <h2 style="text-align: center; text-transform: uppercase;color: teal;">Welcome to the pan's blog-app.</h2>
              <p>
              恭喜！您可以开始该个人博客系统。
               只需单击下面的按钮即可验证您的电子邮件地址。
              </p>
              
              <a href=${url} style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block;">${txt}</a>
          
              <p>如果按钮因任何原因不起作用，您也可以单击下面的链接：</p>
          
              <div>${url}</div>
              </div>
            `
        }
        const result = await transport.sendMail(mailOptions);
        return result;
    }catch (err){
        console.log(err.stack);
    }
}

export default sendEmail;
