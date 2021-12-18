/**
 * 生成错误返回
 */

export enum ErrorCode {
  Perrsion,  //权限原因
  FileWriteFailure, //文件写入失败 
  CreateFileFailure, //创建文件失败
}
const errorMap = new Map<ErrorCode,string>(
  [
    [ErrorCode.Perrsion,"权限不足"],
    [ErrorCode.FileWriteFailure,"文件写入失败"],
  ]
)
export function makeErrorMsg(code:ErrorCode):string {
  let msg = errorMap.get(code) || "未知原因";
  let errorMsg = JSON.stringify({
    msg,
    stats:false
  });
  return errorMsg;
}