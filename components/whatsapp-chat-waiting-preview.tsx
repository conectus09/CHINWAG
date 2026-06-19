"use client";

import { useEffect, useState } from "react";
import { WhatsAppChatShell } from "@/components/whatsapp-chat-shell";
import { getUserProfile } from "@/lib/user-profile";

interface WhatsAppChatWaitingPreviewProps {
  userId: string;
  onBack?: () => void;
}

export function WhatsAppChatWaitingPreview({
  userId,
  onBack,
}: WhatsAppChatWaitingPreviewProps) {
  const [profile, setProfile] = useState(() =>
    typeof window === "undefined" ? null : getUserProfile(),
  );

  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  return (
    <WhatsAppChatShell
      userId={userId}
      partnerId={null}
      localName={profile?.name}
      localAge={profile?.age}
      partnerLeftMessage={null}
      partnerTyping={false}
      statusText="waiting for match..."
      statusClassName="text-amber-400"
      isConnected={false}
      messages={[]}
      draft=""
      onDraftChange={() => {}}
      canSend={false}
      isSending={false}
      sendError={null}
      onSend={() => {}}
      onNext={() => {}}
      onEndChat={() => {}}
      onBack={onBack}
      onReport={async () => {}}
      embedded
      waitingPreview
    />
  );
}