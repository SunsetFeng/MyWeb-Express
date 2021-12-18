import { createWriteStream, existsSync, WriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { RootDir } from "../..";
import { ErrorCode } from "../../common/error";
import { generateUUID } from "../../common/util";

export const DraftDir = "assets/blog/draft";

export default class BlogManager {
  //博客管理器---单例
  private static _instance: BlogManager | null = null;
  public static get Instance(): BlogManager {
    if (this._instance === null) {
      this._instance = new BlogManager();
    }
    return this._instance;
  }
  //流map 避免不同的写入流操作同一个文件。每对一个文件创建一个写入流，都把上一个结束掉。
  private streamMap = new Map<string,WriteStream>();
  /**
   * 保存草稿
   * @param id 草稿id
   */
  public async saveBlogDraft(content: string, id?: string) {
    return new Promise(async (resolve, reject) => {
      if (content === "") {
        //如果需要保存的内容是空串,不做处理,因为考虑到自动保存,可能会发空串请求
        resolve(null);
      }
      else {
        if (!id) {
          id = generateUUID();
        }
        let filePath = path.join(RootDir, DraftDir, id);
        if (!existsSync(filePath)) {
          let status = await mkdir(filePath).then(() => {
            //创建成功
            return true;
          }).catch(() => {
            reject(ErrorCode.CreateFileFailure);
            //创建失败
            return false;
          });
          if(!status){
            return;
          }
        }
        let writeStream = this.streamMap.get(id);
        if(writeStream){
          //如果上一个还未关闭,则结束掉
          writeStream.end();
        }
        //创建新流
        writeStream = createWriteStream(filePath);
        //保存流
        this.streamMap.set(id,writeStream);
        writeStream.write(content, (err) => {
          if (err) {
            //写入失败
            reject(ErrorCode.FileWriteFailure);
          } else {
            resolve(true);
          }
          writeStream?.end();
        });
      }
    })
  }
}
//明日任务 单元测试文件saveBlogDraft流程