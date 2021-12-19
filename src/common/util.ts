import { readFile } from "fs/promises";
import dataConnection from "..";

export function generateUUID() {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};
/**
 * 封装SQL获取表数据接口
 * @param option 配置
 * @returns 
 */
export function queryFromDatabase<T extends Record<string, any>>(option: {
  table: string,  //表名
  fields: Array<keyof T> | "*", //字段
  condition?: string, //条件
  order?: {
    field: string, //字段
    type: "ASC" | "DESC"  //类型
  }
}): Promise<T[]> {
  let { fields, table, condition, order } = option;
  let fieldStr = fields.toString();
  let sql = `SELECT ${fieldStr} FROM ${table}`;
  if (condition) {
    sql += ` WHERE ${condition}`;
  }
  if (order) {
    sql += ` ORDER BY ${order.field} ${order.type}`;
  }
  return new Promise((resolve, reject) => {
    dataConnection.query({
      sql,
    }, (err, result: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}
/**
 * 插入一行数据
 * @param option 配置
 * @returns 
 */
export function insetLineToDatabase<T extends Record<string, any>>(option: {
  table: string,  //表名
  fields: Array<keyof T>,  //
  values: any[],
}): Promise<boolean> {
  let { table, fields, values } = option;
  let valStr = "";
  values.forEach((val, index) => {
    if (index === 0) {
      valStr += val ? `'${val}'` : "null";
    } else {
      valStr += val ? `,'${val}'` : ",null";
    }
  })
  return new Promise((resolve, reject) => {
    dataConnection.query({
      sql: `INSERT INTO ${table} (${fields.toString()}) VALUES(${valStr})`,
    }, (err) => {
      if (err) {
        reject(false);
      } else {
        resolve(true);
      }
    })
  })
}

export function updateDatabase<T extends Record<string, any>>(option: {
  table: string, //表名
  fields: Array<keyof T>,  //字段数组
  values: any[], //值
  condition: string  //条件
}): Promise<boolean> {
  let { table, fields, values, condition } = option;
  let str = "";
  fields.forEach((field, index, arr) => {
    str += `${field}=`;
    if (index === arr.length - 1) {
      str += values[index] ? `'${values[index]}' ` : "null "
    } else {
      str += values[index] ? `'${values[index]}', ` : "null, "
    }
  })
  str += `WHERE ${condition}`;
  let sql = `UPDATE ${table} SET ${str}`;
  return new Promise((resolve, reject) => {
    dataConnection.query({
      sql
    }, err => {
      if (err) {
        reject(false);
      } else {
        resolve(true);
      }
    })
  })
}
/**
 * 获取文件内容
 * @param filePath 文件路径
 */
export function readFileContent(filePath: string): Promise<string | Error> {
  return readFile(filePath).then(buffer => {
    return buffer.toString();
  }).catch(err => {
    return new Error(err);
  });
}