import { useTranslation } from "react-i18next";

const C = {
  black: "#0A0A0A",
  blackCard: "#131316",
  blackBorder: "#1C1C20",
  red: "#E53935",
  white: "#FFFFFF",
  gray: "#8A8A8E",
  grayDark: "#55555A",
  redGlow: "rgba(229,57,53,0.06)",
  redBorder: "rgba(229,57,53,0.2)"
};

const mono = "'JetBrains Mono','SF Mono','Fira Code',monospace";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  
  // Normalize language key (e.g. en-US -> en)
  const currentLang = i18n.language ? i18n.language.substring(0, 2).toLowerCase() : "en";

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const containerStyle = {
    display: "inline-flex",
    alignItems: "center",
    background: C.blackCard,
    border: `1px solid ${C.blackBorder}`,
    borderRadius: 20,
    padding: 3,
    gap: 4,
    fontFamily: mono,
  };

  const buttonStyle = (active) => ({
    background: active ? C.red : "transparent",
    color: active ? C.white : C.gray,
    border: "none",
    borderRadius: 16,
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    letterSpacing: 1,
  });

  return (
    <div style={containerStyle}>
      <button
        style={buttonStyle(currentLang === "en")}
        onClick={() => changeLanguage("en")}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        style={buttonStyle(currentLang === "es")}
        onClick={() => changeLanguage("es")}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}
