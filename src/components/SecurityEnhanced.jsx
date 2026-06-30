// src/components/SecurityEnhanced.jsx
import { getTechnique, MitreBadge } from '../mitre';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(194,75,58,0.12)', border: '#C24B3A', text: '#E69B8F', badge: '#C24B3A' },
  high:     { bg: 'rgba(200,169,110,0.12)', border: '#C8A96E', text: '#E0CCA0', badge: '#C8A96E' },
  medium:   { bg: 'rgba(200,169,110,0.07)', border: 'rgba(200,169,110,0.5)', text: '#CDBE99', badge: '#A88A52' },
};

const POLICY_COLORS = {
  reject:      '#2A7A5E',
  quarantine:  '#C8A96E',
  softfail:    '#C8A96E',
  none:        '#C24B3A',
  pass_all:    '#C24B3A',
  absent:      '#C24B3A',
  strong:      '#2A7A5E',
  weak:        '#C8A96E',
};

function policyBadge(value) {
  const color = POLICY_COLORS[value] || '#888';
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: '700',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {value || 'unknown'}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? '#2A7A5E' : score >= 50 ? '#C8A96E' : '#C24B3A';
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>layer score</span>
        <span style={{ color, fontWeight: '700' }}>{score ?? '—'}</span>
      </div>
      <div style={{ background: 'rgba(237,244,239,0.1)', borderRadius: '2px', height: '4px' }}>
        <div style={{
          width: `${Math.min(100, score ?? 0)}%`,
          height: '100%',
          background: color,
          borderRadius: '2px',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function LayerCard({ title, data, children }) {
  if (!data) return null;
  const score = data.score_contribution;
  const rationale = data.rationale || [];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A96E', marginBottom: '10px' }}>
        {title}
      </div>
      {children}
      <ScoreBar score={score} />
      {rationale.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
          {rationale.slice(0, 3).map((r, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#888', lineHeight: '1.5', marginBottom: '3px' }}>
              {r}
            </div>
          ))}
          {rationale.length > 3 && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
              +{rationale.length - 3} more finding{rationale.length - 3 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }) {
  if (value === undefined || value === null) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#F8F8F8', fontWeight: '600', textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>
        {String(value)}
      </span>
    </div>
  );
}

// Renders the MITRE ATT&CK technique badges a layer surfaces. Each finding
// identifies the exposure condition associated with a technique ID (corrected
// language — not "maps to").
function MitreRow({ mitre }) {
  if (!mitre || mitre.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      {mitre.map((m, i) => (
        <MitreBadge key={i} technique={m} style={{ fontSize: 9 }} />
      ))}
    </div>
  );
}

export function SecurityEnhanced({ data }) {
  if (!data) return null;

  const { tls, dns, http, html, paths, reputation, footprint, domain_email, sensitive_files, cross_reference } = data;
  const crossRefs = cross_reference || [];
  const repStatusColor = reputation
    ? (reputation.status === 'CLEAN' ? '#2A7A5E' : reputation.status === 'UNKNOWN' ? '#C8A96E' : '#C24B3A')
    : '#888';

  return (
    <div style={{ marginTop: '24px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(200,169,110,0.2)' }} />
        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A96E', whiteSpace: 'nowrap' }}>
          Security Posture — 9 Layer Analysis
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(200,169,110,0.2)' }} />
      </div>

      {/* Cross-reference findings */}
      {crossRefs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {crossRefs.map((finding, i) => {
            const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.medium;
            return (
              <div key={i} style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '8px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '14px', marginTop: '1px' }}>⚠</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: colors.badge, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                    Cross-Reference Finding — {finding.severity}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.text, lineHeight: '1.5' }}>
                    {finding.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 9 Layer grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>

        {/* TLS Layer */}
        <LayerCard title="TLS / Certificate" data={tls}>
          {tls && (
            <>
              <DataRow label="TLS version" value={tls.tls_version} />
              <DataRow label="Cipher suite" value={tls.cipher_suite} />
              <DataRow label="Cert expiry"
                value={tls.cert_expiry_days >= 0
                  ? `${tls.cert_expiry_days} days (${tls.cert_expiry_status})`
                  : 'expired'} />
              <DataRow label="Issuer" value={tls.cert_issuer} />
              {tls.cert_self_signed && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>Self-signed certificate detected</div>
              )}
              {tls.cert_san_mismatch && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>SAN mismatch detected</div>
              )}
            </>
          )}
        </LayerCard>

        {/* DNS Layer */}
        <LayerCard title="DNS Security" data={dns}>
          {dns && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>SPF:</span>
                {policyBadge(dns.spf_policy)}
                <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>DMARC:</span>
                {policyBadge(dns.dmarc_policy)}
              </div>
              <DataRow label="CAA records" value={dns.caa_present ? 'Present' : 'Absent'} />
              <DataRow label="DKIM selectors" value={dns.dkim_selectors_found?.length > 0 ? dns.dkim_selectors_found.join(', ') : 'None found'} />
              {dns.subdomain_takeover_risk?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '6px' }}>
                  Takeover risk: {dns.subdomain_takeover_risk.join(', ')}
                </div>
              )}
            </>
          )}
        </LayerCard>

        {/* HTTP Layer */}
        <LayerCard title="HTTP Headers" data={http}>
          {http && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>CSP:</span>
                {policyBadge(http.csp_quality)}
              </div>
              {http.server_disclosure && (
                <>
                  <DataRow label="Server header" value={http.server_header_value} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-2px', marginBottom: '6px' }}>
                    <MitreBadge technique={getTechnique('server_disclosure')} />
                  </div>
                </>
              )}
              {http.powered_by_disclosure && (
                <div style={{ fontSize: '11px', color: '#C8A96E', marginBottom: '4px' }}>X-Powered-By disclosure detected</div>
              )}
              {http.cors_wildcard && (
                <div style={{ fontSize: '11px', color: http.cors_credentialed_wildcard ? '#C24B3A' : '#C8A96E', marginBottom: '4px' }}>
                  CORS wildcard{http.cors_credentialed_wildcard ? ' with credentials — critical' : ' detected'}
                </div>
              )}
              {http.dangerous_methods?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#C8A96E', marginBottom: '4px' }}>
                  Dangerous methods: {http.dangerous_methods.join(', ')}
                </div>
              )}
              <DataRow label="security.txt" value={http.security_txt_present ? 'Present' : 'Absent'} />
            </>
          )}
        </LayerCard>

        {/* HTML Layer */}
        <LayerCard title="HTML Analysis" data={html}>
          {html && (
            <>
              {html.vulnerable_libraries?.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#C24B3A', fontWeight: '600', marginBottom: '4px' }}>
                    Vulnerable libraries detected:
                  </div>
                  {html.vulnerable_libraries.map((lib, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>
                      {lib.lib} {lib.version} — {lib.cve}
                    </div>
                  ))}
                </div>
              )}
              <DataRow label="Forms missing CSRF" value={html.forms_without_csrf > 0 ? html.forms_without_csrf : 'None'} />
              <DataRow label="Mixed content" value={html.mixed_content_urls?.length > 0 ? `${html.mixed_content_urls.length} found` : 'Clean'} />
              <DataRow label="Inline scripts" value={html.inline_script_count} />
              {html.generator_disclosure && (
                <DataRow label="Generator tag" value={html.generator_disclosure} />
              )}
              {html.debug_content_detected && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>Debug output detected in page body</div>
              )}
            </>
          )}
        </LayerCard>

        {/* Paths Layer */}
        <LayerCard title="Path Exposure" data={paths}>
          {paths && (
            <>
              {paths.developer_files_exposed?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#C24B3A', fontWeight: '600' }}>Developer files exposed:</div>
                  {paths.developer_files_exposed.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888' }}>{f}</div>
                  ))}
                </div>
              )}
              {paths.backup_files_exposed?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#C24B3A', fontWeight: '600' }}>Backup files exposed:</div>
                  {paths.backup_files_exposed.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888' }}>{f}</div>
                  ))}
                </div>
              )}
              {paths.source_maps_exposed?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#C8A96E', fontWeight: '600' }}>Source maps exposed:</div>
                  {paths.source_maps_exposed.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888' }}>{f}</div>
                  ))}
                </div>
              )}
              {paths.cms_panels_exposed?.length > 0 && (
                <DataRow label="CMS panels" value={paths.cms_panels_exposed.join(', ')} />
              )}
              {paths.db_panels_exposed?.length > 0 && (
                <DataRow label="DB panels" value={paths.db_panels_exposed.join(', ')} />
              )}
              <DataRow label="Directory listing" value={paths.directory_listing_confirmed ? 'Enabled' : 'Disabled'} />
              <DataRow label="Error disclosure" value={paths.error_page_discloses_stack ? 'Detected' : 'Clean'} />
              {paths.api_paths_exposed?.length > 0 && (
                <DataRow label="Open API paths" value={paths.api_paths_exposed.join(', ')} />
              )}
              {[
                ...( paths.developer_files_exposed || []),
                ...( paths.backup_files_exposed || []),
                ...( paths.source_maps_exposed || []),
                ...( paths.cms_panels_exposed || []),
                ...( paths.db_panels_exposed || []),
              ].length === 0 && !paths.directory_listing_confirmed && !paths.error_page_discloses_stack && (
                <div style={{ fontSize: '12px', color: '#2A7A5E' }}>No sensitive paths exposed</div>
              )}
            </>
          )}
        </LayerCard>

        {/* Malware & Reputation Layer */}
        <LayerCard title="Malware & Reputation" data={reputation}>
          {reputation && (
            <>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>Status:</span>
                <span style={{
                  display: 'inline-block', padding: '1px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '700',
                  background: repStatusColor + '22', color: repStatusColor, border: `1px solid ${repStatusColor}44`,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{reputation.status}</span>
              </div>
              <DataRow label="Google Safe Browsing"
                value={reputation.safe_browsing?.checked
                  ? (reputation.safe_browsing.flagged ? (reputation.safe_browsing.threat_types || []).join(', ') : 'Clean')
                  : 'Not configured'} />
              <DataRow label="Blacklists"
                value={reputation.blacklists?.listed_on?.length > 0
                  ? reputation.blacklists.listed_on.join(', ')
                  : `Clean (${reputation.blacklists?.services_checked ?? 0} checked)`} />
              {reputation.reasons?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>{reputation.reasons.join('; ')}</div>
              )}
              <MitreRow mitre={reputation.mitre} />
            </>
          )}
        </LayerCard>

        {/* Footprint Analysis Layer */}
        <LayerCard title="Footprint Analysis" data={footprint}>
          {footprint && (
            <>
              <DataRow label="External resources w/o SRI"
                value={(footprint.sri?.scripts_missing_sri + footprint.sri?.stylesheets_missing_sri) > 0
                  ? `${footprint.sri.scripts_missing_sri + footprint.sri.stylesheets_missing_sri} missing`
                  : 'All hashed'} />
              <DataRow label="Cookie flags"
                value={(footprint.cookies?.missing_secure + footprint.cookies?.missing_httponly) > 0
                  ? `${footprint.cookies.missing_secure} no Secure, ${footprint.cookies.missing_httponly} no HttpOnly`
                  : (footprint.cookies?.total > 0 ? 'Secure + HttpOnly set' : 'No cookies')} />
              <DataRow label="TLS ciphers supported" value={footprint.tls_ciphers?.supported?.length} />
              {footprint.tls_ciphers?.weak_supported?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>
                  Weak: {footprint.tls_ciphers.weak_supported.join(', ')}
                </div>
              )}
              {footprint.tls_ciphers?.weak_protocols_supported?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>
                  Deprecated protocols: {footprint.tls_ciphers.weak_protocols_supported.join(', ')}
                </div>
              )}
              <DataRow label="Certificate Transparency"
                value={footprint.certificate_transparency?.checked
                  ? (footprint.certificate_transparency.present ? `Present (${footprint.certificate_transparency.logged_certificates} logged)` : 'Not found')
                  : 'Unverified'} />
              <MitreRow mitre={footprint.mitre} />
            </>
          )}
        </LayerCard>

        {/* DNS & Email Depth Layer */}
        <LayerCard title="DNS & Email Depth" data={domain_email}>
          {domain_email && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>SPF:</span>
                {policyBadge(domain_email.spf?.all_qualifier === 'fail' ? 'reject'
                  : domain_email.spf?.all_qualifier === 'softfail' ? 'softfail'
                  : domain_email.spf?.all_qualifier === 'pass' ? 'pass_all'
                  : domain_email.spf?.present ? 'weak' : 'absent')}
                <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>DMARC:</span>
                {policyBadge(domain_email.dmarc?.policy)}
              </div>
              {domain_email.spf?.all_strength && (
                <DataRow label="SPF enforcement" value={domain_email.spf.all_strength} />
              )}
              <DataRow label="Registrar lock" value={domain_email.registrar?.registrar_locked ? 'Locked' : 'Unlocked'} />
              {domain_email.registrar?.days_until_expiration !== null && domain_email.registrar?.days_until_expiration !== undefined && (
                <DataRow label="Expires in" value={`${domain_email.registrar.days_until_expiration} days`} />
              )}
              {domain_email.registrar?.hijacking_risk && (
                <div style={{ fontSize: '11px', color: '#C24B3A', marginTop: '4px' }}>
                  {domain_email.registrar.days_until_expiration < 0
                    ? 'Domain expired — hijacking risk'
                    : domain_email.registrar.expiring_soon
                      ? 'Expires within 60 days — hijacking risk'
                      : 'Transfer lock missing — hijacking risk'}
                </div>
              )}
              <MitreRow mitre={domain_email.mitre} />
            </>
          )}
        </LayerCard>

        {/* Sensitive Files Layer */}
        <LayerCard title="Sensitive Files" data={sensitive_files}>
          {sensitive_files && (
            <>
              {sensitive_files.accessible_count > 0 ? (
                <div>
                  <div style={{ fontSize: '11px', color: '#C24B3A', fontWeight: '700', marginBottom: '4px' }}>
                    {sensitive_files.accessible_count} CRITICAL exposure(s):
                  </div>
                  {sensitive_files.findings.map((f, i) => (
                    <div key={i} style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#E69B8F', fontFamily: "'JetBrains Mono','SF Mono',monospace" }}>{f.path}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>{f.reason}</div>
                      {f.technique && <div style={{ marginTop: '3px' }}><MitreBadge technique={f.technique} style={{ fontSize: 9 }} /></div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#2A7A5E' }}>
                  No sensitive files exposed ({sensitive_files.paths_checked} paths checked)
                </div>
              )}
            </>
          )}
        </LayerCard>

      </div>
    </div>
  );
}
