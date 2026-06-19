import { InfoPage } from "@/components/info-page";

const FAQ_ITEMS = [
  {
    q: "Is Chinwag free?",
    a: "Yes. Guest chat is free. Pro and Max tiers unlock priority matching, filters, and unlimited video/voice.",
  },
  {
    q: "How does matching work?",
    a: "You set language, region, mood, and interests. Chinwag pairs you with someone compatible in the live queue.",
  },
  {
    q: "Is video and voice available?",
    a: "Yes. Start a voice or video call from the chat header once you are matched.",
  },
  {
    q: "How do I report someone?",
    a: "Tap the flag icon in chat, choose a reason, and submit. Multiple reports can trigger automatic restrictions.",
  },
  {
    q: "Can I install Chinwag on my phone?",
    a: "Yes. Add Chinwag to your home screen — it works as a PWA.",
  },
];

export default function FaqPage() {
  return (
    <InfoPage active="faq" title="FAQ" description="Common questions about Chinwag">
      <div className="space-y-6">
        {FAQ_ITEMS.map((item) => (
          <section key={item.q}>
            <h2 className="text-lg font-semibold text-foreground">{item.q}</h2>
            <p className="mt-2 text-muted">{item.a}</p>
          </section>
        ))}
      </div>
    </InfoPage>
  );
}