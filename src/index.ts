import mysql from "mysql";
import express from "express";
import { initPermision } from "./common/permission";
import path from "path";
import { promises } from "fs";
import { DraftDir } from "./business/blog/blogManager";

//项目根目录
export const RootDir = path.join(__dirname,"../");
//app对象
const app = express();
/**
 * 创建数据库连接对象
 */
const dataConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "423305",
  database: "web"
});
/**
 * 连接mysql
 * @returns 
 */
async function initMysql() {
  return new Promise((resolve, reject) => {
    dataConnection.connect((err) => {
      if (err) {
        reject("数据库连接失败:" + err.message);
      } else {
        resolve(true);
      }
    });
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  })
}
/**
 * 初始化文件夹
 * @returns 
 */
async function initFiles() {
  let draft = path.join(RootDir, DraftDir);
  let dirArr:Array<[string,string]> = [
    [draft,"博客草稿"],
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
 * 初始化
 */
async function init() {
  //连接mysql
  await initMysql();
  //初始化权限设置
  await initPermision();
  //初始化文件夹
  await initFiles();

  console.log("初始化完成");
}
//初始化
init();
//监听8000端口
app.listen(8000);
//数据库连接对象
export default dataConnection;