import express from "express";
import { ErrorCode, makeErrorMsg } from "../../common/error";
import { Mgr } from "../../common/manager";
import { BLOG, checkPermision } from "../../common/permission";
//草稿操作
enum DraftOperaType {
  SAVE,
  DELETE
}
//草稿数据
type BlogDraftData = {
  flag: string, //权限标识
  type: DraftOperaType,  //保存草稿|删除草稿
  content?: string,  //保存的内容
  title?: string,  //标题
  id?: string  //删除的uid
}
//草稿返回
type BlogDraftBack = {
  status: true,
  msg: string,
  id: string
}
//博客操作类型
enum BlogOpreaType {
  RELEASE,  //发布
  DELETE  //删除
}
//博客操作请求
export type BlogActionReq = {
  id?: string;  //是否有id
  type: BlogOpreaType  //操作类型
  title: string,  //标题
  content: string  //内容
  category: string[]  //分类
}

export const blogRouter = express.Router();

blogRouter.use("/permission", function (req, res, next) {
  let body = req.body;
  if (!checkPermision(body.flag, BLOG)) {
    //权限不足
    res.send(makeErrorMsg(ErrorCode.Perrsion));
  } else {
    next();
  }
})

//草稿操作 保存或者删除
blogRouter.post("/permission/draft/action", function (req, res) {
  let body: BlogDraftData = req.body;
  let type = body.type;
  let id = body.id;
  let content = body.content;
  let title = body.title;
  if (type === DraftOperaType.SAVE) {
    //保存草稿
    Mgr.blogMgr.saveBlogDraft(content!, title!, id).then(id => {
      //成功逻辑
      res.send(JSON.stringify({
        msg: "博客保存成功",
        status: true,
        id
      } as BlogDraftBack));
    }).catch((err: [ErrorCode, string]) => {
      //失败逻辑
      res.send(makeErrorMsg(err[0], err[1]));
    });
  } else if (type === DraftOperaType.DELETE) {
    Mgr.blogMgr.deleteBlogDraft(id!).then(() => {
      res.end(JSON.stringify({
        status: true,
        msg: "博客删除成功",
        id
      } as BlogDraftBack));
    }).catch((err: ErrorCode) => {
      res.end(makeErrorMsg(err));
    })
  }
})
//草稿内容
blogRouter.post("/permission/draft/items", function (req, res) {
  let body = req.body;
  //获取草稿数据
  let contents = Mgr.blogMgr.getBlogContent(body.id);
  res.end(JSON.stringify(contents));
})
//博客分类数量内容
blogRouter.post("/category/blogSize", function (req, res) {
  let data = Mgr.blogMgr.getCategoryData();
  res.end(JSON.stringify(data));
})
//博客操作 发布或者删除
blogRouter.post("/permission/action", function (req, res) {
  let body: BlogActionReq = req.body;
  if (body.type === BlogOpreaType.RELEASE) {
    //发布
    Mgr.blogMgr.releaseBlog(body.title, body.content, body.category, body.id).then(id => {
      res.end(JSON.stringify({ id }));
    }).catch((errCode: ErrorCode) => {
      res.end(makeErrorMsg(errCode));
    })
  } else if (body.type === BlogOpreaType.DELETE) {
    //删除
  }
});
/**
 * 获取分类博客数据内容
 */
blogRouter.post("/category/content", function (req, res) {
  let category = req.body.category;
  let data = Mgr.blogMgr.getBlogDatasByCatgory(category);
  res.end(JSON.stringify(data));
})