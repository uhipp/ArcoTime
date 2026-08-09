import { headers } from "next/headers";

// Ermittelt die tatsächliche externe Origin (für Redirect-URLs in E-Mails),
// auch hinter Vercel/Proxies, wo "origin" selbst oft fehlt.
export async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}
