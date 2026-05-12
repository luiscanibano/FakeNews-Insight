/**
 * @file DashboardPlanSelectorModal.jsx
 * @description Popup de seleccion de plan: orquesta checkout, upgrade prorrateado, downgrade/cancel programados y portal de Stripe.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crown, ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLandingContent } from "@/components/landing/landingContent";
import { USER_PLAN } from "@/lib/accessControl";
import { useBillingStore } from "@/store/billingStore";
import { useBillingActions } from "@/hooks/useBillingActions";
import { resolvePlanCardAction } from "./resolvePlanCardAction";

/** Formatea fecha ISO al locale de i18n; cae a string vacio si es invalida. */
const formatDate = (iso, locale) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

/** Banner inline con el cambio programado pendiente (downgrade o cancel). */
function ScheduledNoticeBanner({ snapshot, currentPlan, t, locale }) {
  if (!snapshot) return null;
  const { scheduled_plan, scheduled_plan_change_at, days_remaining, cancel_at_period_end } = snapshot;
  if (!scheduled_plan && !cancel_at_period_end) return null;

  const date = formatDate(scheduled_plan_change_at, locale);
  const days = days_remaining ?? 0;

  const message = cancel_at_period_end
    ? t("planSelector.scheduledNoticeCancel", { days, date })
    : t("planSelector.scheduledNoticeDowngrade", {
        currentPlan: (currentPlan || "").toUpperCase(),
        nextPlan: (scheduled_plan || "").toUpperCase(),
        days,
        date,
      });

  return (
    <div
      role="status"
      style={{
        marginBottom: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "0.75rem",
        background: "rgba(250, 204, 21, 0.12)",
        border: "1px solid rgba(250, 204, 21, 0.4)",
        color: "rgb(250, 204, 21)",
        fontSize: "0.875rem",
      }}
    >
      {message}
    </div>
  );
}

/** Banner de feedback (exito/error) tras una accion. */
function ActionFeedback({ feedback, error }) {
  if (!feedback && !error) return null;
  const isError = Boolean(error);
  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        marginBottom: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "0.75rem",
        background: isError ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)",
        border: `1px solid ${isError ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)"}`,
        color: isError ? "rgb(248, 113, 113)" : "rgb(74, 222, 128)",
        fontSize: "0.875rem",
      }}
    >
      {error || feedback}
    </div>
  );
}

