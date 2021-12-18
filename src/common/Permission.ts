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
 * 博客权限配置
 */
export const BLOG = Object.freeze({
  BLOG_DRAFT:Symbol(), //草稿
})
/**
 * 权限配置
 */
const permisionConfig = new Map<Symbol,number>([
  [BLOG.BLOG_DRAFT,7]
])

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
        resolve(true);
      }
    })
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  })
}
/**
 * 判断权限是否满足
 * @param flag 权限flag
 * @param func 功能标识
 * @returns 
 */
export function checkPermision(flag:string,func:Symbol):boolean{
  let level = permisionMap.get(flag) || 0;
  if(level < (permisionConfig.get(func) || 0)){
    return false
  }else{
    return true;
  }
}