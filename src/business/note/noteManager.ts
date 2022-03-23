import { createWriteStream, WriteStream } from "fs";
import path from "path";
import { RootDir } from "../..";
import { ErrorCode } from "../../common/error";
import {
  deleteDatabase,
  insetLineToDatabase,
  queryFromDatabase,
  readFileContent,
} from "../../common/util";

class NoteData {
  id: number;
  label: string;
  children: NoteData[] = [];
  constructor(id: number, label: string) {
    this.id = id;
    this.label = label;
  }
}

export const NoteDir = "assets/note";

export default class NoteManager {
  //笔记管理器---单例
  private static _instance: NoteManager | null = null;
  public static get Instance(): NoteManager {
    if (this._instance === null) {
      this._instance = new NoteManager();
    }
    return this._instance;
  }
  private noteDataMap = new Map<number, NoteData>();
  private contentMap = new Map<number, string>();
  //流map 避免不同的写入流操作同一个文件。每对一个文件创建一个写入流，都把上一个结束掉。
  private streamMap = new Map<number, WriteStream>();
  private maxId: number = -1;
  constructor() {
    this.init();
  }
  public getNoteDataById(id: number) {
    return this.noteDataMap.get(id);
  }
  public createNoteData(label: string, parentId: number) {
    return new Promise<number>((resolve, reject) => {
      insetLineToDatabase({
        table: "note",
        fields: ["id", "label", "parent"],
        values: [++this.maxId, label, parentId],
      })
        .then(() => {
          let data = new NoteData(this.maxId, label);
          this.noteDataMap.set(this.maxId, data);
          let parent = this.noteDataMap.get(parentId)!;
          parent.children.push(data);
          resolve(this.maxId);
        })
        .catch(() => {
          reject(ErrorCode.DatabaseWriteError);
        });
    });
  }
  public deleteNoteData(id: number) {
    return new Promise<boolean>((resolve, reject) => {
      queryFromDatabase<{ parent: number }>({
        table: "note",
        fields: ["parent"],
        condition: `id='${id}'`,
      }).then((data) => {
        if (data.length !== 1) {
          reject([ErrorCode.DatabaseReadError, "数据错误,父节点数量不为1"]);
        } else {
          deleteDatabase({
            table: "note",
            condition: `id='${id}'`,
          })
            .then(() => {
              let parentData = this.noteDataMap.get(data[0].parent)!;
              let noteData = this.noteDataMap.get(id)!;
              this.noteDataMap.delete(id);
              parentData.children = parentData.children.filter((item) => {
                return item !== noteData;
              });
              resolve(true);
            })
            .catch(() => {
              reject([ErrorCode.DatabaseDeleteError]);
            });
        }
      });
    });
  }
  public getNoteContent(id: number) {
    return this.contentMap.get(id) || "";
  }
  public saveNoteContent(id: number, content: string) {
    return new Promise<boolean>((resolve, reject) => {
      let filePath = path.join(RootDir, NoteDir, `${id}.md`);
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
          this.contentMap.set(id, content);
          return resolve(true);
        }
      });
    });
  }
  private init() {
    this.readNoteData();
  }
  private readNoteData() {
    queryFromDatabase<{
      id: number;
      label: string;
      parent?: number | null;
    }>({
      table: "note",
      fields: ["id", "label", "parent"],
    }).then((sqlData) => {
      for (let i = 0; i < sqlData.length; i++) {
        const { id, label, parent } = sqlData[i];
        let data = new NoteData(id, label);
        this.noteDataMap.set(id, data);
        if (parent !== null) {
          let parentData = this.noteDataMap.get(parent!)!;
          parentData.children.push(data);
        }
        if (id > this.maxId) {
          this.maxId = id;
        }
        let filePath = path.join(RootDir, NoteDir, `${id}.md`);
        readFileContent(filePath)
          .then((content) => {
            this.contentMap.set(id, content);
          })
          .catch((err) => {});
      }
    });
  }
}
