import { describe, expect, it } from "vitest";
import { isBlockedHost, isPrivateIPv4, isPrivateIPv6 } from "../../supabase/functions/news-image/hosts";

/** The image proxy (news-image) must not reach internal addresses, whatever way they are written */
describe("news-image host checks", () => {
  it("blocks internal IPv4 ranges and lets public ones through", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "192.0.0.8", "198.18.0.1", "224.0.0.1"]) {
      expect(isPrivateIPv4(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "100.128.0.1", "151.101.1.140"]) {
      expect(isPrivateIPv4(ip), ip).toBe(false);
    }
  });

  it("blocks IPv6 loopback, unique local, link-local and mapped IPv4", () => {
    for (const ip of ["::1", "::", "fd00::1", "fc12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::a00:1"]) {
      expect(isPrivateIPv6(ip), ip).toBe(true);
    }
    expect(isPrivateIPv6("2606:4700::6810:84e5")).toBe(false);
    expect(isPrivateIPv6("::ffff:8.8.8.8")).toBe(false);
  });

  it("reads hostnames the way URL hands them over, brackets included", () => {
    const host = (u: string) => new URL(u).hostname;
    expect(isBlockedHost(host("http://[::1]/x.png"))).toBe(true);
    expect(isBlockedHost(host("http://[fd00::abcd]/x.png"))).toBe(true);
    expect(isBlockedHost(host("http://[::ffff:169.254.169.254]/latest"))).toBe(true);
    // The URL parser turns these spellings into 127.0.0.1
    expect(isBlockedHost(host("http://2130706433/"))).toBe(true);
    expect(isBlockedHost(host("http://0x7f.1/"))).toBe(true);
    expect(isBlockedHost(host("http://localhost./"))).toBe(true);
    expect(isBlockedHost(host("http://metadata.google.internal/"))).toBe(true);
    expect(isBlockedHost(host("https://image.tmdb.org/t/p/w500/a.jpg"))).toBe(false);
  });
});
