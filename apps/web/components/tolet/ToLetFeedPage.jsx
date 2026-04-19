"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  BedDouble,
  Check,
  Clock3,
  Home,
  ImagePlus,
  MapPin,
  MessageCircle,
  PenSquare,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  rentAmount: "",
  bedrooms: 2,
  bathrooms: 1,
  phone: "",
  imageUrl: "",
};

const formatTime = (value) =>
  new Date(value).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const statusTone = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
};

const statusLabel = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

function PostModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  isPending,
  editingPost,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-md border border-white/10 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">
              {editingPost ? "Edit Post" : "Create Post"}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editingPost ? "পোস্ট আপডেট করুন" : "নতুন To Let পোস্ট"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80svh] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-4">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="শিরোনাম"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="বাসার ডিটেইল লিখুন"
              rows={5}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
            />
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="লোকেশন"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={form.rentAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, rentAmount: e.target.value }))}
                placeholder="মাসিক ভাড়া"
                type="number"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="ফোন নম্বর"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
              />
              <input
                value={form.bedrooms}
                onChange={(e) => setForm((prev) => ({ ...prev, bedrooms: e.target.value }))}
                placeholder="বেডরুম"
                type="number"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
              />
              <input
                value={form.bathrooms}
                onChange={(e) => setForm((prev) => ({ ...prev, bathrooms: e.target.value }))}
                placeholder="বাথরুম"
                type="number"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </div>

            <div className="relative">
              <ImagePlus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="Image URL"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-sm text-slate-500">
            {editingPost
              ? "Pending পোস্ট পোস্টার এডিট করতে পারবে, approved হলে শুধুই super admin পারবে।"
              : "পোস্ট সাবমিট হলে approval flow অনুযায়ী দেখানো হবে।"}
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            <Send className="h-4 w-4" />
            {editingPost ? "আপডেট করুন" : "পোস্ট করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedCard({ post, role, onReact, onComment, onEdit }) {
  const [commentBody, setCommentBody] = useState("");
  const [showComments, setShowComments] = useState(false);
  const canEditPost = role === "admin" || post.canEdit;

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-black text-white">
          {post.author?.name?.[0] || "B"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{post.author?.name}</p>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              {post.author?.role === "admin" ? "সুপার অ্যাডমিন" : "পোস্টকারী"}
            </span>
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusTone[post.status] || "bg-slate-100 text-slate-600"}`}>
              {statusLabel[post.status] || post.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatTime(post.createdAt)}</p>
        </div>
        {canEditPost && (
          <button
            type="button"
            onClick={() => onEdit(post)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        <p className="text-xl font-black tracking-tight text-slate-950">{post.title}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.description}</p>

        <div className="mt-4 grid gap-3 rounded-md bg-[linear-gradient(135deg,#f8fbff,white)] p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">মাসিক ভাড়া</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              ৳{Number(post.rentAmount || 0).toLocaleString("bn-BD")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">রুম</p>
            <p className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-900">
              <BedDouble className="h-4 w-4 text-sky-600" />
              {post.bedrooms} বেড • {post.bathrooms} বাথ
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-600" />
            <span>{post.location}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 text-emerald-600" />
            <span>{post.phone || "ফোন দেওয়া হয়নি"}</span>
          </div>
        </div>

        {post.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
            <img src={post.imageUrl} alt={post.title} className="h-[220px] w-full object-cover sm:h-[320px]" />
          </div>
        )}

        {post.status === "rejected" && post.rejectionReason && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Rejection note: {post.rejectionReason}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
        <p>
          {post.reactionCount} reactions • {post.commentCount} comments
        </p>
        <p className="text-xs text-slate-400">Click react to like this post</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => onReact(post._id, "like")}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 ${
            post.currentReaction === "like" ? "bg-sky-50 text-sky-600" : "text-slate-600"
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          Like
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
      </div>

      {showComments && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment._id} className="rounded-md bg-white px-4 py-3">
                <p className="font-semibold text-slate-900">{comment.author?.name}</p>
                <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
              </div>
            ))}
            {post.comments.length === 0 && (
              <p className="text-sm text-slate-500">এখনো কোনো কমেন্ট নেই</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="কমেন্ট লিখুন..."
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!commentBody.trim()) return;
                onComment(post._id, commentBody, () => setCommentBody(""));
              }}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Send className="h-4 w-4" />
              পাঠান
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function QueueCard({ post, onEdit, onApprove, onReject }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{post.title}</p>
          <p className="mt-1 text-sm text-slate-500">{post.location}</p>
          <p className="mt-2 text-sm text-slate-700">{post.description}</p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusTone[post.status] || "bg-slate-100 text-slate-600"}`}>
          {statusLabel[post.status] || post.status}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(post)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <PenSquare className="h-4 w-4" />
            Edit
          </button>
        )}
        {onApprove && (
          <button
            type="button"
            onClick={() => onApprove(post)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
        )}
        {onReject && (
          <button
            type="button"
            onClick={() => onReject(post)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

export function ToLetFeedPage({ role }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] }),
      queryClient.invalidateQueries({ queryKey: ["to-let", "pending"] }),
      queryClient.invalidateQueries({ queryKey: ["to-let", "mine"] }),
    ]);
  };

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["to-let", "posts"],
    queryFn: () => request({ url: "/to-let/posts" }),
    enabled: role !== "landlord",
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ["to-let", "mine"],
    queryFn: () => request({ url: "/to-let/mine" }),
    enabled: role !== "landlord",
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["to-let", "pending"],
    queryFn: () => request({ url: "/to-let/pending" }),
    enabled: role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/to-let/posts", payload),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      setForm(emptyForm);
      setModalOpen(false);
      await invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || "পোস্ট করা যায়নি"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/to-let/posts/${id}`, payload),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      setEditingPost(null);
      setForm(emptyForm);
      setModalOpen(false);
      await invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || "পোস্ট আপডেট করা যায়নি"),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, type }) => api.post(`/to-let/posts/${id}/reactions`, { type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] }),
    onError: (err) => toast.error(err.response?.data?.message || "রিয়্যাক্ট করা যায়নি"),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/to-let/posts/${id}/comments`, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] }),
    onError: (err) => toast.error(err.response?.data?.message || "কমেন্ট করা যায়নি"),
  });

  const moderationMutation = useMutation({
    mutationFn: ({ id, action }) =>
      api.put(`/to-let/posts/${id}/${action}`, action === "reject" ? { reason: "মানদণ্ড পূরণ করেনি" } : {}),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      await invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });

  const stats = useMemo(
    () => ({
      count: posts.length,
      totalReactions: posts.reduce((sum, item) => sum + (item.reactionCount || 0), 0),
      myPending: myPosts.filter((post) => post.status === "pending").length,
    }),
    [myPosts, posts],
  );

  const openCreate = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title || "",
      description: post.description || "",
      location: post.location || "",
      rentAmount: post.rentAmount || "",
      bedrooms: post.bedrooms || 0,
      bathrooms: post.bathrooms || 0,
      phone: post.phone || "",
      imageUrl: post.imageUrl || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost._id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-md bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.25),transparent_24%),linear-gradient(135deg,#082f49_0%,#0f766e_45%,#38bdf8_100%)] p-5 text-white sm:p-7">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.08),transparent)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
              <Home className="h-3.5 w-3.5" />
              Tenant To Let Feed
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              স্ক্রল করুন, রিয়্যাক্ট করুন, পোস্ট করুন
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-[15px]">
              Facebook-style ফিডে approved পোস্ট স্ক্রল হবে, আর নতুন পোস্ট modal থেকে submit হবে।
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-sky-900 transition hover:bg-sky-50"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </button>
              <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Simple like reaction
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
            <div className="rounded-md border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Approved</p>
              <p className="mt-2 text-2xl font-black">{stats.count}</p>
            </div>
            <div className="rounded-md border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Reactions</p>
              <p className="mt-2 text-2xl font-black">{stats.totalReactions}</p>
            </div>
            <div className="rounded-md border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">My Pending</p>
              <p className="mt-2 text-2xl font-black">{stats.myPending}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">পোস্ট কন্ট্রোল</p>
                <p className="mt-1 text-sm text-slate-500">
                  Modal থেকে create করুন, আর approval-এর আগে নিজের পোস্ট edit করুন।
                </p>
              </div>
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <PenSquare className="h-5 w-5" />
              </div>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              Open Post Modal
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
              <h2 className="text-lg font-black text-slate-950">আমার পোস্ট</h2>
            </div>
            <div className="mt-4 space-y-3">
              {myPosts.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  এখনো কোনো পোস্ট নেই
                </p>
              ) : (
                myPosts.slice(0, 5).map((post) => (
                  <QueueCard
                    key={post._id}
                    post={post}
                    onEdit={role === "admin" || post.canEdit ? openEdit : null}
                  />
                ))
              )}
            </div>
          </div>

          {role === "admin" && (
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-lg font-black text-slate-950">Pending Approval</h2>
              </div>
              <div className="mt-4 space-y-3">
                {pending.length === 0 ? (
                  <p className="rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    এখন কোনো pending post নেই
                  </p>
                ) : (
                  pending.map((post) => (
                    <QueueCard
                      key={post._id}
                      post={post}
                      onEdit={openEdit}
                      onApprove={(item) => moderationMutation.mutate({ id: item._id, action: "approve" })}
                      onReject={(item) => moderationMutation.mutate({ id: item._id, action: "reject" })}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-3 sm:p-4">
          <div className="mb-4 flex items-center justify-between px-2">
            <div>
              <p className="text-sm font-bold text-slate-950">লাইভ ফিড</p>
              <p className="text-sm text-slate-500">Responsive scrollable post stream</p>
            </div>
            <div className="hidden rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 sm:block">
              Feed style
            </div>
          </div>

          <div className="max-h-[calc(100svh-220px)] space-y-4 overflow-y-auto px-1 pb-2 sm:px-2">
            {isLoading ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                ফিড লোড হচ্ছে...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                এখনো কোনো approved post নেই
              </div>
            ) : (
              posts.map((post) => (
                <FeedCard
                  key={post._id}
                  post={post}
                  role={role}
                  onEdit={openEdit}
                  onReact={(id, type) => reactionMutation.mutate({ id, type })}
                  onComment={(id, body, done) =>
                    commentMutation.mutate(
                      { id, body },
                      {
                        onSuccess: () => done?.(),
                      },
                    )
                  }
                />
              ))
            )}
          </div>
        </div>
      </section>

      <PostModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPost(null);
          setForm(emptyForm);
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        editingPost={editingPost}
      />
    </div>
  );
}
