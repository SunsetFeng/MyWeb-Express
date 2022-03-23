import BlogManager from "../business/blog/blogManager";
import NoteManager from "../business/note/noteManager";
/**
 * 管理器类 提前初始化
 */
export class Mgr {
  static blogMgr: BlogManager;
  static noteMgr: NoteManager;
  static init() {
    this.blogMgr = BlogManager.Instance;
    this.noteMgr = NoteManager.Instance;
  }
}