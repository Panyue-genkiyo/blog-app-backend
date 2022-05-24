import { Request, Response } from 'express';
import  Comments  from '../models/commentModel';
import { IReqAuth } from "../config/interface";
import mongoose from "mongoose";
import { io } from '../index';


const Pagination = (req: Request) => {
    let page =  +req.query.page || 1;
    let limit = +req.query.limit || 4;
    let skip = (page - 1) * limit;
    return {
        page,
        limit,
        skip
    }
}


const commentCtrl = {
    createComment: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).send({message: '未登录无权限操作'});
        try{
            const { content, blog_id, blog_user_id } = req.body;
            const newComment = new Comments({
                user: req.user._id,
                content,
                blog_id,
                blog_user_id,
            });

            const data = {
                ...newComment._doc,
                user: req.user,
                createdAt: new Date().toISOString()
            }

            io.to(`${blog_id}`).emit('comment', blog_id);
            await newComment.save();
            res.json(newComment);
        }catch (err: any){
            return res.status(500).json({ msg: err.message })
        }
    },
    getComments: async (req: Request, res: Response) => {
        const { limit, skip } = Pagination(req);
        try{
            const data = await Comments.aggregate([
                {
                    $facet:{
                        totalData: [
                            {
                                $match: {
                                    blog_id: new mongoose.Types.ObjectId(req.params.blog_id),
                                    comment_root: {
                                        $exists: false
                                    },
                                    reply_user:{
                                        $exists: false
                                    }
                                }
                            },
                            {
                                $lookup:{
                                    from: 'users',
                                    let:{ user_id: "$user" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: [ "$_id", "$$user_id" ] }}},
                                        { $project: { name: 1, avatar:1 } }
                                    ],
                                    as: 'user'
                                }
                            },
                            {
                                $unwind: '$user',
                            },
                            {
                               $lookup:{
                                   from: 'comments',
                                   let:{ cm_id: '$replyCM'},
                                   pipeline:[
                                       {$match: { $expr: { $in: [ "$_id", "$$cm_id" ] } } },
                                       {
                                           $lookup: {
                                               from: 'users',
                                               let:{ user_id: "$user" },
                                               pipeline: [
                                                   { $match: { $expr: { $eq: [ "$_id", "$$user_id" ] }}},
                                                   { $project: { name: 1, avatar:1 } }
                                               ],
                                               as: 'user'
                                           }
                                       },
                                       {
                                           $unwind: '$user',
                                       },
                                       {
                                           $lookup: {
                                               from: 'users',
                                               let:{ user_id: "$reply_user" },
                                               pipeline: [
                                                   { $match: { $expr: { $eq: [ "$_id", "$$user_id" ] }}},
                                                   { $project: { name: 1, avatar:1 } }
                                               ],
                                               as: 'reply_user'
                                           }
                                       },
                                       {
                                           $unwind: '$reply_user',
                                       }
                                   ],
                                   as: 'replyCM'
                               }
                            },
                            {
                               $sort: { createdAt: -1 }
                            },
                            {
                                $skip: skip
                            },
                            {
                                $limit: limit
                            }
                        ],
                        totalCount: [
                            {
                                $match: {
                                    blog_id: new mongoose.Types.ObjectId(req.params.blog_id),
                                    comment_root: {
                                        $exists: false
                                    },
                                    reply_user:{
                                        $exists: false
                                    }
                                },
                            },
                            {
                                $count: 'count'
                            }
                        ]
                    }
                },
                {
                    $project:{
                        count: { $arrayElemAt: ['$totalCount.count', 0] },
                        totalData: 1
                    }
                }
            ]);
            let comments = data[0].totalData;
            const count = data[0].count;


            let total = 0;
            if(count % limit === 0) {
                total = count / limit;
            }else{
                total = Math.floor(count / limit) + 1;
            }

            if(count === undefined) total = 0;

            return res.json({comments,total});
        }catch (err: any){
            return res.status(500).json({ msg: err.message })
        }
    },
    replyComment: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).send({message: '未登录无权限操作'});
        try{
            const { content, blog_id, blog_user_id, comment_root, reply_user } = req.body;
            const newComment = new Comments({
                user: req.user._id,
                content,
                blog_id,
                blog_user_id,
                comment_root,
                reply_user: reply_user._id
            });
            await Comments.findOneAndUpdate({_id: comment_root}, {
                $push:{
                    replyCM: newComment._id
                }
            })
            const data = {
                ...newComment._doc,
                user: req.user,
                reply_user,
                createdAt: new Date().toISOString()
            }
            io.to(`${blog_id}`).emit('replyComment', data);
            await newComment.save();
            res.json(newComment);
        }catch (err: any){
            return res.status(500).json({ msg: err.message })
        }
    },
    updateComment: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).send({message: '未登录无权限操作'});
        try{
            const { data } = req.body;
            //socket.io
            io.to(`${data.blog_id}`).emit('updateComment', data);

            const comment = await Comments.findOneAndUpdate({
                _id: req.params.id, //要更新的某条评论id
                user: req.user._id //用户id
            }, { content: data.content });

            if(!comment) return res.status(404).send({message: '评论不存在'});

            return res.json({ msg: '更新成功' });
        }catch (err:any){
            return res.status(500).json({ msg: err.message })
        }
    },
    deleteComment: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).send({message: '未登录无权限操作'});
        try{
            const comment = await Comments.findOneAndDelete({
                _id: req.params.id,
                $or:[
                    { user: req.user._id },
                    { blog_user_id: req.user._id }
                ]
            });
            if(!comment) return res.status(404).send({message: '评论不存在'});

            if(comment.comment_root){
                //删除回复中的特定一条
                await Comments.findOneAndUpdate({
                    _id: comment.comment_root,
                }, {
                    $pull: { replyCM: comment._id }
                });
            }else{
                //删除所有回复
                await Comments.deleteMany({
                        _id: {$in: comment.replyCM}
                    });
            }

            io.to(`${comment.blog_id}`).emit('comment', comment.blog_id);

            return res.json({ msg: '删除成功' });
        }catch (err:any){
            return res.status(500).json({ msg: err.message })
        }
    }
}



export default commentCtrl;
