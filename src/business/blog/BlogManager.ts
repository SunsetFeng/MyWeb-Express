import { createWriteStream, existsSync, WriteStream } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { RootDir } from "../..";
import { ErrorCode } from "../../common/error";
import { deleteDatabase, generateUUID, insetLineToDatabase, queryFromDatabase, readFileContent, updateDatabase } from "../../common/util";
import { BlogActionReq, BlogCategory, BlogContentItem, BlogData } from "../../router";

export const DraftDir = "assets/blog/draft";
export const BlogDir = "assets/blog/content";

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
   * @param content 内容
   * @param title 标题
   * @param id 草稿id
   * @returns 成功返回id 失败返回code
   */
  public saveBlogDraft(content: string, title?: string, id?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (content === "") {
        //如果需要保存的内容是空串,不做处理,因为考虑到自动保存,可能会发空串请求
        return reject([ErrorCode.ParamError, "content"])
      } else {
        if (!id) {
          id = generateUUID();
          await insetLineToDatabase<{ id: string, title?: string }>({
            table: "blog_draft",
            fields: ["id", "title"],
            values: [id, title]
          }).catch((err) => {
            console.error("插入草稿失败:" + err);
          })
        } else {
          await updateDatabase<{ title?: string }>({
            table: "blog_draft",
            fields: ["title"],
            values: [title],
            condition: `id='${id}'`
          }).catch(err => {
            console.error("更新草稿失败:" + err);
          })
        }
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
            reject([ErrorCode.FileWriteFailure]);
          } else {
            resolve(id!);
          }
          writeStream?.end();
        });
      }
    })
  }
  /**
   * 获取草稿数据
   * @returns 
   */
  public getBlogContent(id?: string): Promise<BlogContentItem[]> {
    let blogContents: BlogContentItem[] = [];
    return new Promise((resolve, reject) => {
      queryFromDatabase<{ id: string, title: string }>({
        table: "blog_draft",
        fields: '*',
        condition: id ? `id='${id}'` : undefined
      }).then(res => {
        Promise.all(res.map((val, index) => {
          let filePath = path.join(RootDir, DraftDir, `${val.id}.md`);
          return readFileContent(filePath).then(content => {
            //正常读取
            blogContents[index] = Object.assign(res[index], {
              content
            } as BlogContentItem);
          }).catch(() => {
            //异常读取
            blogContents[index] = Object.assign(res[index], {
              content: ""
            } as BlogContentItem);
          })
        })).then(() => {
          resolve(blogContents);
        })
      }).catch(() => {
        reject(ErrorCode.DatabaseReadError);
      })
    })
  }
  /**
   * 删除草稿
   * @param id 草稿id
   */
  public deleteBlogDraft(id: string): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      if (!id) {
        reject(ErrorCode.ParamError)
      } else {
        deleteDatabase({
          table: "blog_draft",
          condition: `id='${id}'`,
        }).then(() => {
          //数据库删除成功
          let filePath = path.join(RootDir, DraftDir, `${id}.md`);
          rm(filePath).then(() => {
            resolve(true)
          }).catch(() => {
            reject(ErrorCode.FileDeleteFailure)
          })
        }).catch(() => {
          reject(ErrorCode.DatabaseDeleteError)
        })
      }
    })
  }
  /**
   * 获取博客分类数据
   * @returns 
   */
  public getCategoryData(): Promise<BlogCategory> {
    return new Promise((resolve, reject) => {
      queryFromDatabase<{ category: string }>({
        table: "blog_content",
        fields: ["category"]
      }).then(res => {
        let categoryData: Record<string, number> = {};
        res.forEach(val => {
          let categorys = val.category.split(",");
          categorys.forEach(category => {
            if (categoryData[category]) {
              let num = categoryData[category];
              categoryData[category] = ++num;
            } else {
              categoryData[category] = 1;
            }
          })
        });
        resolve(categoryData);
      }).catch(() => {
        reject(ErrorCode.DatabaseReadError);
      })
    })
  }
  /**
   * 发布博客
   * @param title 标题
   * @param content 内容
   * @param category 分类
   * @param id id 有id代表是从草稿转为博客发布 因此需要删除草稿
   */
  public releaseBlog(title: string, content: string, category: string[], id?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (title === "" || content === "" || category.length === 0) {
        reject(ErrorCode.ParamError);
      } else {
        if (!id) {
          id = generateUUID();
        }
        await insetLineToDatabase<{ id: string, title: string, category: string }>({
          table: "blog_content",
          fields: ["id", "title", "category"],
          values: [id, title, category.toString()]
        }).catch((err) => {
          console.error("保存博客失败:" + err);
        });
        let filePath = path.join(RootDir, BlogDir, `${id}.md`);
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
            //写入成功后尝试删除草稿(有,则删除)
            deleteDatabase({
              table: "blog_draft",
              condition: `id='${id}'`,
            });
            let filePath = path.join(RootDir, DraftDir, `${id}.md`);
            rm(filePath, { force: true })
          }
          writeStream?.end();
        });
      }
    })
  }
}