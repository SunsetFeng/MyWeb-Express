import { Router } from "express";
import { getPermission } from "../common/permission";

export * from "./application/blog";

//这个路由处理全局相关的请求
let router = Router();
router.post("/permission",function(req,res){
  let body:{flag:string} = req.body;
  let level = getPermission(body.flag);
  res.send(JSON.stringify({
    level,
  }))
});