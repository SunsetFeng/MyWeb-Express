import { Router } from "express";
import { getPermission } from "../common/permission";


export * from "./application/blog";

//这个路由处理全局相关的请求
let appRouter = Router();

appRouter.all("*", function (req, res, next) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", "*");
  //允许的header类型
  res.header("Access-Control-Allow-Headers", "content-type");
  //跨域允许的请求方式
  res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
  if (req.method.toLowerCase() == 'options')
    res.send(200);  //让options尝试请求快速结束
  else
    next();
})

appRouter.post("/permission", function (req, res) {
  let body: { flag: string } = req.body;
  let level = getPermission(body.flag);
  res.send(JSON.stringify({
    level,
  }))
})

export default appRouter;