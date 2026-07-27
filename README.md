# Worldmap Deluxe

**→ [canuzu.github.io/Worldmap-Deluxe](https://canuzu.github.io/Worldmap-Deluxe/)**

Ein interaktiver historischer Weltatlas: **53 Zeitschnitte von 123.000 v. Chr. bis 2010**.
Der Regler unten schiebt die Weltkarte durch die Jahrtausende – Reiche wachsen,
Grenzen verschieben sich, Kulturen verschwinden. Ein Klick auf ein Gebiet öffnet
den Steckbrief für genau dieses Jahr: Herrscher, Hauptstadt, Regierungsform,
Religion, Bevölkerung, Wirtschaft, Wendepunkte und Nachbarn.

![Nachtatlas: Europa 1815 mit geöffneter Detailtafel](docs/screenshot-nacht.png)

<sup>Nachtatlas – Europa nach dem Wiener Kongress, mit Steckbrief des Kaisertums Österreich</sup>

![Pergament: die Welt 1279](docs/screenshot-pergament.png)

<sup>Pergament – Nordwesteuropa 1600; die Küstenlinien folgen Natural Earth 1:10 Mio.</sup>

## Was der Atlas kann

| | |
|---|---|
| **Zeitregler** | 53 Zeitschnitte, jeder gleich breit; das Epochenband darüber ordnet ein, die Jahresachse darunter zeigt die tatsächliche Zeitspanne |
| **Zeitreise** | Wiedergabetaste läuft alle Epochen durch, mit Überblendung zwischen den Zeitschnitten |
| **Detailtafel** | Steckbrief je Gemeinwesen und Jahr – kuratierte Texte, Angaben aus dem Kartendatensatz, optional ein Wikipedia-Auszug |
| **Nachbarn** | aus der Kartentopologie berechnet und anklickbar: eine Region lässt sich Nachbar für Nachbar erwandern |
| **Vier Einfärbungen** | nach Gemeinwesen, Oberhoheit, Kulturraum oder Genauigkeit des Grenzverlaufs |
| **Suche** | über alle Gemeinwesen des aktuellen Zeitschnitts, deutsch und in der Schreibweise des Datensatzes |
| **Zwei Farbwelten** | „Nachtatlas“ und „Pergament“ |
| **Teilbare Links** | Ausschnitt, Jahr und Auswahl stehen in der Adresszeile: `#position=3.4/48/22&year=1815&ort=Austrian%20Empire` |

Die Karte kommt **ohne Kacheldienst** aus: Küstenlinien, Seen, Flüsse und
historische Grenzen werden als Vektoren gezeichnet. Der Atlas läuft damit
vollständig eigenständig und ohne Verbindung zu Drittanbietern – die einzige
optionale Ausnahme sind die abschaltbaren Wikipedia-Auszüge.

## Wie die Umrisse zustande kommen

Historische Grenzdatensätze bringen ihre eigenen, meist groben Küstenlinien
mit. Damit die Länder trotzdem exakt die Form haben, die sie auf einer
heutigen Weltkarte haben, geht der Atlas einen Umweg:

1. **Die Grenzverläufe werden nicht vereinfacht.** Die Rohdaten enthalten je
   Zeitschnitt 30.000 bis 110.000 Stützpunkte – als quantisiertes TopoJSON
   sind das 30 bis 500 kB je Datei. Jede Ausdünnung wäre sichtbar, ohne
   nennenswert Ladezeit zu sparen.
2. **Gezeichnet wird nicht das Land, sondern das Meer.** `ocean-hd.json` ist
   ein einziges Polygon mit einem Loch je Landmasse, abgeleitet aus Natural
   Earth 1:10 Mio. (rund 300 m Auflösung). Diese Ebene liegt **über** den
   Grenzflächen und schneidet sie exakt an der echten Küstenlinie ab.
3. **Ein schmaler Saum weitet jede Fläche um gut einen Pixel.** Das schließt
   die Lücken, die entstehen, weil die historischen Umrisse nicht ganz bis an
   die heutige Küste reichen. Nach außen schneidet das Meer den Überschuss
   wieder ab.

Der Umweg über das Meer statt eines Zuschnitts jeder einzelnen Epoche ist der
Grund, warum das Ganze schlank bleibt: Beim Zuschneiden trüge jede der 53
Dateien dieselben Küstenpunkte mit sich und wäre rund viermal so groß. So wird
die Küstenlinie genau **einmal** geladen – und die Umrisse sind trotzdem exakt.

Beim Zoomen ins Weltbild genügt eine grobe Küstenlinie (`ocean.json`, 210 kB
gzip); die hochaufgelöste Fassung rückt im Hintergrund nach und wird ab
Zoomstufe 4,2 eingeblendet. Seen und Flüsse werden erst geholt, wenn man die
Ebene einschaltet.

## Schnellstart

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

Die aufbereiteten Kartendaten liegen bereits unter `public/data/` im Repository
(rund 22 MB). Für den Betrieb ist kein Datenbau nötig. Übertragen wird beim
Aufruf nur ein Bruchteil davon: rund 210 kB Küstenlinie, ein Zeitschnitt
(je nach Epoche 15–420 kB gzip) und die Wissensbasis.

```bash
npm run build      # erzeugt dist/
npm run preview    # gebaute Fassung prüfen
```

## Aufbau

```
index.html                 Grundgerüst der Oberfläche
src/
  main.js                  Verdrahtung: Zustand, URL-Hash, Tastatur, Werkzeuge
  modules/
    atlas.js               Leaflet-Karte, Ebenen, Überblendung, Auswahl
    labels.js              Beschriftungsebene mit Kollisionsprüfung
    timeline.js            Zeitleiste, Epochenband, Wiedergabe
    panel.js               Detailtafel
    data.js                Laden, Zwischenspeichern, Nachbarschaftsgraph
    palette.js             Farbvergabe (Kartenfärbungsproblem)
    geo.js, format.js      Geometrie- und Formatierungshelfer
    wikipedia.js           optionale Anreicherung
  styles/                  Design-System, Farbwelten, Bausteine
  data/
    names.de.json          deutsche Bezeichnungen + Schreibvarianten
    knowledge/*.json       redaktionelle Steckbriefe, thematisch getrennt
scripts/
  fetch-sources.mjs        Rohdaten herunterladen (nach data-src/)
  build-data.mjs           Vereinfachen, Anker berechnen, TopoJSON schreiben
  build-knowledge.mjs      Steckbriefe und Namen zusammenführen
  check-knowledge.mjs      Abdeckung der Wissensbasis prüfen
public/data/               erzeugte, ausgelieferte Datensätze
```

### Datenpipeline

Die Rohdaten (rund 70 MB GeoJSON) liegen bewusst **nicht** im Repository.
Neu erzeugen lassen sich die Web-Datensätze so:

```bash
npm run fetch:data    # lädt historical-basemaps + Natural Earth nach data-src/
npm run build:data    # vereinfacht, quantisiert, schreibt public/data/ (~20 s)
npm run build:knowledge
npm run check:data    # Abdeckung je Zeitschnitt
```

`build-data.mjs` erzeugt die Meeresebene aus Natural Earth, berechnet für jedes
Teilstück den **Pol der Unzugänglichkeit** als Beschriftungsanker und die
Fläche aus der Originalquelle. Die Grenzverläufe selbst bleiben unangetastet.

Mit `--kueste <meter>` lässt sich die Auflösung der Küstenlinie ändern
(Vorgabe 300 m, das liegt unter der Pixelgröße der höchsten Zoomstufe):

```bash
npm run build:data -- --kueste 150   # noch feiner, entsprechend größer
```

### Wissensbasis

Die Steckbriefe stehen in `src/data/knowledge/` und sind epochenbezogen
gegliedert: Jeder Eintrag hat mehrere `periods` mit `from`/`to`, sodass zum
Jahr 1000 Basileios II. erscheint und zum Jahr 1300 Andronikos II.

```json
"Byzantine Empire": {
  "kind": "Kaiserreich",
  "wiki": "Byzantinisches Reich",
  "periods": [
    { "from": 800, "to": 1024, "ruler": "Basileios II.",
      "rulerTitle": "Basileus – Kaiser der Rhomäer", "capital": "Konstantinopel",
      "government": "…", "religion": "…", "population": "…", "summary": ["…"] }
  ]
}
```

Stand: **225 Steckbriefe mit 289 Zeitabschnitten**, dazu **829 deutsche
Bezeichnungen** und 103 Schreibvarianten. Damit sind rund **80 % der kartierten
Fläche** über alle Zeitschnitte hinweg redaktionell erschlossen und **97 %**
benannt. `npm run check:data` zeigt die verbleibenden Lücken nach Fläche
sortiert – das ist die Arbeitsliste für weitere Einträge.

Für Gebiete ohne Steckbrief zeigt die Tafel weiterhin die Angaben des
Kartendatensatzes (Fläche, Oberhoheit, Kulturraum, Grenzgüte, Nachbarn) und,
falls aktiviert, einen Wikipedia-Auszug.

## Bedienung

| Taste | Wirkung |
|---|---|
| `←` `→` | einen Zeitschnitt zurück / vor |
| `⇧` + `←` `→` | fünf Zeitschnitte springen |
| `Leertaste` | Zeitreise starten und anhalten |
| `/` oder `S` | Suche |
| `T` | Farbwelt wechseln |
| `E` | Ebenen und Einfärbung |
| `L` | Legende |
| `0` | Ansicht zurücksetzen |
| `Esc` | Tafel oder Fenster schließen |
| `?` | Übersicht der Tastenkürzel |

## Datenquellen

- **Historische Grenzen:** [historical-basemaps](https://github.com/aourednik/historical-basemaps)
  von André Ourednik u. a., lizenziert unter **GPL-3.0**. Die Datensätze unter
  `public/data/epochs/` und `data-src/historical/` sind davon abgeleitet und
  stehen unter derselben Lizenz.
- **Küstenlinien, Inseln, Seen, Flüsse:** [Natural Earth](https://www.naturalearthdata.com/) (1:10 Mio.), gemeinfrei.
- **Ergänzende Kurztexte und Bilder:** deutschsprachige Wikipedia (CC BY-SA 4.0),
  zur Laufzeit nachgeladen und abschaltbar.
- **Redaktionelle Steckbriefe:** für dieses Projekt verfasst.

## Einordnung

Historische Grenzen sind Rekonstruktionen, keine Messwerte. Vor dem
Westfälischen Frieden war die Vorstellung einer durchgezogenen Staatsgrenze in
Europa unüblich; Herrschaft war abgestuft, überlappend und häufiger an Orte und
Personen gebunden als an Flächen. Der Datensatz verzeichnet deshalb eine
Grenzgüte von 1 (grobe Annäherung) bis 3 (völkerrechtlich fixiert) – sichtbar
in der Einfärbung „Grenzgüte“ und als gestrichelte Linien auf der Karte.

Die Quelle bezeichnet sich selbst ausdrücklich als „work in progress“. Für
wissenschaftliche Arbeiten sollten die Grenzverläufe mit Fachliteratur
abgeglichen werden.

Großflächige Sammelbezeichnungen wie „Bantu-Völker“ oder „Australische
Aborigines“ fassen im Datensatz Hunderte eigenständige Gemeinwesen zu einer
Fläche zusammen. Die Steckbriefe weisen darauf hin, wo das der Fall ist.

## Lizenz

Quellcode: MIT. Die abgeleiteten Kartendaten unter `public/data/epochs/`
folgen der GPL-3.0 des Ursprungsdatensatzes.
