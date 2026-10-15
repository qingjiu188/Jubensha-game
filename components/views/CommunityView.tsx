'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CornerDownRight,
  Heart,
  Lock,
  MessageSquare,
  Repeat2,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';
import {
  createPost,
  deletePost,
  fetchPosts,
  postComment,
  toggleFavorite,
  toggleLike,
  type CommentItem,
  type PostItem,
} from '@/lib/archive';

/* =========================================================
 * COMMUNITY：暗网加密终端
 * ---------------------------------------------------------
 * 严禁微博/贴吧观感 —— 全部包装成加密频道：
 * 代码块输入框、终端提示符、密文日志流、红色警告条
 * 数据绑定在 User（账号）层，角色死亡不清零
 * ========================================================= */

const TAG_PRESETS = ['求助', '剧透警告', '玄学', '实录', '寻人', '遗言'];

/** 标签 → 显示色 */
const TAG_COLOR: Record<string, string> = {
  求助: '#d4af37',
  剧透警告: '#8b0000',
  玄学: '#a855f7',
  实录: '#00ff9d',
  寻人: '#4a9eff',
  遗言: '#ff5a4a',
};

export default function CommunityView() {
  const go = useGame((s) => s.go);
  const account = useGame((s) => s.account);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [tag, setTag] = useState<string>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  /* ---------- 发帖 ---------- */
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  /* ---------- 评论 ---------- */
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [cmtTree, setCmtTree] = useState<Record<string, CommentItem[]>>({});
  const [cmtText, setCmtText] = useState('');
  const [replyTo, setReplyTo] = useState<{ postId: string; parentId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchPosts({ tag: tag || undefined, q: q || undefined });
    setPosts(list);
    setLoading(false);
  }, [tag, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => posts, [posts]);

  const submitPost = async () => {
    if (!title.trim() || !content.trim()) return;
    const p = await createPost({ title: title.trim(), content: content.trim(), tags });
    if (p) {
      setTitle('');
      setContent('');
      setTags([]);
      setComposing(false);
      await load();
    }
  };

  const like = async (id: string) => {
    // 乐观更新
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
          : p,
      ),
    );
    await toggleLike(id);
  };

  const fav = async (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, favorited: !p.favorited, favoriteCount: p.favoriteCount + (p.favorited ? -1 : 1) }
          : p,
      ),
    );
    await toggleFavorite(id);
  };

  const repost = async (p: PostItem) => {
    await createPost({ title: '', content: '', tags: [], repostOfId: p.id });
    await load();
  };

  const openCmt = async (id: string) => {
    if (openComments === id) {
      setOpenComments(null);
      return;
    }
    setOpenComments(id);
    setReplyTo(null);
    setCmtText('');
    if (cmtTree[id]) return;
    // 评论树走详情接口，不要走 postComment（那会真的插入一条评论）
    try {
      const res = await fetch(`/api/community/posts/${id}`, { cache: 'no-store' });
      const data = (await res.json()) as { comments?: CommentItem[] };
      setCmtTree((m) => ({ ...m, [id]: data.comments ?? [] }));
    } catch {
      setCmtTree((m) => ({ ...m, [id]: [] }));
    }
  };

  const submitComment = async (postId: string) => {
    const text = cmtText.trim();
    if (!text) return;
    const tree = await postComment({
      postId,
      content: text,
      parentId: replyTo?.parentId ?? null,
    });
    setCmtText('');
    setReplyTo(null);
    if (tree) setCmtTree((m) => ({ ...m, [postId]: tree }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
  };

  const remove = async (id: string) => {
    await deletePost(id);
    await load();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 px-5 py-6">
      {/* 头部：连接状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => go('LOBBY')}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] text-muted transition-colors hover:text-toxic"
          >
            <ArrowLeft size={13} />
            返回
          </button>
          <span className="text-[10px] tracking-[0.3em] text-muted">COMMUNITY / 暗网论坛</span>
        </div>
        <span className="inline-flex items-center gap-2 border border-toxic/40 px-2.5 py-1 text-[10px] tracking-[0.25em] text-toxic">
          <Lock size={11} />
          ENCRYPTED
        </span>
      </div>

      {/* 终端横幅 */}
      <div className="border border-toxic/25 bg-black/70 px-4 py-3 font-mono text-[11px] leading-relaxed">
        <p className="text-muted">
          <span className="text-toxic">survivor@instance</span>
          <span className="text-muted">:</span>
          <span className="text-amber">/var/forum</span>
          <span className="text-muted">$ </span>
          <span className="text-chalk">./connect --channel=0xF0RUM --tor</span>
        </p>
        <p className="mt-1 text-toxic/80">
          ✔ 握手完成 · 链路加密强度 AES-256 · 节点 {account ? `No.${account.playerNo}` : '匿名'} 已接入
        </p>
        <p className="mt-1 text-blood-bright/80">
          ⚠ 本频道不清除任何发言。你死过多少次，这里就记得多少次。
        </p>
      </div>

      {/* 工具条 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="grep 关键词……"
          className="min-w-[160px] flex-1 border border-hairline bg-black/60 px-3 py-2 font-mono text-xs tracking-[0.12em] text-toxic outline-none placeholder:text-muted/40 focus:border-toxic/50"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTag('')}
            className={`border px-2 py-1 text-[10px] tracking-[0.2em] transition-colors ${
              !tag ? 'border-toxic/60 text-toxic' : 'border-hairline text-muted hover:text-chalk'
            }`}
          >
            全部
          </button>
          {TAG_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t === tag ? '' : t)}
              className="border px-2 py-1 text-[10px] tracking-[0.2em] transition-colors"
              style={{
                borderColor: tag === t ? TAG_COLOR[t] : 'rgba(255,255,255,0.1)',
                color: tag === t ? TAG_COLOR[t] : '#888',
              }}
            >
              #{t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setComposing((v) => !v)}
          className="border border-toxic/50 px-3 py-2 text-[11px] tracking-[0.2em] text-toxic transition-colors hover:bg-toxic/10"
        >
          {composing ? '取消' : '+ 新建密文'}
        </button>
      </div>

      {/* 发帖区（代码块样式） */}
      {composing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden border border-toxic/25 bg-black/70"
        >
          <div className="border-b border-hairline px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-toxic/80">
            [ NEW MESSAGE ] — 明文输入，服务端加密
          </div>
          <div className="space-y-3 p-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题 / SUBJECT"
              className="w-full border border-hairline bg-black/60 px-3 py-2 font-mono text-sm tracking-[0.1em] text-chalk outline-none focus:border-toxic/50"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={'内容 / BODY\n> 支持多行。所有发言与你的账号绑定，不会因死亡清除。'}
              className="w-full resize-none border border-hairline bg-black/60 px-3 py-2 font-mono text-xs leading-relaxed tracking-[0.08em] text-chalk/90 outline-none focus:border-toxic/50"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] tracking-[0.2em] text-muted">TAGS:</span>
              {TAG_PRESETS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className="border px-2 py-0.5 text-[10px] tracking-[0.15em] transition-colors"
                    style={{
                      borderColor: on ? TAG_COLOR[t] : 'rgba(255,255,255,0.1)',
                      color: on ? TAG_COLOR[t] : '#888',
                    }}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <div className="w-40">
                <TerminalButton
                  onClick={() => void submitPost()}
                  disabled={!title.trim() || !content.trim()}
                  prefix="[↑]"
                >
                  发送
                </TerminalButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 帖子流 */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading && (
          <p className="py-10 text-center font-mono text-[11px] tracking-[0.3em] text-muted">
            正在解密数据流……
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <div className="panel scanlines px-5 py-10 text-center">
            <p className="font-mono text-[11px] tracking-[0.25em] text-muted">
              NO MATCH — 频道里还没有这样的密文。
            </p>
          </div>
        )}

        {filtered.map((p) => (
          <article
            key={p.id}
            className="panel scanlines relative border-l-2 px-4 py-3.5"
            style={{ borderLeftColor: p.tags.length ? TAG_COLOR[p.tags[0]] ?? '#333' : '#333' }}
          >
            {/* 转发来源 */}
            {p.repostOf && (
              <p className="mb-2 border border-hairline bg-black/40 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.1em] text-muted">
                ⟲ 转发自「{p.repostOf.title}」— {p.repostOf.author}
              </p>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
                  <span className="text-toxic">TRACE</span> :: No.{p.author.playerNo} ·{' '}
                  <span className="text-chalk/80">{p.author.username}</span>
                  <span className="ml-2 text-muted/60">{p.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </p>
                <h3 className="mt-1 font-serif text-lg tracking-[0.06em] text-chalk">
                  {p.title}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-chalk/75">
                  {p.content}
                </p>

                {p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em]"
                        style={{
                          borderColor: `${TAG_COLOR[t] ?? '#666'}66`,
                          color: TAG_COLOR[t] ?? '#999',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {account?.id === p.userId && (
                <button
                  onClick={() => void remove(p.id)}
                  className="shrink-0 p-1 text-muted transition-colors hover:text-blood-bright"
                  title="删除"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* 操作条 */}
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-hairline pt-2.5">
              <ActionBtn
                on={p.liked}
                activeColor="#ff5a4a"
                icon={<Heart size={13} />}
                label={String(p.likeCount)}
                onClick={() => void like(p.id)}
              />
              <ActionBtn
                on={p.favorited}
                activeColor="#d4af37"
                icon={<Star size={13} />}
                label={String(p.favoriteCount)}
                onClick={() => void fav(p.id)}
              />
              <ActionBtn
                icon={<Repeat2 size={13} />}
                label="转发"
                onClick={() => void repost(p)}
              />
              <ActionBtn
                icon={<MessageSquare size={13} />}
                label={String(p.commentCount)}
                onClick={() => void openCmt(p.id)}
              />
            </div>

            {/* 评论区（楼中楼） */}
            {openComments === p.id && (
              <div className="mt-3 border-t border-hairline pt-3">
                {replyTo?.postId === p.id && (
                  <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-amber">
                    回复 #{replyTo.parentId.slice(-4)} ·{' '}
                    <button
                      className="text-muted underline hover:text-chalk"
                      onClick={() => setReplyTo(null)}
                    >
                      取消
                    </button>
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    value={cmtText}
                    onChange={(e) => setCmtText(e.target.value)}
                    placeholder="写入回应……"
                    className="flex-1 border border-hairline bg-black/60 px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] text-chalk outline-none focus:border-toxic/50"
                  />
                  <button
                    onClick={() => void submitComment(p.id)}
                    className="border border-toxic/50 px-3 text-[11px] text-toxic transition-colors hover:bg-toxic/10"
                  >
                    <Send size={13} />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {(cmtTree[p.id] ?? []).map((c) => (
                    <CommentBranch
                      key={c.id}
                      c={c}
                      depth={0}
                      onReply={(parentId) => setReplyTo({ postId: p.id, parentId })}
                    />
                  ))}
                  {(cmtTree[p.id] ?? []).length === 0 && (
                    <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
                      —— 无回应 ——
                    </p>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 子组件 ---------------- */

function ActionBtn({
  icon,
  label,
  onClick,
  on,
  activeColor,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  on?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.15em] transition-colors"
      style={{ color: on ? activeColor : '#888' }}
    >
      {icon}
      {label}
    </button>
  );
}

function CommentBranch({
  c,
  depth,
  onReply,
}: {
  c: CommentItem;
  depth: number;
  onReply: (parentId: string) => void;
}) {
  return (
    <div style={{ marginLeft: depth * 14 }} className="border-l border-hairline pl-3">
      <p className="font-mono text-[10px] tracking-[0.15em] text-muted">
        <span className="text-toxic">No.{c.author.playerNo}</span> · {c.author.username}
        <span className="ml-2 text-muted/60">{c.createdAt.slice(11, 16)}</span>
      </p>
      <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-chalk/80">{c.content}</p>
      <button
        onClick={() => onReply(c.id)}
        className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] text-muted transition-colors hover:text-toxic"
      >
        <CornerDownRight size={11} />
        回复
      </button>

      {c.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {c.children.map((child) => (
            <CommentBranch key={child.id} c={child} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
