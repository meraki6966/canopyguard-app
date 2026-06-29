// MITRE ATT&CK technique tagging for security findings.
// Each security finding is mapped to the ATT&CK technique an attacker would
// use against the weakness, with its parent tactic. Displayed alongside the
// finding in the report so the posture issue is framed in adversary terms.

export const MITRE_TECHNIQUES = {
  // Missing Content-Security-Policy → injected/executed scripts
  "Content-Security-Policy": { id: "T1059", tactic: "Execution", name: "Command and Scripting Interpreter" },
  // Missing HSTS → downgrade / interception
  "Strict-Transport-Security": { id: "T1557", tactic: "Credential Access", name: "Adversary-in-the-Middle" },
  // Missing X-Frame-Options → clickjacking / session hijacking via framing
  "X-Frame-Options": { id: "T1185", tactic: "Collection", name: "Browser Session Hijacking" },
  // Missing X-Content-Type-Options → MIME-sniffed script execution
  "X-Content-Type-Options": { id: "T1059", tactic: "Execution", name: "Command and Scripting Interpreter" },
  // Missing Referrer-Policy → leaks host/URL info for recon
  "Referrer-Policy": { id: "T1592", tactic: "Reconnaissance", name: "Gather Victim Host Information" },
  // Server header version disclosure → software fingerprinting for recon
  server_disclosure: { id: "T1592.002", tactic: "Reconnaissance", name: "Gather Victim Host Information: Software" },
};

export function getTechnique(key) {
  return MITRE_TECHNIQUES[key] || null;
}

// Self-contained badge — neutral ATT&CK styling so it reads consistently
// across the dark report dashboard and the 5-layer security panel.
export function MitreBadge({ technique, style }) {
  if (!technique) return null;
  return (
    <span
      title={`MITRE ATT&CK ${technique.id} — ${technique.name} (${technique.tactic})`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 3,
        fontSize: 10,
        fontFamily: "'JetBrains Mono','SF Mono',monospace",
        fontWeight: 700,
        background: "rgba(200,169,110,0.10)",
        color: "#C8A96E",
        border: "1px solid rgba(200,169,110,0.30)",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span>ATT&amp;CK {technique.id}</span>
      <span style={{ opacity: 0.7, fontWeight: 600, textTransform: "uppercase" }}>{technique.tactic}</span>
    </span>
  );
}
