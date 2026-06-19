export type SiteLinkId =
  | "home"
  | "about"
  | "faq"
  | "privacy"
  | "terms"
  | "cookies"
  | "contact";

export const SITE_LINKS = [
  { id: "home" as const, href: "/", label: "Home" },
  { id: "about" as const, href: "/about", label: "About" },
  { id: "faq" as const, href: "/faq", label: "FAQ" },
  { id: "privacy" as const, href: "/privacy", label: "Privacy" },
  { id: "terms" as const, href: "/terms", label: "Terms" },
  { id: "cookies" as const, href: "/cookies", label: "Cookies" },
  { id: "contact" as const, href: "/contact", label: "Contact" },
] satisfies { id: SiteLinkId; href: string; label: string }[];