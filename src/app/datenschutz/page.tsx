import type { Metadata } from "next";
import { RechtsSeite } from "@/components/rechts-seite";

export const metadata: Metadata = { title: "Datenschutzerklärung – ArcoTime" };

export default function DatenschutzPage() {
  return <RechtsSeite slug="datenschutz" />;
}
