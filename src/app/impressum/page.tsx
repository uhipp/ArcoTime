import type { Metadata } from "next";
import { RechtsSeite } from "@/components/rechts-seite";

export const metadata: Metadata = { title: "Impressum – ArcoTime" };

export default function ImpressumPage() {
  return <RechtsSeite slug="impressum" />;
}
