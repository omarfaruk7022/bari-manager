import { Router } from "express";
import {
  addToLetComment,
  approveToLetPost,
  createToLetPost,
  listPendingToLetPosts,
  listMyToLetPosts,
  listToLetPosts,
  rejectToLetPost,
  toggleToLetReaction,
  updateToLetPost,
} from "../controllers/toLet.controller.js";

const router = Router();

router.get("/posts", listToLetPosts);
router.post("/posts", createToLetPost);
router.get("/mine", listMyToLetPosts);
router.get("/pending", listPendingToLetPosts);
router.put("/posts/:id", updateToLetPost);
router.put("/posts/:id/approve", approveToLetPost);
router.put("/posts/:id/reject", rejectToLetPost);
router.post("/posts/:id/comments", addToLetComment);
router.post("/posts/:id/reactions", toggleToLetReaction);

export default router;
