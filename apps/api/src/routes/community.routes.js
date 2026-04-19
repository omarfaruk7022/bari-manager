import { Router } from "express";
import {
  getCommunityState,
  postCommunityMessage,
  updateCommunityMemberModeration,
} from "../controllers/community.controller.js";

const router = Router();

router.get("/", getCommunityState);
router.post("/messages", postCommunityMessage);
router.put("/members/:memberId/moderation", updateCommunityMemberModeration);

export default router;
