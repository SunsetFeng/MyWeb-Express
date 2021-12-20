import express from "express";
import BlogManager from "../../business/blog/blogManager";
import { ErrorCode, makeErrorMsg } from "../../common/error";
import { BLOG, checkPermision } from "../../common/permission";

enum DraftOperaType {
  SAVE,
  DELETE
}
//博客草稿数据
type BlogDraftData = {
  flag: string, //权限标识
  type: DraftOperaType,  //保存草稿|删除草稿
  content?: string,  //保存的内容
  title?: string,  //标题
  uid?: string  //删除的uid
}

type BlogDraftBack = {
  status: true,
  msg: string,
  id: string
}

export const blogRouter = express.Router();

blogRouter.post("/", function (req, res, next) {
  //博客根处理
})

blogRouter.post("/draft", function (req, res) {
  //草稿
  let body:BlogDraftData = req.body;
  if (!checkPermision(body.flag, BLOG.BLOG_DRAFT)) {
    //权限不足
    res.send(makeErrorMsg(ErrorCode.Perrsion));
  }
  let type = body.type;
  let id = body.uid;
  let content = body.content;
  let title = body.title;
  if (type === DraftOperaType.SAVE) {
    //保存草稿
    BlogManager.Instance.saveBlogDraft(content!, title, id).then(id => {
      //成功逻辑
      res.send({
        msg: "博客保存成功",
        status: true,
        id
      } as BlogDraftBack);
    }).catch((err:[ErrorCode,string]) => {
      //失败逻辑
      res.send(makeErrorMsg(err[0],err[1]));
    });
  }
})