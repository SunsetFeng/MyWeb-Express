import { createWriteStream, existsSync, mkdirSync, WriteStream } from "fs";
import { readdir, rm } from "fs/promises";
import path from "path";
import { address, port, RootDir } from "../..";
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
  time: string,  //发布时间
  category: string[]  //分类
}
/**
 * 图片资源类型
 */
type PictureData = {
  name: string,
  url: string
}

export const DraftDir = "assets/blog/draft";
export const BlogDir = "assets/blog/content";
export const BlogPictureDir = "assets/blog/image";

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
  //图片资源数组
  public pictureDatas: Array<PictureData> = [];

  constructor() {
    this.init();
  }
  /**
   * 是否存在这个博客
   * @param id 
   * @returns 
   */
  public hasBlog(id: string): boolean {
    if (this.blogMap.has(id)) {
      return true;
    }
    return false;
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
          }).catch(() => {
            return reject([ErrorCode.DatabaseWriteError, "写入草稿失败"])
          })
        } else {
          if (!this.draftMap.has(id)) {
            return reject([ErrorCode.ParamError, "不存在的id"]);
          }
          await updateDatabase<{ title?: string }>({
            table: "blog_draft",
            fields: ["title"],
            values: [title],
            condition: `id='${id}'`
          }).catch(err => {
            return reject([ErrorCode.DatabaseWriteError, "更新草稿失败"])
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
            return reject([ErrorCode.FileWriteFailure, "写入文件失败"]);
          } else {
            this.streamMap.delete(id!);
            //加入map
            let oldData = this.draftMap.get(id!) || {};
            let newData = Object.assign(oldData, {
              id: id!,
              title: title,
              content
            });
            this.draftMap.set(id!, newData);
            return resolve(id!);
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
        reject([ErrorCode.ParamError, "id"])
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
            reject([ErrorCode.FileDeleteFailure, "删除草稿文件失败"])
          })
        }).catch(() => {
          reject([ErrorCode.DatabaseDeleteError, "删除数据库草稿失败"])
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
        category: key,
        num: item.length
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
        reject([ErrorCode.ParamError]);
      } else {
        if (!id) {
          id = generateUUID();
        }
        let time = Date.now().toString();
        await insetLineToDatabase<{ id: string, title: string, category: string, time: string }>({
          table: "blog_content",
          fields: ["id", "title", "category", "time"],
          values: [id, title, category.toString(), time]
        }).catch(() => {
          return reject([ErrorCode.DatabaseWriteError, "保存博客失败"])
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
            return reject([ErrorCode.FileWriteFailure, "博客文件写入失败"]);
          } else {
            //博客数据
            let blogData: BlogData = {
              id: id!,
              title,
              content,
              category,
              time
            }
            //添加到博客map
            this.blogMap.set(id!, blogData);
            //添加到分类map
            this.addToCategory(category, blogData);
            //写入成功后尝试删除草稿(有,则删除)
            deleteDatabase({
              table: "blog_draft",
              condition: `id='${id}'`,
            });
            let filePath = path.join(RootDir, DraftDir, `${id}.md`);
            rm(filePath, { force: true });
            //从草稿移除
            this.draftMap.delete(id!);
            resolve(id!);
          }
          this.streamMap.delete(id!);
        });
      }
    })
  }
  /**
   * 删除博客
   * @param id 
   */
  public deleteBlog(id: string): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      if (!id) {
        reject([ErrorCode.ParamError, "id"]);
      } else {
        deleteDatabase({
          table: "blog_content",
          condition: `id='${id}'`
        }).then(() => {
          //数据库删除成功
          let filePath = path.join(RootDir, BlogDir, `${id}.md`);
          rm(filePath).then(() => {
            //文件删除成功,从map中移除
            let blogData = this.blogMap.get(id)!;
            this.blogMap.delete(id);
            this.removeFromCategory(blogData);
            resolve(true);
          }).catch(() => {
            reject([ErrorCode.FileDeleteFailure, "文件删除失败"]);
          })
        })
      }
    })
  }
  /**
   * 更新博客数据
   * @param id 
   * @param title 
   * @param content 
   * @param category 
   * @returns 
   */
  public modifyBlog(id: string, title?: string, content?: string, category?: string[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!id) {
        reject([ErrorCode.ParamError]);
      } else {
        let curBlogData = this.blogMap.get(id)!;
        let nextTitle = title || curBlogData.title;
        let nextCategory = category?.toString() || curBlogData.category.toString();
        updateDatabase({
          table: "blog_content",
          fields: ["title", "category"],
          values: [nextTitle, nextCategory],
          condition: `id='${id}'`
        });
        if (content) {
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
              reject([ErrorCode.FileWriteFailure, "更新博客文件失败"]);
            } else {
              let blogData = this.blogMap.get(id)!;
              //更新分类map
              this.removeFromCategory(blogData);
              blogData.category = category || blogData.category;
              blogData.title = nextTitle;
              blogData.content = content || blogData.content;
              this.addToCategory(blogData.category, blogData);
            }
            this.streamMap.delete(id);
            resolve(true);
          });
        }
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
   * 构建图片url
   * @param fileName 
   * @returns 
   */
  public makePictureAddress(fileName: string) {
    return `http://${address}:${port}/${BlogPictureDir}/${fileName}`
  }
  /**
   * 根据id获取博客数据
   * @param id 
   */
  public getBlogDataById(id: string): BlogData {
    return this.blogMap.get(id)!;
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
   * 从分类map中移除
   * @param blogData 
   */
  private removeFromCategory(blogData: BlogData) {
    let categorys = blogData.category;
    for (let i = 0; i < categorys.length; i++) {
      let blogDatas = this.categoryMap.get(categorys[i])!;
      let index = blogDatas.findIndex((val) => {
        return val === blogData;
      });
      blogDatas.splice(index, 1);
      if (blogDatas.length === 0) {
        this.categoryMap.delete(categorys[i]);
      }
    }
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
        reject([ErrorCode.DatabaseReadError, "读取草稿数据失败"]);
      });
    })
  }
  /**
   * 初始读取博客数据
   */
  private readBlogData(): Promise<Boolean> {
    return new Promise((resolve, reject) => {
      queryFromDatabase<{ id: string, title: string, category: string, time: string }>({
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
        reject([ErrorCode.DatabaseReadError, "读取博客数据失败"]);
      })
    })
  }
  /**
   * 初始化博客图片资源数据
   */
  private readBlogPicture(): Promise<boolean> {
    return new Promise((resovle, reject) => {
      let dirPath = path.join(RootDir, BlogPictureDir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath,{
          recursive:true
        });
      }
      readdir(dirPath).then(res => {
        for (let i = 0; i < res.length; i++) {
          this.pictureDatas.push({
            name: res[i],
            url: this.makePictureAddress(res[i])
          })
        }
        resovle(true);
        console.log("图片资源初始化完成");
      }).catch(err => {
        console.log(err);
      })
    })
  }
  /**
   * 初始化
   */
  private init() {
    this.readDraftData(); //读取草稿数据
    this.readBlogData(); //读取博客数据
    this.readBlogPicture(); //读物博客图片资源
  }
}
