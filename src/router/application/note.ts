import express from "express";
import { ErrorCode, makeErrorMsg } from "../../common/error";
import { Mgr } from "../../common/manager";
import { checkPermision, NOTE } from "../../common/permission";

export const noteRouter = express.Router();

noteRouter.use("/permission", (req, res, next) => {
  let body = req.body;
  if (!checkPermision(body.flag, NOTE)) {
    //权限不足
    res.send(makeErrorMsg(ErrorCode.Perrsion));
  } else {
    next();
  }
});

noteRouter.post("/tagContent", (req, res) => {
  let body = req.body;
  let id = body.id;
  let noteData = Mgr.noteMgr.getNoteDataById(id);
  if (!noteData) {
    res.send(makeErrorMsg(ErrorCode.ParamError, "不存在的id"));
  } else {
    res.send(JSON.stringify(noteData));
  }
});
noteRouter.post("/permission/createTag", (req, res) => {
  let body = req.body;
  let label: string = body.label;
  let parentId: number = body.parentId;
  Mgr.noteMgr
    .createNoteData(label, parentId)
    .then((id: number) => {
      res.send(
        JSON.stringify({
          status: true,
          id,
        })
      );
    })
    .catch((err: ErrorCode) => {
      res.send(makeErrorMsg(err));
    });
});
noteRouter.post("/permission/deleteTag", (req, res) => {
  let body = req.body;
  let id: number = body.id;
  Mgr.noteMgr
    .deleteNoteData(id)
    .then(() => {
      res.send(
        JSON.stringify({
          status: true,
        })
      );
    })
    .catch((err: [ErrorCode, string]) => {
      res.send(makeErrorMsg(err[0], err[1]));
    });
});
noteRouter.post("/noteContent", (req, res) => {
  let body = req.body;
  let id: number = body.id;
  let content = Mgr.noteMgr.getNoteContent(id);
  res.send(
    JSON.stringify({
      id,
      status: true,
      content,
    })
  );
});
noteRouter.post("/permission/saveNoteContent", (req, res) => {
  let body = req.body;
  let id: number = body.id;
  let content: string = body.content;
  Mgr.noteMgr
    .saveNoteContent(id, content)
    .then(() => {
      res.send(
        JSON.stringify({
          status: true,
        })
      );
    })
    .catch((err: [ErrorCode, string]) => {
      res.send(makeErrorMsg(err[0], err[1]));
    });
});
