/** Which hosts the image proxy must never fetch from (SSRF). No Deno imports, so the tests can load it. */

/** Loopback, private, link-local, carrier-grade NAT, benchmark, multicast and reserved IPv4 ranges */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && parts[2] === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateIPv6(ip: string): boolean {
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  // fc00::/7 unique local, fe80::/10 link-local
  if (/^f[cd][0-9a-f]{0,2}:/.test(v6) || /^fe[89ab][0-9a-f]?:/.test(v6)) return true;
  // IPv4 inside IPv6 (::ffff:10.0.0.1, ::ffff:a00:1, 64:ff9b::7f00:1)
  const mapped = v6.match(/^(?:::ffff:|64:ff9b::)(.+)$/);
  if (mapped) {
    const tail = mapped[1];
    if (tail.includes(".")) return isPrivateIPv4(tail);
    const hex = tail.split(":");
    if (hex.length === 2) {
      const hi = parseInt(hex[0], 16);
      const lo = parseInt(hex[1], 16);
      return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
  }
  return false;
}

/** True for every host the proxy must not reach; URL hostnames keep IPv6 in brackets */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPrivateIPv4(host);
  if (host.includes(":")) return isPrivateIPv6(host);
  return false;
}
