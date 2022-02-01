import mysql, { Connection } from "mysql";
type CreateTableFunc = (resolve: (value: boolean) => void, reject: (reason: any) => void) => void
/**
 * 创建数据库连接对象
 */
function connectMysql(database?: string) {
  let base = {
    host: "localhost",
    user: "root",
    password: "423305",
  }
  if (database) {
    base = Object.assign(base, {
      database
    });
  }
  return mysql.createConnection(base);
}
/**
 * 创建blog_content表
 */
const createBlogTable: CreateTableFunc = function (resolve, reject) {
  dataConnection.query({
    sql: `Create Table If Not Exists blog_content(
      id varchar(255) Primary Key Not Null,
      title varchar(255) Not Null,
      category varchar(255) Not Null,
      time varchar(255) Not Null
    )Charset=utf8`
  }, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(true);
    }
  })
}
/**
 * 创建blog_draft表
 */
 const createDraftTable: CreateTableFunc = function (resolve, reject) {
  dataConnection.query({
    sql: `Create Table If Not Exists blog_draft(
      id varchar(255) Primary Key Not Null,
      title varchar(255)
    )Charset=utf8`
  }, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(true);
    }
  })
}
/**
 * 创建permission表
 */
 const createPermissionTable: CreateTableFunc = function (resolve, reject) {
  dataConnection.query({
    sql: `Create Table If Not Exists permission(
      flag varchar(255) Primary Key Not Null,
      level int Not Null
    )Charset=utf8`
  }, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(true);
    }
  })
}
//执行队列
const createQueue: CreateTableFunc[] = [];
const createQueuePromise: Promise<boolean>[] = [];
createQueue.push(createBlogTable,createDraftTable,createPermissionTable);
/**
 * 执行队列转换成Promise返回
 * @param fn 
 * @returns 
 */
function promiseUtilFunc(fn: CreateTableFunc): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fn(resolve, reject);
  })
}

const database = "web";

//数据库连接对象
let dataConnection = connectMysql(database);
//检测连接
let checkConnection = connectMysql();
/**
 * 连接mysql
 * @returns 
 */
export async function initMysql() {
  return new Promise<Connection>((resolve, reject) => {
    checkConnection.connect((err) => {
      if (err) {
        return reject("数据库连接失败:" + err.message);
      }
      checkConnection?.query({
        sql: `Create Database If Not Exists ${database} Character Set UTF8`
      }, (err) => {
        if (err) {
          return reject('创建数据库失败');
        }
        checkConnection.destroy();
        dataConnection.connect((err) => {
          if (err) {
            return reject(`连接${database}失败`);
          }
          for (let i = 0; i < createQueue.length; i++) {
            createQueuePromise.push(promiseUtilFunc(createQueue[i]));
          }
          Promise.all(createQueuePromise).then(res => {
            resolve(dataConnection);
          }).catch(err => {
            reject(err);
          })
        })
      })
    });
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  })
}
export default dataConnection;