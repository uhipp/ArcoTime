import { alleReleases, RELEASE_TYP_LABEL } from "@/lib/releases";

export default function AenderungenPage() {
  const releases = alleReleases();

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-1">Was ist neu</h1>
      <p className="text-sm text-gray-500 mb-8">
        Alle Neuerungen und Verbesserungen von ArcoTime, neueste zuerst.
      </p>

      <div className="space-y-10">
        {releases.map((release) => (
          <section key={release.version}>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-lg font-medium">{release.titel}</h2>
              <span className="text-xs text-gray-400">
                Version {release.version} · {new Date(release.datum).toLocaleDateString("de-CH")}
              </span>
            </div>
            <ul className="space-y-2">
              {release.eintraege.map((eintrag, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="shrink-0 text-xs font-medium text-arcos-steel">
                    {RELEASE_TYP_LABEL[eintrag.typ]}
                  </span>
                  <span className="text-gray-700">{eintrag.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
