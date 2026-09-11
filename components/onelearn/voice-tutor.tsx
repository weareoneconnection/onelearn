"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Mic, MicOff, PhoneOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { track } from "@/lib/onelearn/analytics";
import { oneLearnFetch } from "./client";

type Phase = "connecting" | "live" | "ended" | "error";
type Caption = { id: string; role: "you" | "tutor"; text: string };
type RealtimeEvent = { type?: string; item_id?: string; response_id?: string; delta?: string; transcript?: string; error?: { message?: string } };

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

/**
 * Live voice conversation with the tutor over WebRTC, straight to OpenAI Realtime with an
 * ephemeral key from /api/voice/session. The server reserves time up front and settles on end.
 */
export function VoiceTutor({ locale, courseVersionId, lessonId, onClose }: { locale: Locale; courseVersionId: string; lessonId: string; onClose: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [speaking, setSpeaking] = useState<"you" | "tutor" | null>(null);
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState<{ used: number; remaining: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ring = useRef<SVGSVGElement>(null);
  const live = useRef<{ pc?: RTCPeerConnection; dc?: RTCDataChannel; mic?: MediaStream; audio?: HTMLAudioElement; context?: AudioContext; frame?: number; timer?: number; sessionId?: string; stopped?: boolean }>({});

  useEffect(() => {
    const state: typeof live.current = {};
    live.current = state;
    const fail = (message: string) => { if (!state.stopped) { setError(message); setPhase("error"); } };

    const stop = async (reason: "user" | "time" | "error") => {
      if (state.stopped) return;
      state.stopped = true;
      if (state.timer) window.clearInterval(state.timer);
      if (state.frame) cancelAnimationFrame(state.frame);
      state.dc?.close();
      state.pc?.close();
      state.mic?.getTracks().forEach((trackItem) => trackItem.stop());
      if (state.audio) state.audio.srcObject = null;
      void state.context?.close();
      if (!state.sessionId) return;
      const response = await oneLearnFetch("/api/voice/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, sessionId: state.sessionId }), keepalive: true }).catch(() => null);
      const payload = response?.ok ? await response.json() as { usedSeconds?: number; remainingSeconds?: number } : null;
      if (reason !== "error") {
        setSummary({ used: payload?.usedSeconds ?? 0, remaining: payload?.remainingSeconds ?? 0 });
        setPhase("ended");
      }
      track("voice_session_ended", { reason, seconds: payload?.usedSeconds ?? null });
    };
    Object.assign(state, { stopSession: stop });

    const onEvent = (event: RealtimeEvent) => {
      switch (event.type) {
        case "input_audio_buffer.speech_started": setSpeaking("you"); break;
        case "input_audio_buffer.speech_stopped": setSpeaking(null); break;
        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript?.trim()) setCaptions((items) => [...items, { id: `you-${event.item_id ?? items.length}`, role: "you" as const, text: event.transcript!.trim() }].slice(-8));
          break;
        case "response.output_audio_transcript.delta": {
          const id = `tutor-${event.response_id ?? event.item_id ?? "current"}`;
          setSpeaking("tutor");
          setCaptions((items) => {
            const last = items[items.length - 1];
            if (last?.id === id) return [...items.slice(0, -1), { ...last, text: last.text + (event.delta ?? "") }];
            return [...items, { id, role: "tutor" as const, text: event.delta ?? "" }].slice(-8);
          });
          break;
        }
        case "response.done": setSpeaking(null); break;
        case "error": console.error("Realtime error:", event.error?.message); break;
      }
    };

    // Scale the orbit ring with the loudest of the two audio streams.
    const watchLevels = (streams: MediaStream[]) => {
      const context = new AudioContext();
      state.context = context;
      const analysers = streams.map((stream) => {
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        return analyser;
      });
      const buffer = new Uint8Array(512);
      const tick = () => {
        let peak = 0;
        for (const analyser of analysers) {
          analyser.getByteTimeDomainData(buffer);
          for (const value of buffer) peak = Math.max(peak, Math.abs(value - 128) / 128);
        }
        if (ring.current) ring.current.style.transform = `scale(${1 + Math.min(0.35, peak * 0.9)})`;
        state.frame = requestAnimationFrame(tick);
      };
      tick();
    };

    (async () => {
      const sessionResponse = await oneLearnFetch("/api/voice/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, courseVersionId, lessonId }) }).catch(() => null);
      const session = sessionResponse ? await sessionResponse.json().catch(() => ({})) as { clientSecret?: string; sessionId?: string; maxSeconds?: number; error?: string } : {};
      if (!sessionResponse?.ok || !session.clientSecret || !session.sessionId) return fail(session.error || l("语音服务暂时不可用，请改用文字导师", "The voice service is unavailable. Please use the text tutor"));
      state.sessionId = session.sessionId;
      if (state.stopped) return void stop("user");

      try {
        state.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        await stop("error");
        return fail(l("没有麦克风权限。请在浏览器地址栏允许使用麦克风后重试。", "Microphone access was blocked. Allow it in the browser address bar and retry."));
      }

      try {
        const pc = new RTCPeerConnection();
        state.pc = pc;
        const audio = document.createElement("audio");
        audio.autoplay = true;
        state.audio = audio;
        pc.ontrack = (event) => { audio.srcObject = event.streams[0]; watchLevels([event.streams[0], state.mic!]); };
        pc.addTrack(state.mic.getTracks()[0], state.mic);
        const dc = pc.createDataChannel("oai-events");
        state.dc = dc;
        dc.addEventListener("open", () => dc.send(JSON.stringify({ type: "response.create" })));
        dc.addEventListener("message", (message) => { try { onEvent(JSON.parse(message.data) as RealtimeEvent); } catch { /* ignore malformed events */ } });
        pc.addEventListener("connectionstatechange", () => { if (pc.connectionState === "failed") { void stop("error"); fail(l("语音连接中断了，请重试。", "The voice connection dropped. Please retry.")); } });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const answer = await fetch(REALTIME_CALLS_URL, {
          method: "POST",
          body: offer.sdp,
          headers: { Authorization: `Bearer ${session.clientSecret}`, "Content-Type": "application/sdp" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!answer.ok) throw new Error(`realtime_${answer.status}`);
        await pc.setRemoteDescription({ type: "answer", sdp: await answer.text() });
      } catch {
        await stop("error");
        return fail(l("无法连接语音服务。所在网络可能无法访问 OpenAI（例如中国大陆网络），请改用文字导师。", "Couldn't reach the voice service. Your network may block OpenAI — please use the text tutor."));
      }

      if (state.stopped) return;
      const deadline = Date.now() + (session.maxSeconds ?? 0) * 1000;
      setSecondsLeft(session.maxSeconds ?? 0);
      state.timer = window.setInterval(() => {
        const left = Math.round((deadline - Date.now()) / 1000);
        setSecondsLeft(Math.max(0, left));
        if (left <= 0) void stop("time");
      }, 1000);
      setPhase("live");
      track("voice_session_started");
    })();

    return () => { void stop("user"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one session per attempt
  }, [attempt, courseVersionId, lessonId, locale]);

  const end = () => { void (live.current as { stopSession?: (reason: "user") => Promise<void> }).stopSession?.("user"); };
  const toggleMute = () => {
    const next = !muted;
    live.current.mic?.getAudioTracks().forEach((trackItem) => { trackItem.enabled = !next; });
    setMuted(next);
  };
  const retry = () => { setError(""); setCaptions([]); setSummary(null); setSpeaking(null); setMuted(false); setPhase("connecting"); setAttempt((value) => value + 1); };

  const status = phase === "connecting" ? l("正在连接语音导师…", "Connecting to your voice tutor…")
    : phase === "live" ? (muted ? l("已静音", "Muted") : speaking === "tutor" ? l("Sora 正在说话", "Sora is speaking") : speaking === "you" ? l("正在听你说…", "Listening…") : l("直接说话就可以", "Just start talking"))
    : phase === "ended" ? l("通话已结束", "Call ended") : l("语音导师不可用", "Voice tutor unavailable");

  // Portaled to <body> so transformed/animated ancestors can't turn `fixed` into page-relative.
  // Phones: full-screen call screen above the tab bar (safe-area aware). Desktop: a docked right-hand call panel.
  return createPortal(<div role="dialog" aria-modal="true" aria-label={l("语音对话", "Voice call")} className="fixed inset-0 z-50 flex flex-col bg-[#0a1320] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:left-auto md:w-[420px] md:border-l md:border-white/10 md:shadow-2xl">
    <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
      <div><h2 className="text-sm font-medium text-white">{l("语音对话 · Sora", "Voice · Sora")}</h2><p className="text-xs text-slate-500">{phase === "live" ? l(`本次剩余 ${formatClock(secondsLeft)}`, `${formatClock(secondsLeft)} left in this call`) : status}</p></div>
      <Button variant="ghost" size="icon-sm" aria-label={l("关闭语音对话", "Close voice call")} onClick={() => { end(); onClose(); }} className="size-10 text-slate-400 hover:bg-white/5 hover:text-white md:size-8"><X /></Button>
    </div>
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 px-5 pt-10 pb-4 md:pt-8">
      <svg ref={ring} viewBox="0 0 64 64" className={cn("size-36 flex-none transition-transform duration-75", phase === "connecting" && "animate-pulse")} aria-hidden="true">
        <circle cx="32" cy="32" r="17.5" fill="none" stroke={speaking === "tutor" ? "#67E8F9" : "#2a6f7e"} strokeWidth="3.5" />
        <circle cx="32" cy="32" r="4" fill="#0891B2" />
        <circle cx="44.4" cy="19.6" r="4.5" fill={speaking === "you" ? "#6EE7B7" : "#67E8F9"} />
      </svg>
      <p className="text-sm text-slate-300" role="status">{status}</p>
      {phase === "error" && <p className="max-w-xs text-center text-xs leading-5 text-rose-300">{error}</p>}
      {phase === "ended" && summary && <p className="text-center text-xs text-slate-400">{l(`本次通话 ${formatClock(summary.used)}，本月还剩 ${Math.floor(summary.remaining / 60)} 分钟语音时长`, `Call length ${formatClock(summary.used)} · ${Math.floor(summary.remaining / 60)} voice minutes left this month`)}</p>}
      {captions.length > 0 && <div className="min-h-0 w-full max-w-md flex-1 space-y-2 overflow-y-auto overscroll-contain" aria-live="polite">
        {captions.map((caption) => <p key={caption.id} className={cn("rounded-xl px-3 py-2 text-sm leading-6", caption.role === "you" ? "ml-8 bg-cyan-300/10 text-cyan-50" : "mr-8 bg-white/[0.04] text-slate-200")}>{caption.text}</p>)}
      </div>}
    </div>
    <div className="flex items-center justify-center gap-3 border-t border-white/7 p-4">
      {phase === "live" && <>
        <Button onClick={toggleMute} variant="outline" className="secondary-pill" aria-pressed={muted}>{muted ? <MicOff /> : <Mic />}{muted ? l("取消静音", "Unmute") : l("静音", "Mute")}</Button>
        <Button onClick={end} className="rounded-full bg-rose-500 text-white hover:bg-rose-400"><PhoneOff />{l("结束通话", "End call")}</Button>
      </>}
      {phase === "connecting" && <Button onClick={() => { end(); onClose(); }} variant="ghost" className="text-slate-400"><LoaderCircle className="animate-spin" />{l("取消", "Cancel")}</Button>}
      {(phase === "ended" || phase === "error") && <>
        <Button onClick={retry} className="primary-pill"><RefreshCw />{l("再次通话", "Call again")}</Button>
        <Button onClick={onClose} variant="ghost" className="text-slate-400">{l("返回文字导师", "Back to text tutor")}</Button>
      </>}
    </div>
  </div>, document.body);
}
