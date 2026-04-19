"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Ban,
  MessageCircleReply,
  MicOff,
  Send,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const formatTime = (value) =>
  new Date(value).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function CommunityChatPage({ role }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["community-chat", role],
    queryFn: () => request({ url: "/community-chat" }),
    refetchInterval: 5000,
  });

  const moderation = data?.moderation;
  const messages = data?.messages || [];
  const members = data?.members || [];

  useEffect(() => {
    if (role !== "tenant" || !moderation?.isBanned) return;
    toast.error("আপনি এই কমিউনিটি চ্যাটে ব্যান আছেন");
  }, [moderation?.isBanned, role]);

  const sendMutation = useMutation({
    mutationFn: (payload) => api.post("/community-chat/messages", payload),
    onSuccess: () => {
      setMessage("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["community-chat", role] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "বার্তা পাঠানো যায়নি"),
  });

  const moderationMutation = useMutation({
    mutationFn: ({ memberId, payload }) =>
      api.put(`/community-chat/members/${memberId}/moderation`, payload),
    onSuccess: () => {
      toast.success("সদস্য আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["community-chat", role] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });

  const composerHint = useMemo(() => {
    if (moderation?.isBanned) return "আপনি ব্যান আছেন, তাই নতুন বার্তা পাঠাতে পারবেন না";
    if (moderation?.isMuted) {
      return `আপনি মিউট আছেন ${formatTime(moderation.muteUntil)} পর্যন্ত`;
    }
    return "কমিউনিটিতে বার্তা লিখুন";
  }, [moderation]);

  const canSend = !moderation?.isBanned && !moderation?.isMuted;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-600 p-5 text-white shadow-[0_24px_80px_-28px_rgba(5,150,105,0.75)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-emerald-50/90 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Community Chat
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              একই বাড়িওয়ালার সবার জন্য এক কমিউনিটি
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
              সাধারণ বার্তা, রিপ্লাই, ছোটখাটো আলোচনা আর আপডেট এখন এক জায়গায়।
            </p>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-emerald-50/90 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">
              বর্তমান অবস্থা
            </p>
            <p className="mt-2 font-semibold">
              {moderation?.isBanned
                ? "ব্যান"
                : moderation?.isMuted
                  ? "মিউট"
                  : role === "landlord"
                    ? "ল্যান্ডলর্ড অ্যাডমিন"
                    : "সক্রিয় সদস্য"}
            </p>
          </div>
        </div>
      </section>

      <section
        className={`grid gap-5 ${
          role === "landlord" ? "lg:grid-cols-[1.3fr_0.7fr]" : ""
        }`}
      >
        <div className="space-y-4 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {replyTo && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {replyTo.author?.name} কে রিপ্লাই দিচ্ছেন
                    </p>
                    <p className="mt-1 line-clamp-2 text-emerald-800/80">
                      {replyTo.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-xs font-semibold text-emerald-700"
                  >
                    বাদ দিন
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={!canSend || sendMutation.isPending}
                placeholder={composerHint}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none ring-0 placeholder:text-gray-400"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  শুধু মেসেজ ও রিপ্লাই। ফাইল আপলোড এখনো চালু হয়নি।
                </p>
                <button
                  type="button"
                  disabled={!message.trim() || !canSend || sendMutation.isPending}
                  onClick={() =>
                    sendMutation.mutate({
                      body: message,
                      replyTo: replyTo?._id || null,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  <Send className="h-4 w-4" />
                  পাঠান
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                চ্যাট লোড হচ্ছে...
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                এখনো কোনো বার্তা নেই
              </div>
            ) : (
              messages.map((item) => {
                const isLandlord = item.author?.role === "landlord";
                return (
                  <article
                    key={item._id}
                    className={`rounded-3xl border p-4 ${
                      isLandlord
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.author?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isLandlord ? "ল্যান্ডলর্ড" : "ভাড়াটিয়া"} •{" "}
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTo(item)}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                      >
                        <MessageCircleReply className="h-3.5 w-3.5" />
                        রিপ্লাই
                      </button>
                    </div>

                    {item.replyTo && (
                      <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        <p className="font-semibold text-gray-700">
                          {item.replyTo.author?.name}
                        </p>
                        <p className="line-clamp-2">{item.replyTo.body}</p>
                      </div>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                      {item.body}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {role === "landlord" && (
          <aside className="space-y-3 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">সদস্য নিয়ন্ত্রণ</h2>
              <p className="mt-1 text-sm text-gray-500">
                ল্যান্ডলর্ড হিসেবে আপনি মিউট বা ব্যান করতে পারবেন।
              </p>
            </div>

            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                এখনো কোনো সদস্য পাওয়া যায়নি
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member._id}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-semibold text-gray-900">
                    {member.user?.name || member.tenant?.name || "ভাড়াটিয়া"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {member.user?.phone || member.user?.email || "যোগাযোগ তথ্য নেই"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gray-600">
                    {member.moderation?.isBanned
                      ? "ব্যান অবস্থায়"
                      : member.moderation?.isMuted
                        ? "মিউট অবস্থায়"
                        : "সক্রিয়"}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        moderationMutation.mutate({
                          memberId: member._id,
                          payload: { action: "mute", durationDays: 1 },
                        })
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-2xl bg-amber-100 px-3 py-2 text-amber-800"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                      ১ দিন মিউট
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moderationMutation.mutate({
                          memberId: member._id,
                          payload: { action: "unmute" },
                        })
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-2xl bg-emerald-100 px-3 py-2 text-emerald-800"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      আনমিউট
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moderationMutation.mutate({
                          memberId: member._id,
                          payload: { action: "ban", durationDays: 7 },
                        })
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-2xl bg-rose-100 px-3 py-2 text-rose-800"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      ৭ দিন ব্যান
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moderationMutation.mutate({
                          memberId: member._id,
                          payload: { action: "ban", forever: true },
                        })
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-2xl bg-gray-900 px-3 py-2 text-white"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      স্থায়ী ব্যান
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moderationMutation.mutate({
                          memberId: member._id,
                          payload: { action: "unban" },
                        })
                      }
                      className="col-span-2 inline-flex items-center justify-center rounded-2xl border border-gray-300 px-3 py-2 text-gray-700"
                    >
                      ব্যান উঠান
                    </button>
                  </div>
                </div>
              ))
            )}
          </aside>
        )}
      </section>
    </div>
  );
}
