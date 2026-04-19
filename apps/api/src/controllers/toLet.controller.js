import ToLetPost from "../models/ToLetPost.model.js";

const REACTION_TYPES = ["like", "love", "care"];

const ensureToLetAccess = (req, { adminOnly = false } = {}) => {
  if (adminOnly && req.user.role !== "admin") return "এই কাজের অনুমতি নেই";
  if (!adminOnly && req.user.role === "landlord") return "এই ফিচার বাড়ীওয়ালার জন্য উন্মুক্ত নয়";
  return null;
};

const serializePost = (post, userId) => {
  const summary = { like: 0, love: 0, care: 0 };
  for (const reaction of post.reactions || []) {
    summary[reaction.type] = (summary[reaction.type] || 0) + 1;
  }

  const currentReaction = (post.reactions || []).find(
    (reaction) => String(reaction.userId?._id || reaction.userId) === String(userId),
  );

  return {
    _id: post._id,
    title: post.title,
    description: post.description,
    location: post.location,
    rentAmount: post.rentAmount,
    bedrooms: post.bedrooms,
    bathrooms: post.bathrooms,
    phone: post.phone,
    imageUrl: post.imageUrl,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    approvedAt: post.approvedAt,
    rejectionReason: post.rejectionReason || "",
    author: {
      _id: post.authorId?._id || post.authorId,
      name: post.authorId?.name || "অজানা",
      role: post.authorId?.role || post.authorRole,
      phone: post.authorId?.phone || "",
    },
    comments: (post.comments || []).map((comment) => ({
      _id: comment._id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: {
        _id: comment.userId?._id || comment.userId,
        name: comment.userId?.name || "অজানা",
        role: comment.userId?.role || "tenant",
      },
    })),
    reactionSummary: summary,
    reactionCount: (post.reactions || []).length,
    commentCount: (post.comments || []).length,
    currentReaction: currentReaction?.type || null,
  };
};

export const listToLetPosts = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req);
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const posts = await ToLetPost.find({ status: "approved" })
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: posts.map((post) => serializePost(post, req.user._id)),
    });
  } catch (err) {
    next(err);
  }
};

export const createToLetPost = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req);
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const {
      title,
      description,
      location,
      rentAmount,
      bedrooms,
      bathrooms,
      phone,
      imageUrl,
    } = req.body;

    if (!title?.trim() || !description?.trim() || !location?.trim()) {
      return res.status(400).json({ success: false, message: "শিরোনাম, বিবরণ এবং লোকেশন দিন" });
    }

    const numericRent = Number(rentAmount);
    if (!Number.isFinite(numericRent) || numericRent < 0) {
      return res.status(400).json({ success: false, message: "সঠিক ভাড়ার পরিমাণ দিন" });
    }

    const post = await ToLetPost.create({
      authorId: req.user._id,
      authorRole: req.user.role,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      rentAmount: numericRent,
      bedrooms: Math.max(0, Number(bedrooms) || 0),
      bathrooms: Math.max(0, Number(bathrooms) || 0),
      phone: phone?.trim() || req.user.phone || "",
      imageUrl: imageUrl?.trim() || "",
      status: req.user.role === "admin" ? "approved" : "pending",
      approvedAt: req.user.role === "admin" ? new Date() : null,
      approvedBy: req.user.role === "admin" ? req.user._id : null,
    });

    const populated = await ToLetPost.findById(post._id)
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name");

    res.status(201).json({
      success: true,
      message:
        req.user.role === "admin"
          ? "পোস্ট প্রকাশ হয়েছে"
          : "পোস্ট জমা হয়েছে, সুপার অ্যাডমিন অনুমোদনের পর দেখানো হবে",
      data: serializePost(populated, req.user._id),
    });
  } catch (err) {
    next(err);
  }
};

export const toggleToLetReaction = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req);
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const post = await ToLetPost.findOne({ _id: req.params.id, status: "approved" })
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name");
    if (!post) return res.status(404).json({ success: false, message: "পোস্ট পাওয়া যায়নি" });

    const type = REACTION_TYPES.includes(req.body.type) ? req.body.type : "like";
    const existing = post.reactions.find(
      (reaction) => String(reaction.userId?._id || reaction.userId) === String(req.user._id),
    );

    if (existing && existing.type === type) {
      post.reactions = post.reactions.filter(
        (reaction) => String(reaction.userId?._id || reaction.userId) !== String(req.user._id),
      );
    } else if (existing) {
      existing.type = type;
    } else {
      post.reactions.push({ userId: req.user._id, type });
    }

    await post.save();
    await post.populate("reactions.userId", "name");

    res.json({
      success: true,
      message: "রিয়্যাকশন আপডেট হয়েছে",
      data: serializePost(post, req.user._id),
    });
  } catch (err) {
    next(err);
  }
};

export const addToLetComment = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req);
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const post = await ToLetPost.findOne({ _id: req.params.id, status: "approved" });
    if (!post) return res.status(404).json({ success: false, message: "পোস্ট পাওয়া যায়নি" });
    if (!req.body.body?.trim()) {
      return res.status(400).json({ success: false, message: "কমেন্ট লিখুন" });
    }

    post.comments.push({
      userId: req.user._id,
      body: req.body.body.trim(),
    });
    await post.save();

    const populated = await ToLetPost.findById(post._id)
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name");

    res.status(201).json({
      success: true,
      message: "কমেন্ট যোগ হয়েছে",
      data: serializePost(populated, req.user._id),
    });
  } catch (err) {
    next(err);
  }
};

export const listPendingToLetPosts = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req, { adminOnly: true });
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const posts = await ToLetPost.find({ status: "pending" })
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: posts.map((post) => serializePost(post, req.user._id)),
    });
  } catch (err) {
    next(err);
  }
};

export const approveToLetPost = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req, { adminOnly: true });
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const post = await ToLetPost.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: req.user._id,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: "",
      },
      { new: true },
    )
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name");

    if (!post) return res.status(404).json({ success: false, message: "পোস্ট পাওয়া যায়নি" });

    res.json({
      success: true,
      message: "পোস্ট অনুমোদিত হয়েছে",
      data: serializePost(post, req.user._id),
    });
  } catch (err) {
    next(err);
  }
};

export const rejectToLetPost = async (req, res, next) => {
  try {
    const accessError = ensureToLetAccess(req, { adminOnly: true });
    if (accessError) return res.status(403).json({ success: false, message: accessError });

    const post = await ToLetPost.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: req.user._id,
        rejectionReason: req.body.reason?.trim() || "",
      },
      { new: true },
    )
      .populate("authorId", "name role phone")
      .populate("comments.userId", "name role")
      .populate("reactions.userId", "name");

    if (!post) return res.status(404).json({ success: false, message: "পোস্ট পাওয়া যায়নি" });

    res.json({
      success: true,
      message: "পোস্ট প্রত্যাখ্যান করা হয়েছে",
      data: serializePost(post, req.user._id),
    });
  } catch (err) {
    next(err);
  }
};
