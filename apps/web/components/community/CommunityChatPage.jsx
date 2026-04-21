"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Building2,
  Mic,
  MicOff,
  MoreVertical,
  Reply,
  Send,
  ShieldOff,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";
import { getSocket } from "@/lib/socket";

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatMuteUntil = (value) =>
  new Date(value).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-green-200",
  "bg-orange-200",
  "bg-sky-200",
  "bg-amber-200",
  "bg-purple-200",
  "bg-yellow-200",
  "bg-emerald-200",
  "bg-rose-200",
];

const avatarColor = (name = "") =>
  AVATAR_COLORS[
    [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      AVATAR_COLORS.length
  ];

const mergeMessage = (messages = [], incoming) => {
  if (!incoming?._id) return messages;
  if (messages.some((item) => item._id === incoming._id)) return messages;

  return [...messages, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const updateGroupPreview = (groups = [], landlordId, createdAt, increment = true) =>
  groups.map((group) =>
    group.landlordId === String(landlordId)
      ? {
          ...group,
          messageCount: increment ? (group.messageCount || 0) + 1 : group.messageCount || 0,
          lastMessageAt: createdAt || group.lastMessageAt || new Date().toISOString(),
        }
      : group,
  );

function MemberCard({
  member,
  name,
  contact,
  isBanned,
  isMuted,
  moderationMutation,
  landlordId,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const mutate = (payload) => {
    moderationMutation.mutate({ memberId: member._id, payload, landlordId });
    setMenuOpen(false);
  };

  const menuItems = isBanned
    ? [
        {
          label: "ব্যান উঠান",
          icon: <ShieldOff size={13} />,
          className: "text-emerald-700 hover:bg-emerald-50",
          action: () => mutate({ action: "unban" }),
        },
      ]
    : isMuted
      ? [
          {
            label: "আনমিউট করুন",
            icon: <Mic size={13} />,
            className: "text-emerald-700 hover:bg-emerald-50",
            action: () => mutate({ action: "unmute" }),
          },
          {
            label: "৭ দিন ব্যান",
            icon: <Ban size={13} />,
            className: "text-red-600 hover:bg-red-50",
            action: () => mutate({ action: "ban", durationDays: 7 }),
          },
          {
            label: "স্থায়ী ব্যান",
            icon: <Ban size={13} />,
            className: "font-semibold text-red-700 hover:bg-red-50",
            action: () => mutate({ action: "ban", forever: true }),
          },
        ]
      : [
          {
            label: "১ দিন মিউট",
            icon: <MicOff size={13} />,
            className: "text-yellow-700 hover:bg-yellow-50",
            action: () => mutate({ action: "mute", durationDays: 1 }),
          },
          {
            label: "স্থায়ী মিউট",
            icon: <MicOff size={13} />,
            className: "text-yellow-800 hover:bg-yellow-50",
            action: () => mutate({ action: "mute", forever: true }),
          },
          {
            label: "৭ দিন ব্যান",
            icon: <Ban size={13} />,
            className: "text-red-600 hover:bg-red-50",
            action: () => mutate({ action: "ban", durationDays: 7 }),
          },
          {
            label: "স্থায়ী ব্যান",
            icon: <Ban size={13} />,
            className: "font-semibold text-red-700 hover:bg-red-50",
            action: () => mutate({ action: "ban", forever: true }),
          },
        ];

  return (
    <div className="mb-2 rounded-xl bg-white p-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#202c33] ${avatarColor(name)}`}
        >
          {getInitials(name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#111b21]">{name}</p>
          {contact && <p className="truncate text-[11px] text-[#667781]">{contact}</p>}
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isBanned
                ? "bg-red-100 text-red-700"
                : isMuted
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {isBanned ? "ব্যান" : isMuted ? "মিউট" : "সক্রিয়"}
          </span>
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#667781] transition-colors hover:bg-[#f0f2f5] hover:text-[#111b21]"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 min-w-[160px] overflow-hidden rounded-xl border border-[#e9edef] bg-white shadow-lg">
              {menuItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.action}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors ${item.className}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupList({ groups, selectedLandlordId, onSelect }) {
  if (!groups.length) {
    return <p className="py-8 text-center text-sm text-[#667781]">কোনো গ্রুপ নেই</p>;
  }

  return groups.map((group) => {
    const active = selectedLandlordId === group.landlordId;
    return (
      <button
        key={group.landlordId}
        type="button"
        onClick={() => onSelect(group.landlordId)}
        className={`mb-2 w-full cursor-pointer rounded-2xl border px-3 py-3 text-left transition ${
          active
            ? "border-[#00a884] bg-[#d9fdd3]"
            : "border-transparent bg-white hover:border-[#c8d6db]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#111b21]">
              {group.propertyName}
            </p>
            <p className="truncate text-[11px] text-[#667781]">{group.landlordName}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              group.communityChatEnabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {group.communityChatEnabled ? "চ্যাট অন" : "চ্যাট অফ"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#667781]">
          <span>{group.memberCount} সদস্য</span>
          <span>{group.messageCount} বার্তা</span>
        </div>
      </button>
    );
  });
}

export function CommunityChatPage({ role }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [mobileView, setMobileView] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedLandlordId, setSelectedLandlordId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const chatQueryKey = useMemo(
    () => ["community-chat", role, selectedLandlordId],
    [role, selectedLandlordId],
  );

  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => request({ url: "/auth/me" }),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["community-chat", "groups"],
    queryFn: () => request({ url: "/community-chat/groups" }),
    enabled: role === "admin",
  });

  useEffect(() => {
    if (role !== "admin" || selectedLandlordId || !groups.length) return;
    setSelectedLandlordId(groups[0].landlordId);
  }, [groups, role, selectedLandlordId]);

  const communityUrl =
    role === "admin"
      ? selectedLandlordId
        ? `/community-chat?landlordId=${selectedLandlordId}`
        : null
      : "/community-chat";

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: chatQueryKey,
    queryFn: () => request({ url: communityUrl }),
    enabled: Boolean(communityUrl),
  });

  const moderation = data?.moderation;
  const messages = data?.messages || [];
  const members = data?.members || [];
  const groupInfo = data?.groupInfo;
  const hasManagement = role === "landlord" || role === "admin";
  const communityError = error?.response?.data?.message;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (role !== "tenant" || !moderation?.isBanned) return;
    toast.error("আপনি এই কমিউনিটি চ্যাটে ব্যান আছেন");
  }, [moderation?.isBanned, role]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !communityUrl || communityError) return;

    const landlordId = selectedLandlordId || data?.landlordId || groupInfo?.landlordId;
    if (!landlordId) return;

    const joinRoom = () => {
      socket.emit("community:join", { landlordId });
    };

    joinRoom();

    const onMessage = ({ landlordId: eventLandlordId, message: incomingMessage }) => {
      if (String(eventLandlordId) !== String(landlordId)) return;

      queryClient.setQueryData(chatQueryKey, (current) =>
        current
          ? {
              ...current,
              messages: mergeMessage(current.messages, incomingMessage),
            }
          : current,
      );

      queryClient.setQueryData(["community-chat", "groups"], (current = []) =>
        updateGroupPreview(
          current,
          eventLandlordId,
          incomingMessage?.createdAt,
          !messagesRef.current.some((item) => item._id === incomingMessage?._id),
        ),
      );
    };

    const onModeration = ({ landlordId: eventLandlordId }) => {
      if (String(eventLandlordId) !== String(landlordId)) return;
      queryClient.invalidateQueries({ queryKey: chatQueryKey });
    };

    socket.on("connect", joinRoom);
    socket.on("community:message", onMessage);
    socket.on("community:member-moderated", onModeration);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("community:message", onMessage);
      socket.off("community:member-moderated", onModeration);
      socket.emit("community:leave");
    };
  }, [
    chatQueryKey,
    communityError,
    communityUrl,
    data?.landlordId,
    groupInfo?.landlordId,
    queryClient,
    selectedLandlordId,
  ]);

  const sendMutation = useMutation({
    mutationFn: (payload) => api.post("/community-chat/messages", payload),
    onSuccess: (res) => {
      setMessage("");
      setReplyTo(null);
      const created = res.data?.data;
      queryClient.setQueryData(chatQueryKey, (current) =>
        current
          ? {
              ...current,
              messages: mergeMessage(current.messages, created),
            }
          : current,
      );
      queryClient.setQueryData(["community-chat", "groups"], (current = []) =>
        updateGroupPreview(
          current,
          selectedLandlordId,
          created?.createdAt,
          !messagesRef.current.some((msg) => msg._id === created?._id),
        ),
      );
    },
    onError: (err) => toast.error(err.response?.data?.message || "বার্তা পাঠানো যায়নি"),
  });

  const moderationMutation = useMutation({
    mutationFn: ({ memberId, payload, landlordId }) =>
      api.put(
        `/community-chat/members/${memberId}/moderation`,
        landlordId ? { ...payload, landlordId } : payload,
      ),
    onSuccess: () => {
      toast.success("সদস্য আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: chatQueryKey });
    },
    onError: (err) => toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });

  const composerHint = useMemo(() => {
    if (role === "admin" && !selectedLandlordId) return "আগে একটি গ্রুপ নির্বাচন করুন";
    if (moderation?.isBanned) return "আপনি ব্যান আছেন, তাই নতুন বার্তা পাঠাতে পারবেন না";
    if (moderation?.isMuted) return `আপনি মিউট আছেন ${formatMuteUntil(moderation.muteUntil)} পর্যন্ত`;
    return "একটি বার্তা লিখুন";
  }, [moderation, role, selectedLandlordId]);

  const canSend =
    Boolean(communityUrl) &&
    !moderation?.isBanned &&
    !moderation?.isMuted &&
    !(role === "admin" && !selectedLandlordId);

  const handleSend = () => {
    if (!message.trim() || !canSend || sendMutation.isPending) return;
    sendMutation.mutate({
      body: message,
      replyTo: replyTo?._id || null,
      ...(selectedLandlordId ? { landlordId: selectedLandlordId } : {}),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const myStatusLabel = moderation?.isBanned
    ? "ব্যান"
    : moderation?.isMuted
      ? "মিউট"
      : role === "admin"
        ? "সুপার অ্যাডমিন"
        : role === "landlord"
          ? "অ্যাডমিন"
          : "সক্রিয়";

  const myStatusClass = moderation?.isBanned
    ? "bg-red-100 text-red-700"
    : moderation?.isMuted
      ? "bg-yellow-100 text-yellow-700"
      : role === "admin"
        ? "bg-purple-100 text-purple-700"
        : role === "landlord"
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700";

  const MembersPanel = () => (
    <>
      {members.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#667781]">কোনো সদস্য নেই</p>
      ) : (
        members.map((member) => {
          const name = member.user?.name || member.tenant?.name || "ভাড়াটিয়া";
          const contact = member.user?.phone || member.user?.email || "";
          const { isBanned, isMuted } = member.moderation || {};
          return (
            <MemberCard
              key={member._id}
              member={member}
              name={name}
              contact={contact}
              isBanned={isBanned}
              isMuted={isMuted}
              moderationMutation={moderationMutation}
              landlordId={selectedLandlordId}
            />
          );
        })
      )}
    </>
  );

  if (mobileView === "groups" && role === "admin") {
    return (
      <div className="flex h-[calc(100svh-80px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#e9edef] md:hidden">
        <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3.5 text-[#e9edef]">
          <Building2 size={16} />
          <span className="text-sm font-semibold">চ্যাট গ্রুপস</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-2">
          <GroupList
            groups={groups}
            selectedLandlordId={selectedLandlordId}
            onSelect={(landlordId) => {
              setSelectedLandlordId(landlordId);
              setMobileView("chat");
            }}
          />
        </div>
      </div>
    );
  }

  if (mobileView === "members" && hasManagement) {
    return (
      <div className="flex h-[calc(100svh-80px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#e9edef] md:hidden">
        <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3.5 text-[#e9edef]">
          <button
            type="button"
            onClick={() => setMobileView("chat")}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-white/10 hover:text-[#e9edef]"
          >
            <ArrowLeft size={18} />
          </button>
          <Users size={16} />
          <span className="text-sm font-semibold">সদস্য নিয়ন্ত্রণ</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-2">
          <MembersPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-80px)] min-h-[500px] overflow-hidden rounded-2xl border border-[#e9edef] font-sans">
      {role === "admin" && (
        <aside className="hidden w-80 flex-col border-r border-[#e9edef] bg-white md:flex">
          <div className="flex items-center gap-2 bg-[#202c33] px-4 py-5 text-sm font-semibold text-[#e9edef]">
            <Building2 size={16} />
            <span>চ্যাট গ্রুপস</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-2">
            <GroupList
              groups={groups}
              selectedLandlordId={selectedLandlordId}
              onSelect={setSelectedLandlordId}
            />
          </div>
        </aside>
      )}

      {hasManagement && (
        <aside
          className={`hidden flex-col overflow-hidden border-r border-[#e9edef] bg-white transition-all duration-300 md:flex ${
            sidebarOpen ? "w-72" : "w-0 border-r-0"
          }`}
        >
          <div className="flex items-center gap-2 bg-[#202c33] px-4 py-5 text-sm font-semibold text-[#e9edef]">
            <Users size={16} />
            <span>সদস্য নিয়ন্ত্রণ</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-2">
            <MembersPanel />
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden bg-[#efeae2]">
        <div className="flex items-center gap-3 bg-[#202c33] px-3 py-2.5 md:px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#25d366] text-lg md:h-10 md:w-10 md:text-xl">
            🏠
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight text-[#e9edef] md:text-[15px]">
              {groupInfo?.propertyName || "কমিউনিটি চ্যাট"}
            </p>
            <p className="truncate text-[11px] text-[#8696a0] md:text-xs">
              {groupInfo?.landlordName || communityError || "গ্রুপ নির্বাচন করুন"}
            </p>
          </div>

          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold md:text-[11px] ${myStatusClass}`}>
            {myStatusLabel}
          </span>

          {role === "admin" && (
            <button
              type="button"
              onClick={() => setMobileView("groups")}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-white/10 hover:text-[#e9edef] md:hidden"
            >
              <Building2 size={18} />
            </button>
          )}

          {hasManagement && (
            <>
              <button
                type="button"
                onClick={() => setMobileView("members")}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-white/10 hover:text-[#e9edef] md:hidden"
              >
                <Users size={18} />
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen((p) => !p)}
                className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-white/10 hover:text-[#e9edef] md:flex"
              >
                <Users size={18} />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-3 py-3 md:px-4">
          <div className="my-2 flex justify-center">
            <span className="rounded-lg bg-white px-3 py-1 text-[11px] text-[#667781] shadow-sm md:text-[11.5px]">
              আজ
            </span>
          </div>

          {!communityUrl ? (
            <p className="py-10 text-center text-sm text-[#667781]">
              আগে একটি গ্রুপ নির্বাচন করুন
            </p>
          ) : isLoading ? (
            <p className="py-10 text-center text-sm text-[#667781]">চ্যাট লোড হচ্ছে…</p>
          ) : communityError ? (
            <div className="mx-auto max-w-md rounded-2xl bg-white px-5 py-6 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#00a884]" />
              <p className="mt-3 text-sm font-semibold text-[#111b21]">{communityError}</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#667781]">এখনো কোনো বার্তা নেই</p>
          ) : (
            messages.map((msg) => {
              const isOutgoing = String(msg.author?._id || "") === String(me?.user?._id || "");
              const name = msg.author?.name || "অজানা";
              const authorTone =
                msg.author?.role === "landlord"
                  ? "text-blue-600"
                  : msg.author?.role === "admin"
                    ? "text-purple-600"
                    : "text-[#00a884]";

              return (
                <div
                  key={msg._id}
                  className={`group mb-1 flex items-end gap-1 md:gap-1.5 ${
                    isOutgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isOutgoing && (
                    <div
                      className={`mb-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[#202c33] md:h-7 md:w-7 md:text-[10px] ${avatarColor(name)}`}
                    >
                      {getInitials(name)}
                    </div>
                  )}

                  <div
                    className={`flex max-w-[85%] items-end gap-1 md:max-w-[72%] ${
                      isOutgoing ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`relative min-w-[72px] rounded-lg px-2.5 py-1.5 shadow-sm ${
                        isOutgoing
                          ? "rounded-tr-none bg-[#d9fdd3]"
                          : "rounded-tl-none bg-white"
                      }`}
                    >
                      {!isOutgoing && (
                        <p className={`mb-0.5 text-[11px] font-semibold leading-tight md:text-xs ${authorTone}`}>
                          {name}
                        </p>
                      )}

                      {msg.replyTo && (
                        <div className="mb-1.5 rounded border-l-[3px] border-[#00a884] bg-black/5 px-2 py-1">
                          <p className="text-[10px] font-semibold text-[#00a884] md:text-[11px]">
                            {msg.replyTo.author?.name}
                          </p>
                          <p className="line-clamp-1 text-[10px] text-[#667781] md:text-[11px]">
                            {msg.replyTo.body}
                          </p>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#111b21] md:text-sm">
                        {msg.body}
                      </p>

                      <div className="mt-0.5 flex items-center justify-end gap-1">
                        <span className="text-[10px] text-[#667781] md:text-[11px]">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isOutgoing && (
                          <span className="text-[11px] tracking-tighter text-[#53bdeb]">✓✓</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReply(msg)}
                      className="mb-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[#667781] shadow-md transition-all hover:text-[#00a884] opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Reply size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {replyTo && (
          <div className="flex flex-shrink-0 items-center gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-3 py-2 md:gap-3 md:px-4">
            <Reply size={13} className="flex-shrink-0 text-[#00a884]" />
            <div className="min-w-0 flex-1 border-l-[3px] border-[#00a884] pl-2">
              <p className="text-[11px] font-semibold text-[#00a884] md:text-xs">
                {replyTo.author?.name} কে রিপ্লাই
              </p>
              <p className="truncate text-[11px] text-[#667781] md:text-xs">{replyTo.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#667781] transition-colors hover:bg-[#e9edef] hover:text-[#111b21]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-shrink-0 items-center gap-2 bg-[#f0f2f5] px-2 py-2 md:px-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={composerHint}
            disabled={!canSend || sendMutation.isPending || Boolean(communityError)}
            className="min-h-[40px] max-h-[100px] flex-1 resize-none overflow-y-auto rounded-3xl border-none bg-white px-3 py-2 text-[13px] text-[#111b21] outline-none placeholder:text-[#8696a0] disabled:cursor-not-allowed disabled:bg-[#e9edef] disabled:text-[#8696a0] md:min-h-[42px] md:max-h-[120px] md:px-4 md:py-2.5 md:text-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || !canSend || sendMutation.isPending || Boolean(communityError)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#00a884] text-white transition-all hover:bg-[#008069] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#c8c8c8] md:h-[46px] md:w-[46px]"
          >
            <Send size={18} className="md:hidden" />
            <Send size={20} className="hidden md:block" />
          </button>
        </div>
      </div>
    </div>
  );
}
