import express from "express";
import BlogManager from "../../business/blog/blogManager";
import { ErrorCode, makeErrorMsg } from "../../common/error";
import { BLOG, checkPermision } from "../../common/permission";

//博客草稿数据
type BlogDraftData = {
  flag: string, //权限标识
  type: "save" | "delete",  //保存草稿|删除草稿
  content?: string,  //保存的内容
  title?: string,  //标题
  uid?: string  //删除的uid
}

type BlogDraftBack = {
  status: true,
  msg: string,
  id: string
}

const router = express.Router();

router.post("/", function (req, res) {
  //博客根处理
})

router.post("/draft", function (req, res) {
  //草稿
  let body = req.body;
  let data: BlogDraftData = JSON.parse(body);
  if (!checkPermision(data.flag, BLOG.BLOG_DRAFT)) {
    //权限不足
    res.send(makeErrorMsg(ErrorCode.Perrsion));
  }
  let type = data.type;
  let id = data.uid;
  let content = data.content;
  let title = data.title;
  if (type === "save") {
    //保存草稿
    BlogManager.Instance.saveBlogDraft(content!, id, title).then(id => {
      //成功逻辑
      res.send({
        msg: "博客保存成功",
        status: true,
        id
      } as BlogDraftBack);
    }).catch((err: ErrorCode) => {
      //失败逻辑
      res.send(makeErrorMsg(err));
    });
  }
})