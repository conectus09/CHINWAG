const PROMPTS = [
  "What's the best thing that happened to you this week?",
  "If you could travel anywhere tomorrow, where would you go?",
  "What's a song you've had on repeat lately?",
  "Two truths and a lie — go!",
  "What's your unpopular opinion?",
  "Cats or dogs? Defend your answer.",
  "What skill would you learn in one day if you could?",
  "What's the last show you binge-watched?",
  "Would you rather explore space or the deep ocean?",
  "What's your go-to comfort food?",
  "If you won a free trip, solo or with friends?",
  "What's something small that made you smile today?",
  "Beach vacation or mountain trek?",
  "What's a hobby you want to pick up?",
  "Morning person or night owl?",
];

export function randomIcebreaker(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)] ?? PROMPTS[0];
}

export function commonInterests(
  a: string[],
  b: string[],
): string[] {
  return a.filter((item) => b.includes(item));
}