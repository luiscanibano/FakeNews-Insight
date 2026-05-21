import { Check, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MIN_PASSWORD_LENGTH, getPasswordRequirementState } from "@/lib/passwordValidation";

function PasswordRequirementsChecklist({ password }) {
  const { t } = useTranslation("auth");
  const requirements = getPasswordRequirementState(password);

  const items = [
    { key: "length", met: requirements.length, label: t("passwordRules.length", { min: MIN_PASSWORD_LENGTH }) },
    { key: "uppercase", met: requirements.uppercase, label: t("passwordRules.uppercase") },
    { key: "lowercase", met: requirements.lowercase, label: t("passwordRules.lowercase") },
    { key: "number", met: requirements.number, label: t("passwordRules.number") },
  ];

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-high/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
        {t("passwordRules.title")}
      </p>
      <ul className="mt-2 space-y-1.5 text-xs text-on-surface-variant">
        {items.map((item) => (
          <li key={item.key} className={`flex items-center gap-2 ${item.met ? "text-primary" : "text-on-surface-variant"}`}>
            {item.met ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordRequirementsChecklist;