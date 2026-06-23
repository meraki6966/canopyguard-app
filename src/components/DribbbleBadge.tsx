export const DribbbleBadge = () => {
  return (
    <a
      href="https://dribbble.com/shots/27493797"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Dribbble Select - Client-Approved Design Agency"
      style={{
        display: "inline-block",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <img
        src="/dribbble-badge.svg"
        alt="Dribbble Select - Top Design Agency 2026"
        style={{ width: "120px", height: "auto", display: "block" }}
      />
    </a>
  );
};
