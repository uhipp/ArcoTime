import type { Metadata } from "next";
import { RechtsSeite } from "@/components/rechts-seite";

export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen – ArcoTime" };

export default function AgbPage() {
  return <RechtsSeite slug="agb" />;
}