/** Popup de seleccion de plan con flujos completos de Stripe. */
function DashboardPlanSelectorModal({ isOpen, currentPlan, onClose }) {
  const { t, i18n } = useTranslation("dashboard");
  const landingContent = useLandingContent();

  const snapshot = useBillingStore((state) => state.snapshot);
  const loadSnapshot = useBillingStore((state) => state.loadSnapshot);
  const actionInFlight = useBillingStore((state) => state.actionInFlight);
  const error = useBillingStore((state) => state.error);

  const { selectPlan, cancelSubscription, resumeSubscription, openPortal } = useBillingActions();

  const [feedback, setFeedback] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const closeModal = useCallback(() => {
    setFeedback("");
    setPendingConfirm(null);
    onClose();
  }, [onClose]);

  /** Bloquea el body, captura ESC y carga snapshot al abrir. */
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    loadSnapshot().catch(() => {
      /* error queda en el store */
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !actionInFlight) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, loadSnapshot, actionInFlight, closeModal]);

  const isProcessing = Boolean(actionInFlight);
  const locale = i18n.language || "en";

  const ctaLabel = (planKey, planName, action) => {
    if (isProcessing) return t("planSelector.processing");
    switch (action.kind) {
      case "current":
        return t("planSelector.currentAction");
      case "subscribe":
        return t("planSelector.subscribe", { plan: planName });
      case "upgrade":
        return t("planSelector.upgradeNow", { plan: planName });
      case "downgrade":
        if (planKey === USER_PLAN.FREE) {
          return t("planSelector.cancelToFree");
        }
        return t("planSelector.downgradeAtPeriodEnd", { plan: planName });
      case "cancel":
        return t("planSelector.cancelToFree");
      case "resume":
        return t("planSelector.resume");
      default:
        return planName;
    }
  };

  const requestConfirm = (planKey, action) => {
    setFeedback("");
    setPendingConfirm({ planKey, action });
  };

  const runAction = async ({ planKey, action }) => {
    setFeedback("");
    setPendingConfirm(null);
    try {
      if (action.kind === "subscribe" || action.kind === "upgrade") {
        const result = await selectPlan(planKey);
        if (result?.status === "checkout") {
          setFeedback(t("planSelector.feedback.checkoutRedirect"));
          return;
        }
        if (result?.status === "upgraded") {
          setFeedback(
            t("planSelector.feedback.upgradeSuccess", { plan: planKey.toUpperCase() })
          );
        }
      } else if (action.kind === "downgrade") {
        const result = await selectPlan(planKey);
        if (result?.status === "scheduled_downgrade") {
          setFeedback(
            t("planSelector.feedback.downgradeScheduled", {
              plan: planKey.toUpperCase(),
              days: result.days_remaining ?? 0,
            })
          );
        }
      } else if (action.kind === "cancel") {
        const result = await cancelSubscription();
        setFeedback(
          t("planSelector.feedback.cancelScheduled", { days: result?.days_remaining ?? 0 })
        );
      } else if (action.kind === "resume") {
        await resumeSubscription();
        setFeedback(t("planSelector.feedback.resumed"));
      }
    } catch {
      /* error queda en store.error y se muestra en banner */
    }
  };

  const handleClick = (planKey, planName, action) => {
    if (action.kind === "current") return;
    if (action.kind === "subscribe" || action.kind === "upgrade" || action.kind === "resume") {
      void runAction({ planKey, action });
      return;
    }
    requestConfirm(planKey, action);
  };

  const planList = useMemo(() => landingContent.value.plans, [landingContent]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="dash-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          closeModal();
        }
      }}
    >
      <section className="dash-modal dash-modal-lg" role="dialog" aria-modal="true">
        <div className="dash-modal-head">
          <div>
            <span className="dash-home-eyebrow">
              <Crown className="size-3.5" aria-hidden="true" />
              {t("planSelector.eyebrow")}
            </span>
            <h2 className="dash-home-h1 mt-3" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
              {t("planSelector.title")}
            </h2>
            <p className="dash-home-sub" style={{ marginTop: "0.4rem" }}>
              {t("planSelector.subtitle")}
            </p>
          </div>

          <button
            type="button"
            className="dash-modal-close"
            onClick={closeModal}
            disabled={isProcessing}
            aria-label={t("planSelector.closeAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        <ScheduledNoticeBanner snapshot={snapshot} currentPlan={currentPlan} t={t} locale={locale} />
        <ActionFeedback feedback={feedback} error={error} />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {planList.map((plan, index) => {
            const isCurrent = plan.key === currentPlan;
            const action = resolvePlanCardAction({
              planKey: plan.key,
              currentPlan,
              snapshot,
            });

            const cardClasses = [
              "dash-plan-card",
              plan.recommended ? "is-recommended" : "",
              isCurrent ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={plan.key} className={cardClasses} style={{ "--i": index }}>
                {plan.recommended ? (
                  <span className="dash-plan-recommended-tag">{t("planSelector.recommended")}</span>
                ) : null}
                {isCurrent ? <span className="dash-plan-current-tag">{t("planSelector.currentTag")}</span> : null}

                <p className="dash-plan-name">{plan.name}</p>

                <p className="dash-plan-price">
                  <span className="dash-plan-price-amount">{plan.price}</span>
                  <span className="dash-plan-price-interval">{plan.interval}</span>
                </p>

                <ul className="dash-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="dash-plan-feature">
                      <Check className="dash-plan-feature-icon size-4" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {action.kind === "upgrade" ? (
                  <p className="dash-plan-feature" style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                    {t("planSelector.proratedExplain")}
                  </p>
                ) : null}
                {action.kind === "downgrade" ? (
                  <p className="dash-plan-feature" style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                    {t("planSelector.downgradeExplain")}
                  </p>
                ) : null}

                <button
                  type="button"
                  className={`dash-plan-action ${
                    plan.recommended ? "dash-plan-action-primary" : "dash-plan-action-outline"
                  }`}
                  disabled={action.kind === "current" || isProcessing}
                  onClick={() => handleClick(plan.key, plan.name, action)}
                >
                  {ctaLabel(plan.key, plan.name, action)}
                </button>
              </article>
            );
          })}
        </div>

        {snapshot?.stripe_customer_id ? (
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p style={{ fontSize: "0.8rem", opacity: 0.75, margin: 0 }}>
              {t("planSelector.managePortalHint")}
            </p>
            <button
              type="button"
              className="dash-cta"
              onClick={() => {
                setFeedback("");
                void openPortal();
              }}
              disabled={isProcessing}
            >
              {t("planSelector.managePortal")}
              <ExternalLink className="dash-cta-arrow size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {pendingConfirm ? (
          <div
            role="alertdialog"
            aria-modal="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              borderRadius: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                background: "rgb(20, 22, 28)",
                borderRadius: "0.85rem",
                padding: "1.5rem",
                maxWidth: "26rem",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="dash-section-title-sm" style={{ marginBottom: "0.75rem" }}>
                {pendingConfirm.action.kind === "cancel"
                  ? t("planSelector.confirmCancelTitle")
                  : t("planSelector.confirmDowngradeTitle")}
              </h3>
              <p className="dash-section-text" style={{ marginBottom: "1.25rem" }}>
                {pendingConfirm.action.kind === "cancel"
                  ? t("planSelector.confirmCancelBody")
                  : t("planSelector.downgradeExplain")}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="dash-plan-action dash-plan-action-outline"
                  onClick={() => setPendingConfirm(null)}
                  disabled={isProcessing}
                >
                  {t("planSelector.confirmAbort")}
                </button>
                <button
                  type="button"
                  className="dash-plan-action dash-plan-action-primary"
                  onClick={() => runAction(pendingConfirm)}
                  disabled={isProcessing}
                >
                  {isProcessing ? t("planSelector.processing") : t("planSelector.confirmContinue")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default DashboardPlanSelectorModal;
