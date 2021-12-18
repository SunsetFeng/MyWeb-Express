import mysql from "mysql";
import express from "express";
import { initPermision } from "./common/Permission";

const dataConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "423305",
  database: "web"
});
const app = express();
/**
 * 连接数据库
 */
async function initMysql() {
  return new Promise((resolve, reject) => {
    dataConnection.connect((err) => {
      if (err) {
        reject("数据库链接失败:" + err.message);
      }else{
        resolve(true);
      }
    });
  }).catch(() => {
    process.exit(1);
  })
}
async function init(){
  await initMysql();
  initPermision();
}
/**
 * 加载路由
 */
function initRouter() {

}
init();
app.listen(80);
export default dataConnection;