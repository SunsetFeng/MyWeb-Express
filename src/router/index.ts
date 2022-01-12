import { Router } from "express";
import path from "path";
import { RootDir } from "..";
import { ErrorCode, makeErrorMsg } from "../common/error";
import { getPermission, UPLOAD } from "../common/permission";
import multiparty from "multiparty";
import { rename } from "fs/promises";
import os from "os";


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
  else {
    //返回的数据设置
    // res.header("Content-type", "application/json");
    next();
  }
})

appRouter.post("/permission", function (req, res) {
  let body: { flag: string } = req.body;
  let level = getPermission(body.flag);
  res.send(JSON.stringify({
    level,
  }))
})



appRouter.post("/upload", function (req, res) {

  let dirPath = path.join(RootDir, "assets/blog/image/");

  let form = new multiparty.Form({
    uploadDir: dirPath
  });
  form.parse(req, function (err, fields, files) {
    if (err) {
      res.end(makeErrorMsg(ErrorCode.ParamError));
    }else{
      let file = files.file[0];
      let uploadedPath  = file.path;
      let realPath = path.join(dirPath,file.originalFilename);
      rename(uploadedPath,realPath).then(() =>{

        console.log(os.networkInterfaces());
        res.end(JSON.stringify({
          status:true,

        }))
      }).catch(() => {
        res.end(JSON.stringify({
          status:false,
          msg:"上传失败"
        }))
      })
    }
  })

})

export default appRouter;