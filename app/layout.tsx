import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieConsent } from "@/components/cookie-consent";
import { LivePresenceTracker } from "@/components/live-presence-tracker";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { APP_LOGO_URL, APP_NAME, APP_TAGLINE } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Random Video Chat`,
  description: APP_TAGLINE,
  icons: {
    icon: APP_LOGO_URL,
    apple: APP_LOGO_URL,
  },
  openGraph: {
    title: `${APP_NAME} — Random Video Chat`,
    description: APP_TAGLINE,
    images: [{ url: APP_LOGO_URL, alt: `${APP_NAME} logo` }],
  },
};

const themeScript = `
  (function () {
    try {
      var key = 'chinwag-theme';
      var versionKey = 'chinwag-theme-version';
      var version = '2';
      var valid = ['dark','light','midnight','sunset','ocean','forest'];
      if (localStorage.getItem(versionKey) !== version) {
        localStorage.setItem(versionKey, version);
        localStorage.setItem(key, 'ocean');
      }
      var stored = localStorage.getItem(key);
      var theme = valid.indexOf(stored) !== -1 ? stored : 'ocean';
      var root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="ocean"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#031016" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', function () {
        var worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function () {});
    caches.keys().then(function (keys) {
      keys.forEach(function (key) {
        if (key.indexOf('chinwag-v1') !== -1 || key.indexOf('chinwag-v2') !== -1) {
          caches.delete(key);
        }
      });
    }).catch(function () {});
  });
}`,
          }}
        />
      </head>
      <body className="min-h-full text-foreground" suppressHydrationWarning>
        <ThemeProvider>
          <LivePresenceTracker />
          {children}
        </ThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}