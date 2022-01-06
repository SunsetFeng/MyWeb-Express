import BlogManager from "../business/blog/blogManager";
/**
 * 管理器类 提前初始化
 */
export class Mgr {
  static blogMgr: BlogManager;
  static init() {
    this.blogMgr = BlogManager.Instance;
  }
}