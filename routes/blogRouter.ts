import express from "express";
import blogCtrl from '../controllers/blogCtrl';
import { auth } from '../middlewares/auth';
const router = express.Router();

router.post('/blog', auth, blogCtrl.createBlog);
router.get('/home/blogs', blogCtrl.getHomeBlogs);
router.get('/blogs/category/:id', blogCtrl.getBlogsByCategory);
router.get('/blogs/user/:id', blogCtrl.getBlogsByUser);
router.get('/blogs/like/user/:id', blogCtrl.getLikeBlogsByUser);
router.get('/blogs/save/user/:id', blogCtrl.getSaveBlogsByUser);
router.get('/search/blogs', blogCtrl.searchBlog);
router.route('/blog/:id')
    .get(blogCtrl.getBlog)
    .put(auth, blogCtrl.updateBlog)
    .delete(auth, blogCtrl.deleteBlog)
router.patch('/blog/:id/like', auth, blogCtrl.likeBlog);
router.patch('/blog/:id/save', auth, blogCtrl.saveBlog);


export default router;
