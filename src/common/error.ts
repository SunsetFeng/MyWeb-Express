/**
 * 生成错误返回
 */

export enum ErrorCode {
  Perrsion,  //权限原因
  FileWriteFailure, //文件写入失败 
  CreateFileFailure, //创建文件失败
  ParamError,  //参数错误
  DatabaseReadError, //读取数据库数据失败
  FileReadFailure,  //读文件失败
  FileDeleteFailure,   //文件删除失败
  DatabaseDeleteError,   //数据库删除失败
}
const errorMap = new Map<ErrorCode,string>(
  [
    [ErrorCode.Perrsion,"权限不足"],
    [ErrorCode.FileWriteFailure,"文件写入失败"],
    [ErrorCode.CreateFileFailure,"文件目录创建失败"],
    [ErrorCode.ParamError,"参数错误"],
    [ErrorCode.DatabaseReadError,"读取数据库数据失败"],
    [ErrorCode.FileReadFailure,"读取文件失败"],
    [ErrorCode.FileDeleteFailure,"文件删除失败"],
    [ErrorCode.DatabaseDeleteError,"数据库删除数据失败"]
  ]
)
/**
 * 构造错误返回
 * @param code 错误Code
 * @param extra 额外的信息
 * @returns 
 */
export function makeErrorMsg(code:ErrorCode,extra?:string):string {
  let msg = errorMap.get(code) || "未知原因";
  if(extra){
    msg += `:${extra}`;
  }
  let errorMsg = JSON.stringify({
    msg,
    stats:false
  });
  return errorMsg;
}