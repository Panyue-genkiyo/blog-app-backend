import express from "express";
import authCtrl from "../controllers/authCtrl";
import { validRegister } from "../middlewares/vaild";
import { auth } from "../middlewares/auth";

const router = express.Router();

router.post('/register', validRegister , authCtrl.register);
router.post('/active', authCtrl.activeAccount);
router.post('/login', authCtrl.login);
router.post('/google_login', authCtrl.googleLogin);
router.post('/facebook_login', authCtrl.facebookLogin);
router.get('/logout', auth,  authCtrl.loginOut);
router.get('/refresh_token', authCtrl.refreshToken);
router.post('/forgot_password', authCtrl.forgotPassword);

export default router;
