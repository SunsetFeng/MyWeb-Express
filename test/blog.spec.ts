import path from "path"
import { init, RootDir } from "../src"
import BlogManager, { DraftDir } from "../src/business/blog/blogManager"
import { ErrorCode } from "../src/common/error"
import { queryFromDatabase, readFileContent } from "../src/common/util"


describe("blog test", () => {
  beforeAll(async () => {
    await init();
  })
  afterAll(() => {
    setTimeout(() => {
      process.exit(0)
    },1000);
  })
  test("save draft without id and title", async () => {
    //不带标题的测试
    return BlogManager.Instance.saveBlogDraft("测试用例").then(async id => {
      let filePath = path.join(RootDir, DraftDir, `${id}.md`);
      await readFileContent(filePath).then(content => {
        expect(content).toEqual("测试用例");
      });
      await queryFromDatabase<{ id: string, title: string | null }>({
        table: "blog_draft",
        fields: "*",
        condition: `id='${id}'`
      }).then(results => {
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id,
          title: null,
        });
      }).catch(err => {
        console.error(err);
      })
    }).catch((code: ErrorCode) => {
      expect([ErrorCode.FileWriteFailure, ErrorCode.CreateFileFailure].includes(code)).toEqual(true);
    });
  })
})