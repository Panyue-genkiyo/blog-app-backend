import {Request, Response} from "express";
import Blogs from '../models/blogModel';
import Comments from "../models/commentModel";
import { IReqAuth } from '../config/interface';
import mongoose from 'mongoose';
import { io } from '../index';

const Pagination = (req: Request) => {
    let page =  +req.query.page || 1;
    let limit = +req.query.limit || 3;
    let sort: any = req.query.sort || '-createdAt';
    switch (sort){
        case '-createdAt':
            sort = {createdAt: -1};
            break;
        case 'createdAt':
            sort = {createdAt: 1};
            break;
        case 'likes':
            sort = {likesLength: -1};
            break;
        case '-likes':
            sort = {likesLength: 1};
            break;
        case 'saved':
            sort = {savedLength: -1};
            break;
        case '-saved':
            sort = {savedLength: 1};
            break;
    }
    let skip = (page - 1) * limit;
    return {
        page,
        limit,
        skip,
        sort
    }
}

const blogCtrl = {
    createBlog: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({ msg: '没有权限操作，请先登录' });

        try{
            const { title, content, description, thumbnail, category, profileBlogThumbnail } = req.body;
            const newBlog = new Blogs({
                user: req.user._id,
                title: title.toLowerCase(),
                content,
                description,
                thumbnail,
                category,
                profileBlogThumbnail
            })
            await newBlog.save();
            io.to('home').emit('getNewHomeBlogs');
            io.to(`categoryId_${newBlog.category.toString()}`).emit('upCategoryBlogs', newBlog.category.toString());
            io.to(`profile_${req.user._id}`).emit('createBlog', newBlog);
            res.json({
                ...newBlog._doc,
                user: req.user._id
            });

        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    getHomeBlogs: async (req: Request, res: Response) => {
        const { limit, skip, page } = Pagination(req);
        try{
            const data = await Blogs.aggregate([
                {
                    $facet: {
                        totalData: [
                            {
                                $lookup:{
                                    from: 'users',
                                    let: { user_id: "$user"},
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
                                        { $project: { password: 0 } }
                                    ],
                                    as: 'user'
                                }
                            },
                            //数组->对象
                            { $unwind: "$user" },
                            //category (按照分类来分)
                            {
                                $lookup: {
                                    from: 'categories',
                                    localField: 'category',
                                    foreignField: '_id',
                                    as: 'category'
                                }
                            },
                            {
                                $unwind: "$category"
                            },
                            //排序
                            //分组 (按category分组)
                            {
                                $group: {
                                    _id: "$category._id",
                                    name: { $first: "$category.name" },
                                    blogs: { $push: "$$ROOT" },
                                    count: { $sum: 1 },
                                    createdAt: { $first: "$createdAt" },
                                }
                            },
                            //分页:
                            {
                                $project: {
                                    blogs: {
                                        $slice: ["$blogs", 0, 4]
                                    },
                                    count: 1,
                                    name: 1,
                                    createdAt: 1
                                }
                            },
                            //有时间从最近到以前
                            {
                                $sort: {count: -1,  createdAt: 1 }
                            },
                            {
                                $skip: skip,
                            },
                            {
                                $limit: limit,
                            },
                        ],
                        totalCount: [
                            {
                                $lookup:{
                                    from: 'users',
                                    let: { user_id: "$user"},
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
                                        { $project: { password: 0 } }
                                    ],
                                    as: 'user'
                                }
                            },
                            //数组->对象
                            { $unwind: "$user" },
                            //category (按照分类来分)
                            {
                                $lookup: {
                                    from: 'categories',
                                    localField: 'category',
                                    foreignField: '_id',
                                    as: 'category'
                                }
                            },
                            //数组->对象
                            {
                                $unwind: "$category"
                            },
                            //分组 (按category分组)
                            {
                                $group: {
                                    _id: "$category._id",
                                    name: { $first: "$category.name" },
                                    blogs: { $push: "$$ROOT" },
                                    count: { $sum: 1 },
                                }
                            },
                            {
                                $group: {
                                    _id: "$category._id",
                                    count: { $sum: 1 },
                                }
                            },
                        ]
                    }
                },
                {
                    $project: {
                        count: { $arrayElemAt: ["$totalCount.count", 0] },
                        totalData: 1
                    }
                }
            ]);

            const blogs = data[0].totalData;
            const count = data[0].count;


            res.json({
                blogs,
                page,
                hasMore: (page) * limit < count,
            })
        }catch (err:any){
            console.log(err);
            res.status(500).json({ msg: err.message })
        }
    },
    getBlogsByCategory: async (req: Request, res: Response) => {
        const { limit, skip, sort } = Pagination(req);
        try{
            const data = await Blogs.aggregate([
                {
                    $facet: {
                        totalData: [
                            {
                                $match: {
                                    category: new mongoose.Types.ObjectId(req.params.id)
                                }
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    let: {user_id: "$user"},
                                    pipeline: [
                                        {$match: {$expr: {$eq: ["$_id", "$$user_id"]}}},
                                        {$project: {password: 0}}
                                    ],
                                    as: 'user'
                                }
                            },
                            //数组->对象
                            {$unwind: "$user"},
                            {$sort: sort},
                            {$skip: skip},
                            {$limit: limit}
                        ],
                        totalCount: [
                            {
                                $match: {
                                    category: new mongoose.Types.ObjectId(req.params.id)
                                }
                            },
                            {
                                $count: "count"
                            }
                        ]
                    }
                },
                {
                    $project: {
                        count: { $arrayElemAt: ["$totalCount.count", 0] },
                        totalData: 1
                    }
                }
            ]);
            const blogs = data[0].totalData;
            const count = data[0].count;

            //分页
            let total = 0;
            if(count % limit === 0){
                total = count / limit;
            }else{
                total = Math.floor(count / limit) + 1;
            }

            res.json({
                blogs,
                total
            })
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    getBlogsByUser: async (req: Request, res: Response) => {
        const { limit, skip } = Pagination(req)

        try {
            const Data = await Blogs.aggregate([
                {
                    $facet: {
                        totalData: [
                            {
                                $match:{
                                    user: new mongoose.Types.ObjectId(req.params.id)
                                }
                            },
                            // User
                            {
                                $lookup:{
                                    from: "users",
                                    let: { user_id: "$user" },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
                                        { $project: { password: 0 }}
                                    ],
                                    as: "user"
                                }
                            },
                            // array -> object
                            { $unwind: "$user" },
                            // Sorting
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit }
                        ],
                        totalCount: [
                            {
                                $match: {
                                    user: new mongoose.Types.ObjectId(req.params.id)
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                },
                {
                    $project: {
                        count: { $arrayElemAt: ["$totalCount.count", 0] },
                        totalData: 1
                    }
                }
            ])

            const blogs = Data[0].totalData;
            const count = Data[0].count;

            // Pagination
            let total = 0;

            if(count % limit === 0){
                total = count / limit;
            }else {
                total = Math.floor(count / limit) + 1;
            }

            res.json({ blogs, total })
        } catch (err: any) {
            return res.status(500).json({msg: err.message})
        }
    },
    getBlog:async (req: Request, res: Response) => {
        try{
            const blog = await Blogs.findOne({_id: req.params.id})
                .populate("user likes", "avatar name")
                .populate("user saved", "avatar name");
            if(!blog) return res.status(404).json({msg: '找不到这篇博文'});
            res.json(blog);
        }catch (err:any){
            console.log(err);
            res.status(500).json({msg: err.message})
        }
    },
    updateBlog: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({ msg: '没有权限操作，请先登录' });

        try{
            const blog = await Blogs.findOneAndUpdate({_id: req.params.id, user: req.user._id}, req.body, {
                    new: true,
                },
            );
            if(!blog) return res.status(404).json({msg: '找不到这篇博文'});
            io.to(blog._id.toString()).emit('updateBlog', blog);
            io.to('home').emit('getNewHomeBlogs');
            io.to(`categoryId_${blog.category.toString()}`).emit('upCategoryBlogs', blog.category.toString());
            io.to(`profile_${req.user._id}`).emit('updateBlog', blog);
            res.status(200).json( { blog } );
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    deleteBlog: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({ msg: '没有权限操作，请先登录' });

        try{
            const blog = await Blogs.findOneAndDelete({_id: req.params.id, user: req.user._id});
            if(!blog) return res.status(404).json({msg: '找不到这篇博文'});
            //删除这篇博客下的评论
            await Comments.deleteMany({blog_id: blog._id});
            io.to(blog._id.toString()).emit('deleteBlog', blog);
            io.to('home').emit('getNewHomeBlogs');
            io.to(`categoryId_${blog.category.toString()}`).emit('upCategoryBlogs', blog.category.toString());
            io.to(`profile_${req.user._id}`).emit('deleteBlog', blog);
            res.status(200).json({ msg: '删除成功' });
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    searchBlog: async (req: Request, res: Response) => {
        try{
            const blogs = await Blogs.aggregate([
                {
                    "$search":{
                        index: "searchTitle",
                        autocomplete: {
                            "query": `${req.query.title}`,
                            "path": "title",
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        pipeline: [
                            { $project: { _id: 1, avatar: 1, name: 1} }
                        ],
                        as: 'user'
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $limit: 5
                },
                {
                    $project:{
                        title:1,
                        description: 1,
                        profileBlogThumbnail: 1,
                        createdAt: 1,
                        user: 1,
                    }
                }
            ]);
            res.json(blogs);
        }catch (err:any){
            res.status(500).json({ msg: err.message });
        }
    },
    likeBlog: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({ msg: '没有权限操作，请先登录' });
        const { isLike } = req.body;
        try{
            const like = isLike ? await Blogs.findOneAndUpdate({_id: req.params.id}, {$push: {likes: req.user._id}, $inc:{likesLength: 1}}, {new: true}).populate("user likes", "avatar name")
                .populate("user saved", "avatar name") : (
                await Blogs.findOneAndUpdate({_id: req.params.id},{
                    $pull: {
                        likes: req.user._id
                    },
                    $inc:{likesLength: -1}
                }, {new: true}).populate("user likes", "avatar name")
                    .populate("user saved", "avatar name")
            );
            if(!like) return res.status(404).json({msg: '找不到这篇博文'});
            io.to(req.params.id).emit('blogLikeUnLike', like);
            io.to('home').emit('getNewHomeBlogs');
            io.to(`categoryId_${like.category.toString()}`).emit('upCategoryBlogs', like.category.toString());
            io.to(`profile_${req.user._id}`).emit('likeUnlikeBlog', like);
            res.json({
                msg: `${isLike ? '点赞成功' : '取消点赞成功'}`,
            });
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    saveBlog: async (req: IReqAuth, res: Response) => {
        if(!req.user) return res.status(401).json({ msg: '没有权限操作，请先登录' });
        const { isSave } = req.body;
        try{
            const save = isSave ? await Blogs.findOneAndUpdate({_id: req.params.id}, {$push: {saved: req.user._id}, $inc:{savedLength: 1}}, {new: true}).populate("user likes", "avatar name")
                .populate("user saved", "avatar name") : (
                await Blogs.findOneAndUpdate({_id: req.params.id},{
                    $pull: {
                        saved: req.user._id
                    },
                    $inc:{savedLength: -1}
                }, {new: true}).populate("user likes", "avatar name")
                    .populate("user saved", "avatar name")
            );
            if(!save) return res.status(404).json({msg: '找不到这篇博文'});
            io.to(req.params.id).emit('blogSaveUnSave', save);
            io.to('home').emit('getNewHomeBlogs');
            io.to(`categoryId_${save.category.toString()}`).emit('upCategoryBlogs', save.category.toString());
            io.to(`profile_${req.user._id}`).emit('saveUnSaveBlog', save);
            res.json({
                msg: `${isSave ? '收藏成功' : '取消收藏成功'}`,
            });
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    getLikeBlogsByUser: async (req: Request, res: Response) => {
        const { skip,  limit  } = Pagination(req);
        try{
            const blogs = await Blogs.find({likes: req.params.id}).populate("user", "_id avatar name").skip(skip).limit(limit);
            const count = await Blogs.countDocuments({likes: req.params.id});
            let total = 0;
            if(count % limit === 0) total = count / limit;
            else total = Math.floor(count /  limit) + 1;
            res.json({ blogs, total });
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
    getSaveBlogsByUser: async (req: Request, res: Response) => {
        const { skip,  limit  } = Pagination(req);
        try{
            const blogs = await Blogs.find({saved: req.params.id}).sort({createdAt: -1}).populate("user", "_id avatar name").skip(skip).limit(limit);
            const count = await Blogs.countDocuments({saved: req.params.id});
            let total = 0;
            if(count % limit === 0) total = count / limit;
            else total = Math.floor(count / limit) + 1;
            res.json({ blogs, total });
        }catch (err:any){
            res.status(500).json({ msg: err.message })
        }
    },
}

export default blogCtrl;
