'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useGame } from '@/store/gameStore';
import { maskKey } from '@/lib/aiConfig';
import type { PlayerAIConfig } from '@/types';

/**
 * 接入设置：玩家自带 AI 密钥。
 * 密钥只写进浏览器 localStorage，随剧情请求走后端代理，服务端用完即弃、不落库。
 */
export default function SettingsView() {
  const go = useGame((s) => s.go);
  const ai = useGame((s) => s.ai);
  const setAI = useGame((s) => s.setAI);

  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (ai) {
      setApiKey(ai.apiKey);
      setEndpoint(ai.endpoint ?? '');
      setModel(ai.model ?? '');
    }
  }, [ai]);

  const toast = (msg: string) => {
    setSaved(msg);
    window.setTimeout(() => setSaved(null), 2200);
  };

  const onSave = () => {
    const key = apiKey.trim();
    if (!key) {
      toast('密钥不能为空。留空请先点「清除」。');
      return;
    }
    const cfg: PlayerAIConfig = {
      apiKey: key,
      endpoint: endpoint.trim() || undefined,
      model: model.trim() || undefined,
    };
    setAI(cfg);
    toast(`已启用自带密钥 ${maskKey(key)}`);
  };

  const onClear = () => {
    setAI(null);
    setApiKey('');
    setEndpoint('');
    setModel('');
    toast('已清除。之后将使用服务端预设的剧情引擎。');
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-4">
          <button
            onClick={() => go('LOBBY')}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] text-muted transition-colors hover:text-toxic"
          >
            <ArrowLeft size={12} />
            返回终端
          </button>
          <h2 className="font-serif text-2xl tracking-[0.3em] text-chalk">接 入</h2>
        </div>
        <span className="text-[10px] tracking-[0.3em] text-muted">SETTINGS / AI</span>
      </div>

      {/* 当前状态 */}
      <div
        className={`panel flex items-center gap-3 px-5 py-4 ${
          ai ? 'border-toxic/50' : 'border-hairline'
        }`}
      >
        {ai ? (
          <ShieldCheck size={16} className="shrink-0 text-toxic" />
        ) : (
          <Cpu size={16} className="shrink-0 text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.25em] text-chalk">
            {ai ? '已接入自带模型' : '当前使用服务端预设引擎'}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-muted">
            {ai ? `${maskKey(ai.apiKey)} · ${ai.model ?? '默认模型'}` : '未配置密钥'}
          </p>
        </div>
        {ai && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-blood/70 hover:text-blood-bright"
          >
            <Trash2 size={11} />
            清除
          </button>
        )}
      </div>

      {/* 表单 */}
      <div className="panel space-y-4 p-5">
        <p className="text-[10px] tracking-[0.3em] text-toxic/70">AI ACCESS / 自带密钥</p>

        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] text-chalk/80">
            <KeyRound size={12} className="text-amber/80" />
            API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="w-full border border-hairline bg-black/40 px-3 py-2 font-mono text-xs text-chalk outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.2em] text-chalk/80">
              Endpoint（可选）
            </span>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-hairline bg-black/40 px-3 py-2 font-mono text-[11px] text-chalk outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.2em] text-chalk/80">
              模型（可选）
            </span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-hairline bg-black/40 px-3 py-2 font-mono text-[11px] text-chalk outline-none transition-colors placeholder:text-muted/40 focus:border-toxic/60"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSave}
            className="border border-toxic/60 px-3 py-2.5 text-[11px] tracking-[0.25em] text-toxic transition-colors hover:bg-toxic/10"
          >
            保存并启用
          </button>
          <button
            onClick={onClear}
            className="border border-hairline px-3 py-2.5 text-[11px] tracking-[0.25em] text-muted transition-colors hover:border-blood/70 hover:text-blood-bright"
          >
            清除密钥
          </button>
        </div>
      </div>

      {/* 说明 */}
      <div className="panel space-y-2 p-5">
        <p className="text-[10px] tracking-[0.3em] text-toxic/70">NOTICE</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed tracking-[0.08em] text-muted">
          <li>· 密钥只保存在你这台设备的浏览器里，不会上传到服务器，也不会写进数据库。</li>
          <li>· 它会在每次剧情请求时随请求发给后端，后端仅用于当次转发，用完即弃。</li>
          <li>· 未配置密钥时，游戏自动使用服务端预设的剧情引擎，功能不受影响。</li>
          <li>· 密钥失效或额度耗尽时，本回合会自动降级为预设走向，不会卡死。</li>
          <li>· 更换设备或清理浏览器数据需要重新填写。</li>
        </ul>
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 border border-toxic/50 bg-black/85 px-5 py-2.5 text-[11px] tracking-[0.2em] text-toxic"
        >
          {saved}
        </motion.div>
      )}
    </div>
  );
}
