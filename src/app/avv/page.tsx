import type { Metadata } from "next";
import { RechtsSeite } from "@/components/rechts-seite";

export const metadata: Metadata = { title: "Auftragsbearbeitungsvertrag – ArcoTime" };

export default function AvvPage() {
  return <RechtsSeite slug="avv" />;
}
