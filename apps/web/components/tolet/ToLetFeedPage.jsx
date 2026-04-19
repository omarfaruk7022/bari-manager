"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  SmilePlus,
  ThumbsUp,
} from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const REACTIONS = [
  { type: "like", label: "Like", icon: ThumbsUp, className: "text-sky-600" },
  { type: "love", label: "Love", icon: Heart, className: "text-rose-600" },
  { type: "care", label: "Care", icon: SmilePlus, className: "text-amber-600" },
];

const formatTime = (value) =>
  new Date(value).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function FeedCard({ post, onReact, onComment, disabledShare = true }) {
  const [commentBody, setCommentBody] = useState("");
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
          {post.author?.name?.[0] || "B"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{post.author?.name}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              {post.author?.role === "admin" ? "সুপার অ্যাডমিন" : "পোস্টকারী"}
            </span>
          </div>
          <p className="text-xs text-gray-500">{formatTime(post.createdAt)}</p>
        </div>
      </div>

      <div className="px-5 pb-4 pt-4">
        <p className="text-lg font-bold text-gray-950">{post.title}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {post.description}
        </p>

        <div className="mt-4 grid gap-3 rounded-3xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              মাসিক ভাড়া
            </p>
            <p className="mt-1 text-xl font-black text-gray-900">
              ৳{Number(post.rentAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              কক্ষ
            </p>
            <p className="mt-1 font-semibold text-gray-900">
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
          <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-gray-100">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="h-[320px] w-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
        <p>
          {post.reactionCount} reactions • {post.commentCount} comments
        </p>
      </div>

      <div className="grid grid-cols-5 border-t border-gray-100 text-sm font-semibold text-gray-600">
        {REACTIONS.map(({ type, label, icon: Icon, className }) => {
          const active = post.currentReaction === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onReact(post._id, type)}
              className={`flex items-center justify-center gap-2 px-3 py-3 hover:bg-gray-50 ${
                active ? className : ""
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center justify-center gap-2 px-3 py-3 hover:bg-gray-50"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
        <button
          type="button"
          disabled={disabledShare}
          className="flex items-center justify-center gap-2 px-3 py-3 text-gray-300"
        >
          <Send className="h-4 w-4" />
          Share
        </button>
      </div>

      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <div className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment._id} className="rounded-2xl bg-white px-4 py-3">
                <p className="font-semibold text-gray-900">
                  {comment.author?.name}
                </p>
                <p className="mt-1 text-sm text-gray-700">{comment.body}</p>
              </div>
            ))}
            {post.comments.length === 0 && (
              <p className="text-sm text-gray-500">এখনো কোনো কমেন্ট নেই</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="কমেন্ট লিখুন..."
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!commentBody.trim()) return;
                onComment(post._id, commentBody, () => setCommentBody(""));
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
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

export function ToLetFeedPage({ role }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    rentAmount: "",
    bedrooms: 2,
    bathrooms: 1,
    phone: "",
    imageUrl: "",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["to-let", "posts"],
    queryFn: () => request({ url: "/to-let/posts" }),
    enabled: role !== "landlord",
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["to-let", "pending"],
    queryFn: () => request({ url: "/to-let/pending" }),
    enabled: role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/to-let/posts", payload),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setForm({
        title: "",
        description: "",
        location: "",
        rentAmount: "",
        bedrooms: 2,
        bathrooms: 1,
        phone: "",
        imageUrl: "",
      });
      queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["to-let", "pending"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "পোস্ট করা যায়নি"),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, type }) =>
      api.post(`/to-let/posts/${id}/reactions`, { type }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] }),
    onError: (err) =>
      toast.error(err.response?.data?.message || "রিয়্যাক্ট করা যায়নি"),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, body }) =>
      api.post(`/to-let/posts/${id}/comments`, { body }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] }),
    onError: (err) =>
      toast.error(err.response?.data?.message || "কমেন্ট করা যায়নি"),
  });

  const moderationMutation = useMutation({
    mutationFn: ({ id, action }) =>
      api.put(
        `/to-let/posts/${id}/${action}`,
        action === "reject" ? { reason: "মানদণ্ড পূরণ করেনি" } : {},
      ),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ["to-let", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["to-let", "pending"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });

  const approvedStats = useMemo(
    () => ({
      count: posts.length,
      totalReactions: posts.reduce(
        (sum, item) => sum + (item.reactionCount || 0),
        0,
      ),
    }),
    [posts],
  );

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-950 via-sky-800 to-blue-500 p-5 text-white shadow-[0_24px_80px_-28px_rgba(37,99,235,0.7)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-sky-50/90 backdrop-blur">
              <Home className="h-3.5 w-3.5" />
              বাসা ভাড়ার - To Let
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Facebook feed-style rental posts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/85">
              নতুন বাসা ভাড়া, লোকেশন, ভাড়া, যোগাযোগ আর কমিউনিটি ফিড এখন এক
              জায়গায়।
            </p>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-sky-50/90 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">
              লাইভ স্ট্যাটাস
            </p>
            <p className="mt-2 font-semibold">
              {approvedStats.count} approved posts
            </p>
            <p className="mt-1 text-xs text-sky-100/75">
              {approvedStats.totalReactions} total reactions
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">নতুন পোস্ট দিন</h2>
            <p className="mt-1 text-sm text-gray-500">
              টেক্সট-ভিত্তিক পোস্ট, optional image URL, comment আর reaction
              ready।
            </p>

            <div className="mt-4 space-y-3">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="শিরোনাম"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="বাসার বিবরণ লিখুন"
                rows={5}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
              />
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="লোকেশন"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.rentAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, rentAmount: e.target.value }))
                  }
                  placeholder="ভাড়া"
                  type="number"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
                />
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="যোগাযোগ নম্বর"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.bedrooms}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bedrooms: e.target.value }))
                  }
                  placeholder="বেডরুম"
                  type="number"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
                />
                <input
                  value={form.bathrooms}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bathrooms: e.target.value }))
                  }
                  placeholder="বাথরুম"
                  type="number"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
                />
              </div>
              <input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="Image URL (optional)"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-sky-300"
              >
                <Send className="h-4 w-4" />
                পোস্ট করুন
              </button>
            </div>
          </div>

          {role === "admin" && (
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Pending approval
              </h2>
              <div className="mt-4 space-y-3">
                {pending.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    এখন কোনো pending post নেই
                  </p>
                ) : (
                  pending.map((post) => (
                    <div key={post._id} className="rounded-3xl bg-gray-50 p-4">
                      <p className="font-semibold text-gray-900">
                        {post.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {post.location}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {post.description}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moderationMutation.mutate({
                              id: post._id,
                              action: "approve",
                            })
                          }
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            moderationMutation.mutate({
                              id: post._id,
                              action: "reject",
                            })
                          }
                          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {isLoading ? (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              ফিড লোড হচ্ছে...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              এখনো কোনো approved post নেই
            </div>
          ) : (
            posts.map((post) => (
              <FeedCard
                key={post._id}
                post={post}
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
      </section>
    </div>
  );
}
