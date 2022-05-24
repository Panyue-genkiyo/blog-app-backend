import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { Socket, Server } from 'socket.io';
import { createServer } from 'http';
import routes from "./routes";

// 中间件
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: `${process.env.BASE_URL}`,
    credentials:true,
}))
app.use(morgan('dev'))
app.use(cookieParser())

//socket.io 及时通讯
const http = createServer(app);
export const io = new Server(http, {
    cors: {
        origin: `${process.env.BASE_URL}`,
        credentials:true
    }
});
import { SocketServer } from './config/socket'

io.on('connection', (socket: Socket) =>  SocketServer(socket));


//路由
app.use('/api', routes)

//数据库
import './config/database'

//服务器监听
const PORT = process.env.PORT || 5001
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});
