export default class BlogManager {
  //博客管理器---单例
  private static _instance: BlogManager | null = null;
  public static get Instance(): BlogManager {
    if (this._instance === null) {
      this._instance = new BlogManager();
    }
    return this._instance;
  }
}