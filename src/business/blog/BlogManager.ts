import { createWriteStream, existsSync, WriteStream } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { RootDir } from "../..";
import { ErrorCode } from "../../common/error";
import { deleteDatabase, generateUUID, insetLineToDatabase, queryFromDatabase, readFileContent, updateDatabase } from "../../common/util";

//博客分类数据
export type BlogCategoryData = {
  category: string,
  num: number
}
/**
 * 草稿数据类型
 */
export type DraftData = {
  id: string, //id
  title: string, //名称
  content: string,  //内容
}
/**
 * 博客数据类型
 */
type BlogData = {
  id: string, //id
  content: string,  //内容
  title: string,  //名称
  category: string[]  //分类
}

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
  //草稿数据map  id => DraftData
  private draftMap = new Map<string, DraftData>();
  //博客数据map  id => BlogData
  private blogMap = new Map<string, BlogData>();
  //博客分类数据map category => BlogData[]
  private categoryMap = new Map<string, BlogData[]>();

  constructor() {
    this.init();
  }
  /**
   * 保存草稿
   * @param content 内容
   * @param title 标题
   * @param id 草稿id
   * @returns 成功返回id 失败返回code
   */
  public saveBlogDraft(content: string, title: string, id?: string): Promise<string> {
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
            writeStream?.end();
            //加入map
            let oldData = this.draftMap.get(id!) || {};
            let newData = Object.assign(oldData, {
              id: id!,
              title: title,
              content
            });
            this.draftMap.set(id!, newData);
            resolve(id!);
          }
        });
      }
    })
  }
  /**
   * 获取草稿数据
   * @returns 
   */
  public getBlogContent(id?: string): DraftData[] {
    let draftVals: DraftData[] = [];
    if (id) {
      draftVals.push(this.draftMap.get(id)!);
    } else {
      for (let [id, item] of this.draftMap) {
        draftVals.push(item);
      }
    }
    return draftVals;
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
            this.draftMap.delete(id);
            resolve(true);
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
  public getCategoryData(): BlogCategoryData[] {
    let categoryData: BlogCategoryData[] = [];
    for (let [key, item] of this.categoryMap) {
      categoryData.push({
        category:key,
        num:item.length
      })
    }
    return categoryData;
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
            //博客数据
            let blogData: BlogData = {
              id: id!,
              title,
              content,
              category
            }
            //添加到博客map
            this.blogMap.set(id!, blogData);
            //添加到分类map
            this.addToCategory(category, blogData);
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
  /**
   * 根据分类获取博客数据
   * @param category 
   */
  public getBlogDatasByCatgory(category: string): BlogData[] {
    return this.categoryMap.get(category)!;
  }
  /**
   * 添加到分类map
   * @param category 
   * @param blogData 
   */
  private addToCategory(category: string[], blogData: BlogData) {
    category.forEach(val => {
      let blogs = this.categoryMap.get(val);
      if (!blogs) {
        this.categoryMap.set(val, [blogData]);
      } else {
        blogs.push(blogData);
      }
    })
  }
  /**
   * 初始读取草稿数据
   */
  private readDraftData(): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      queryFromDatabase<{ id: string, title: string }>({
        table: "blog_draft",
        fields: '*',
      }).then(res => {
        Promise.all(res.map(item => {
          let draftData = Object.assign(item, {
            content: "",
          })
          this.draftMap.set(item.id, draftData);
          let filePath = path.join(RootDir, DraftDir, `${item.id}.md`);
          return readFileContent(filePath).then(content => {
            //正常读取
            draftData.content = content;
          }).catch(() => {
            //异常读取
            draftData.content = "";
          })
        })).then(() => {
          console.log("草稿数据初始化完成")
          resolve(true);
        })
      }).catch(() => {
        reject(ErrorCode.DatabaseReadError);
      })
    })
  }
  /**
   * 初始读取博客数据
   */
  private readBlogData(): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      queryFromDatabase<{ id: string, title: string, category: string }>({
        table: "blog_content",
        fields: '*',
      }).then(res => {
        Promise.all(res.map(item => {
          let category = item.category.split(",");
          let blogData: BlogData = Object.assign(item, {
            category,
            content: ""
          });
          //添加到分类map
          this.addToCategory(category, blogData);
          //添加到博客map
          this.blogMap.set(item.id, blogData);
          //读取文件内容
          let filePath = path.join(RootDir, BlogDir, `${item.id}.md`);
          return readFileContent(filePath).then(content => {
            //正常读取
            blogData.content = content;
          }).catch(() => {
            //异常读取
            blogData.content = "";
          })
        })).then(() => {
          console.log("博客数据初始化完成")
          resolve(true);
        })
      }).catch(() => {
        reject(ErrorCode.DatabaseReadError);
      })
    })
  }
  /**
   * 初始化
   */
  private init() {
    this.readDraftData(); //读取草稿数据
    this.readBlogData(); //读取博客数据
  }
}
