import express from "express";
import BlogManager from "../../business/blog/blogManager";
import { ErrorCode, makeErrorMsg } from "../../common/error";
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
//博客内容
export type BlogContentItem = {
  id: string; //id
  title?: string; //标题
  content: string; //内容
};
//博客操作类型
enum BlogOpreaType {
  RELEASE,
  DELETE
}

type BlogActionReq = {
  id?: string;  //是否有id
  type: BlogOpreaType  //操作类型
  title: string,  //标题
  content: string  //内容
}

export type BlogData = {
  id: string,
  content: string,
  title: string,
  category: string
}
export type BlogCategory = Record<string, number>;

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
    BlogManager.Instance.saveBlogDraft(content!, title, id).then(id => {
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
    BlogManager.Instance.deleteBlogDraft(id!).then(() => {
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
  BlogManager.Instance.getBlogContent(body.id).then(contents => {
    res.end(JSON.stringify(contents));
  }).catch((errCode: ErrorCode) => {
    res.end(makeErrorMsg(errCode));
  })
})
//博客内容
blogRouter.post("/category", function (req, res) {
  BlogManager.Instance.getCategoryData().then(data => {
    res.end(JSON.stringify(data));
  }).catch((err: ErrorCode) => {
    res.end(makeErrorMsg(err));
  })
})
//博客操作
blogRouter.post("/permission/action", function (req, res) {
  let body = req.body;
  if (body.type === BlogOpreaType.RELEASE) {
    //发布
  } else if (body.type === BlogOpreaType.DELETE) {
    //删除
  }
});