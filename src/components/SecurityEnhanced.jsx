// src/components/SecurityEnhanced.jsx

const SEVERITY_COLORS = {
  critical: { bg: '#2D0A0A', border: '#CC4444', text: '#FF8888', badge: '#CC4444' },
  high:     { bg: '#2D1A0A', border: '#CC7722', text: '#FFAA55', badge: '#CC7722' },
  medium:   { bg: '#1A1A0A', border: '#AAAA22', text: '#DDDD55', badge: '#AAAA22' },
};

const POLICY_COLORS = {
  reject:      '#4CAF82',
  quarantine:  '#E0A030',
  softfail:    '#E0A030',
  none:        '#CC5555',
  pass_all:    '#CC5555',
  absent:      '#CC5555',
  strong:      '#4CAF82',
  weak:        '#E0A030',
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
  const color = score >= 80 ? '#4CAF82' : score >= 50 ? '#E0A030' : '#CC5555';
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>layer score</span>
        <span style={{ color, fontWeight: '700' }}>{score ?? '—'}</span>
      </div>
      <div style={{ background: '#1A1A2E', borderRadius: '2px', height: '4px' }}>
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

export function SecurityEnhanced({ data }) {
  if (!data) return null;

  const { tls, dns, http, html, paths, cross_reference } = data;
  const crossRefs = cross_reference || [];

  return (
    <div style={{ marginTop: '24px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(200,169,110,0.2)' }} />
        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8A96E', whiteSpace: 'nowrap' }}>
          Security Posture — 5 Layer Analysis
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

      {/* 5 Layer grid */}
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
                <div style={{ fontSize: '11px', color: '#CC5555', marginTop: '4px' }}>Self-signed certificate detected</div>
              )}
              {tls.cert_san_mismatch && (
                <div style={{ fontSize: '11px', color: '#CC5555', marginTop: '4px' }}>SAN mismatch detected</div>
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
                <div style={{ fontSize: '11px', color: '#CC5555', marginTop: '6px' }}>
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
                <DataRow label="Server header" value={http.server_header_value} />
              )}
              {http.powered_by_disclosure && (
                <div style={{ fontSize: '11px', color: '#E0A030', marginBottom: '4px' }}>X-Powered-By disclosure detected</div>
              )}
              {http.cors_wildcard && (
                <div style={{ fontSize: '11px', color: http.cors_credentialed_wildcard ? '#CC5555' : '#E0A030', marginBottom: '4px' }}>
                  CORS wildcard{http.cors_credentialed_wildcard ? ' with credentials — critical' : ' detected'}
                </div>
              )}
              {http.dangerous_methods?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#E0A030', marginBottom: '4px' }}>
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
                  <div style={{ fontSize: '11px', color: '#CC5555', fontWeight: '600', marginBottom: '4px' }}>
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
                <div style={{ fontSize: '11px', color: '#CC5555', marginTop: '4px' }}>Debug output detected in page body</div>
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
                  <div style={{ fontSize: '11px', color: '#CC5555', fontWeight: '600' }}>Developer files exposed:</div>
                  {paths.developer_files_exposed.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888' }}>{f}</div>
                  ))}
                </div>
              )}
              {paths.backup_files_exposed?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#CC5555', fontWeight: '600' }}>Backup files exposed:</div>
                  {paths.backup_files_exposed.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#888' }}>{f}</div>
                  ))}
                </div>
              )}
              {paths.source_maps_exposed?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#E0A030', fontWeight: '600' }}>Source maps exposed:</div>
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
                <div style={{ fontSize: '12px', color: '#4CAF82' }}>No sensitive paths exposed</div>
              )}
            </>
          )}
        </LayerCard>

      </div>
    </div>
  );
}
