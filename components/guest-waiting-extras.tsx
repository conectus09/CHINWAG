"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Share2, Volume2, VolumeX } from "lucide-react";
import { setGuestIcebreaker, setGuestSoundEnabled } from "@/lib/guest-session";
import { useGuestSession } from "@/hooks/use-guest-session";

const SAFETY_TIPS = [
  "Stay anonymous — don't share phone, address, or social handles too fast.",
  "Use Report if someone is rude, creepy, or spamming.",
  "You can skip anytime — no pressure to keep chatting.",
  "Voice/video is optional. Only turn on camera if you feel comfortable.",
];

interface GuestWaitingExtrasProps {
  queueAhead?: number | null;
  estimatedWaitSec?: number | null;
}

export function GuestWaitingExtras({
  queueAhead,
  estimatedWaitSec,
}: GuestWaitingExtrasProps) {
  const { soundEnabled, lastIcebreaker } = useGuestSession();
  const [tipIndex, setTipIndex] = useState(0);
  const [icebreaker, setIcebreaker] = useState(lastIcebreaker);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const shuffleIcebreaker = useCallback(async () => {
    const response = await fetch("/api/icebreaker");
    if (!response.ok) return;
    const data = (await response.json()) as { prompt: string };
    setIcebreaker(data.prompt);
    setGuestIcebreaker(data.prompt);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((index) => (index + 1) % SAFETY_TIPS.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (icebreaker) return;
    void shuffleIcebreaker();
  }, [icebreaker, shuffleIcebreaker]);

  const shareInvite = useCallback(async () => {
    const url = window.location.origin;
    const text = "Join me on Chinwag — random chat with strangers!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Chinwag", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareMsg("Link copied!");
    } catch {
      setShareMsg("Could not share");
    }
    window.setTimeout(() => setShareMsg(null), 2500);
  }, []);

  return (
    <div className="guest-waiting-extras">
      {estimatedWaitSec != null && (
        <p className="guest-waiting-estimate">
          Est. wait ~{estimatedWaitSec}s
          {queueAhead != null && queueAhead > 0 ? ` · ${queueAhead} in queue` : ""}
        </p>
      )}

      <div className="guest-waiting-tip">
        <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p>{SAFETY_TIPS[tipIndex]}</p>
      </div>

      {icebreaker && (
        <p className="guest-waiting-icebreaker">
          <span className="text-sky-300">Try asking:</span> {icebreaker}
        </p>
      )}

      <div className="guest-waiting-actions">
        <button type="button" className="guest-waiting-action" onClick={() => void shuffleIcebreaker()}>
          New icebreaker
        </button>
        <button type="button" className="guest-waiting-action" onClick={() => void shareInvite()}>
          <Share2 className="h-3.5 w-3.5" />
          Invite a friend
        </button>
        <button
          type="button"
          className="guest-waiting-action"
          onClick={() => setGuestSoundEnabled(!soundEnabled)}
          aria-label="Toggle sounds"
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
          Sound {soundEnabled ? "on" : "off"}
        </button>
      </div>

      {shareMsg && <p className="guest-waiting-share-msg">{shareMsg}</p>}
    </div>
  );
}