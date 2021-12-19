import { createWriteStream, existsSync, WriteStream } from "fs";
import path from "path";
import { RootDir } from "../..";
import { ErrorCode } from "../../common/error";
import { generateUUID, insetLineToDatabase } from "../../common/util";

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
  private streamMap = new Map<string, WriteStream>();
  /**
   * 保存草稿
   * @param id 草稿id
   * @returns 成功返回id 失败返回code 不处理返回null
   */
  public async saveBlogDraft(content: string,title?: string,id?: string): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      if (content === "") {
        //如果需要保存的内容是空串,不做处理,因为考虑到自动保存,可能会发空串请求
        return resolve(null);
      }
      else {
        if (!id) {
          id = generateUUID();
        }
        await insetLineToDatabase<{id:string,title?:string}>({
          table:"blog_draft",
          fields:["id","title"],
          values:[id,title]
        }).catch((err) => {
          console.error("插入草稿失败:" + err);
        })
        let filePath = path.join(RootDir, DraftDir, `${id}.md`);
        let writeStream = this.streamMap.get(id);
        if (writeStream) {
          //如果上一个还未关闭,则结束掉
          writeStream.end();
        }
        //创建新流
        writeStream = createWriteStream(filePath);
        //保存流
        this.streamMap.set(id, writeStream);
        //写入数据
        writeStream.write(content, (err) => {
          if (err) {
            //写入失败
            reject(ErrorCode.FileWriteFailure);
          } else {
            resolve(id!);
          }
          writeStream?.end();
        });
      }
    })
  }
}