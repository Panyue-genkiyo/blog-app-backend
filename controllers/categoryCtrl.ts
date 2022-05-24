//分类控制器
import {Response} from 'express';
import Category from '../models/categoryModel';
import Blogs from '../models/blogModel';
import { IReqAuth } from "../config/interface";
import { io } from '../index';

const categoryCtrl = {
    createCategory: async (req: IReqAuth, res: Response) => {
        if(!req.user)  return res.status(401).send({message: '无权限操作,请先登录'});
        if(req.user.role !== 'admin') return res.status(401).send({message: '您不是管理员,无权限操作'});

        try{
            const name = req.body.name.toLowerCase();

            const newCategory = new Category({name});
            await newCategory.save();
            res.json({ newCategory });
        }catch (err: any){
            let errMsg;
            if(err.code === 11000){
                errMsg = Object.values(err.keyValue)[0] + '已存在';
            }else{
                let name = Object.keys(err.errors)[0];
                errMsg = err.errors[`${name}`].message;
            }
            return res.status(500).json({msg: errMsg})
        }
    },

    getCategories: async (req: IReqAuth, res: Response) => {
        // if(!req.user)  return res.status(401).send({message: '无权限操作,请先登录'});
        // if(req.user.role !== 'admin') return res.status(401).send({message: '您不是管理员,无权限操作'});

        try{
           const categories = await Category.find().sort("createdAt");
           res.json({categories});
        }catch (err: any){
            return res.status(500).json({msg: err.message})
        }
    },

    updateCategory: async (req: IReqAuth, res: Response) => {
        if(!req.user)  return res.status(401).send({message: '无权限操作,请先登录'});
        if(req.user.role !== 'admin') return res.status(401).send({message: '您不是管理员,无权限操作'});
        try{
            const { name } = req.body;
            const { id } = req.params;
            await Category.findByIdAndUpdate({ _id: id}, {name : name.toLowerCase()}, {new: true});
            const blogs = await Blogs.find({category: id});
            blogs.length !== 0 && io.to('home').emit('getNewHomeBlogs');
            res.json({msg:"更改成功"});
        }catch (err: any){
            return res.status(500).json({msg: err.message})
        }
    },

    deleteCategory: async (req: IReqAuth, res: Response) => {
        if(!req.user)  return res.status(401).send({message: '无权限操作,请先登录'});
        if(req.user.role !== 'admin') return res.status(401).send({message: '您不是管理员,无权限操作'});

        try{
            const { id } = req.params;
            const blog =  await  Blogs.find({category: id});
            console.log(blog);
            if(blog.length !== 0) return res.status(500).json({msg: '该分类下有博客,无法删除'});
            const category = await Category.findByIdAndDelete({ _id: id});
            if(!category) return res.status(404).json({msg: '分类不存在'});

            res.json({msg:"删除成功"});
        }catch (err: any){
            return res.status(500).json({msg: err.message})
        }
    },

}


export default categoryCtrl;
