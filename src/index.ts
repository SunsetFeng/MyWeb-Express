import express from "express";
import path from "path";
import { promises } from "fs";
import appRouter, { blogRouter } from "./router";
import bodyParser from "body-parser";
import { BlogDir, DraftDir } from "./business/blog/blogManager";
import { initPermision } from "./common/permission";
import { Mgr } from "./common/manager";
import { initMysql } from "./common/mysql";

//项目根目录
export const RootDir = process.cwd();
//app对象
const app = express();
//监听端口
export const port = 8000;
//环境
export const address = process.env.NODE_ENV === "production" ? "qy-lrr-home.cn" : "127.0.0.1";

/**
 * 初始化文件夹
 * @returns 
 */
async function initFiles() {
  let draft = path.join(RootDir, DraftDir);
  let blog = path.join(RootDir,BlogDir);
  let dirArr:Array<[string,string]> = [
    [draft,"博客草稿"],
    [blog,"博客内容"]
  ]
  let promiseArr =  dirArr.map(item => {
    promises.mkdir(item[0], {
      recursive: true, //是否递归
    }).catch(() => {
      console.error(`${item[1]}文件夹创建失败`);
    })
  })
  return Promise.all(promiseArr).catch(() => {
    process.exit(1);
  });
}
/**
 * 初始化路由
 */
function initRouter(){
  //不使用扩展
  app.use(bodyParser.urlencoded({extended:false}));
  //只支持json 内容大小最多10M 默认100K 因为博客 可能会很大 10M应该够了
  app.use(bodyParser.json({
    limit:1024 * 1024 * 10,  //10M大小
  }));
  //应用全局路由
  app.use("/",appRouter);
  //博客路由
  app.use("/blog",blogRouter);
}
/**
 * 初始化
 */
export async function init() {
  //连接mysql
  await initMysql();
  //初始化权限设置
  await initPermision();
  //初始化文件夹
  await initFiles();
  //初始化路由
  initRouter();
  //初始化管理器
  Mgr.init();
  //监听8000端口
  app.listen(port);
  console.log("初始化完成");
}
//初始化
init();