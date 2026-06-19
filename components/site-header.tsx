"use client";

import { Zap } from "lucide-react";
import { HeaderActions } from "@/components/header-actions";
import { MenuDotsMenu } from "@/components/menu-dots-menu";

export function SiteHeader() {
  return (
    <header className="site-header relative z-10">
      <div className="site-header-grid">
        <div className="site-header-dots">
          <MenuDotsMenu />
        </div>

        <HeaderActions className="site-header-actions" />

        <div className="site-header-badge-wrap">
          <div className="theme-badge site-header-badge">
            <Zap className="site-header-badge-icon" aria-hidden />
            <span className="site-header-badge-text site-header-badge-text-full">
              Instant random connections
            </span>
            <span className="site-header-badge-text site-header-badge-text-short">
              Instant connections
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}