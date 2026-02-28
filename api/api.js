import { Router } from "express";

import adminRouter from "./admin/adminRouter.js";
import answerRouter from "./answers/answerRouter.js";
import authRouter from "./auth/authRouter.js";
import commentRouter from "./comments/commentRouter.js";
import deviceTokenRouter from "./deviceTokens/deviceTokenRouter.js";
import notificationRouter from "./notifications/notificationRouter.js";
import pushConfigRouter from "./pushNotifications/pushConfigRouter.js";
import questionRouter from "./questions/questionRouter.js";
import uploadRouter from "./uploads/uploadRouter.js";
import userRouter from "./users/userRouter.js";
import voteRouter from "./votes/voteRouter.js";

const api = Router();

api.use("/questions", questionRouter);
api.use("/answers", answerRouter);
api.use("/votes", voteRouter);
api.use("/comments", commentRouter);
api.use("/notifications", notificationRouter);
api.use("/users", userRouter);
api.use("/devices", deviceTokenRouter);
api.use("/push", pushConfigRouter);
api.use("/upload", uploadRouter);
api.use("/admin", adminRouter);

api.use("/auth", authRouter);

export default api;
