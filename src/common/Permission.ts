/**
 * 部分接口需要权限,当权限不满足时,不返回响应数据
 */
import dataConnection from "..";

const permisionMap = new Map<string,number>();

type PermisionType = {
  flag:string,
  level:number
}

/**
 * 保存博客
 */
export const SAVE_BLOG = Symbol();

const PermisionConfig = Object.freeze({
  [SAVE_BLOG]:7,
})

/**
 * 初始化权限,从数据库中获取权限字段
 */
export async function initPermision(){
  return new Promise((resolve,reject) => {
    dataConnection.query({
      sql:"SELECT * FROM permission",
    },(err,results:PermisionType[]) => {
      if(err){
        reject("权限值查询失败:" + err);
      }else{
        results.forEach(item => {
          permisionMap.set(item.flag,item.level);
        })
      }
    })
  }).catch(() => {
    process.exit(1);
  })
}

export function checkPermision(){

}