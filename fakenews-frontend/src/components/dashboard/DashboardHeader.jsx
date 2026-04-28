/**
 * @file DashboardHeader.jsx
 * @description Componente del dashboard para renderizar análisis, resultados, navegacion y paneles operativos.
 */

import { Link } from "react-router-dom";
import { Crown, LogOut, Menu, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Cabecera global del dashboard con navegacion desktop/mobile y estado de cuenta. */
function DashboardHeader({
  navItems,
  activeNavId,
  onNavSelect,
  planLabel,
  accountLabel,
  onLogout,
  onOpenPlanSelector,
  onOpenAccountPanel,
}) {
  const { t } = useTranslation("dashboard");
  return (
    <header className="fixed top-0 z-50 w-full px-4 pt-4 md:px-6">
      <div className="landing-navbar-shell mx-auto flex h-auto min-h-16 w-full max-w-7xl flex-wrap items-center gap-3 rounded-2xl border border-outline-variant/20 px-4 py-3 md:px-6 md:py-0">
        <Link to="/" className="group flex items-center gap-3 text-on-surface">
          <span className="landing-brand-mark" aria-hidden="true">
            <span className="landing-brand-grid" />
            <span className="landing-brand-glyph">
              <span className="landing-brand-bar landing-brand-bar-a" />
              <span className="landing-brand-bar landing-brand-bar-b" />
              <span className="landing-brand-dot" />
            </span>
          </span>
          <span className="leading-tight">
            <span className="landing-brand-lead">FakeNews</span>
            <span className="landing-brand-tail">Insight</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = item.id === activeNavId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavSelect(item.id)}
                className={`dash-tab ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.labelKey ? t(item.labelKey) : item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={onOpenPlanSelector}
            className="dash-pill dash-pill-emphasis"
          >
            <Crown className="size-3.5" />
            {planLabel}
          </button>
          <button
            type="button"
            onClick={onOpenAccountPanel}
            className="dash-pill max-w-44 truncate"
            aria-label={t("header.openAccount")}
            title={t("header.manageAccount")}
          >
            <UserRound className="size-3.5" />
            <span className="truncate">{accountLabel}</span>
          </button>
          <Button type="button" variant="ghost" size="sm" onClick={onLogout} className="dash-tab">
            <LogOut className="size-3.5" />
            {t("header.logout")}
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" size="icon-sm" variant="ghost" className="rounded-xl border border-outline-variant/30 bg-surface/60" aria-label={t("header.openMenu")}>
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="landing-mobile-sheet border-outline-variant/20 bg-surface p-6">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle className="text-on-surface">{t("header.menuTitle")}</SheetTitle>
                <SheetDescription className="text-on-surface-variant">
                  {t("header.menuDescription")}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-1.5">
                {navItems.map((item, index) => {
                  const isActive = item.id === activeNavId;

                  return (
                    <SheetClose asChild key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavSelect(item.id)}
                        className={`dash-mobile-item landing-mobile-link ${isActive ? "is-active" : ""}`}
                        style={{ "--nav-delay": `${index * 60}ms` }}
                      >
                        {item.labelKey ? t(item.labelKey) : item.label}
                      </button>
                    </SheetClose>
                  );
                })}
              </div>

              <SheetClose asChild>
                <button
                  type="button"
                  onClick={onOpenPlanSelector}
                  className="mt-7 flex w-full items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface/50 px-3 py-2 text-left text-xs text-on-surface-variant transition-colors hover:bg-surface"
                >
                  <Crown className="size-3.5 text-primary" />
                  {t("header.currentPlan", { plan: planLabel })}
                </button>
              </SheetClose>
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={onOpenAccountPanel}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface/50 px-3 py-2 text-left text-xs text-on-surface-variant transition-colors hover:bg-surface"
                >
                  <UserRound className="size-3.5 text-primary" />
                  {accountLabel}
                </button>
              </SheetClose>
              <Button type="button" variant="outline" className="mt-6 w-full" onClick={onLogout}>
                <LogOut className="size-4" />
                {t("header.logoutLong")}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
