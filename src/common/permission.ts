/**
 * 部分接口需要权限,当权限不满足时,不返回响应数据
 */
import { queryFromDatabase } from "./util";

const permisionMap = new Map<string, number>();

type PermisionType = {
  flag: string,
  level: number
}

/**
 * 博客权限配置
 */
export const BLOG = Symbol("BLOG");
/**
 * 笔记
 */
export const NOTE = Symbol("NOTE");
/**
 * 文件上传权限配置
 */
export const UPLOAD = Symbol("UPLOAD");
/**
 * 权限配置
 */
const permisionConfig = new Map<Symbol, number>([
  [BLOG, 7],
  [NOTE, 7]
])

/**
 * 初始化权限,从数据库中获取权限字段
 */
export async function initPermision() {
  queryFromDatabase<PermisionType>({
    fields: ["flag", "level"],
    table: "permission",
  }).then(results => {
    results.forEach(item => {
      permisionMap.set(item.flag, item.level);
    })
  }).catch(err => {
    console.error("权限值查询失败:" + err);
    process.exit(1);
  })
}
/**
 * 判断权限是否满足
 * @param flag 权限flag
 * @param func 功能标识
 * @returns 
 */
export function checkPermision(flag: string, func: Symbol): boolean {
  let level = permisionMap.get(flag) || 0;
  let needLe = permisionConfig.get(func);
  if (level < (needLe || 0)) {
    console.log(`permission error: cur:${level},need:${needLe}`);
    return false
  } else {
    return true;
  }
}
/**
 * 获取权限等级
 * @param flag 权限flag
 * @returns 
 */
export function getPermission(flag: string): number {
  let level = permisionMap.get(flag) || 0;
  return level;
}