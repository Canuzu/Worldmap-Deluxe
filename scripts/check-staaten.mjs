#!/usr/bin/env node
/**
 * Prüft, ob die Gegenwartszeitschnitte alle Staaten der Welt enthalten.
 *
 * Anlass: Der Ursprungsdatensatz führt für 2010 nur 193 Namen und lässt
 * 20 Mitgliedstaaten der Vereinten Nationen ganz aus – überwiegend Klein-
 * und Inselstaaten. Schwerer wog die Schweiz: Sie stand dort nur noch als
 * entartete Fläche von 0 km², das ganze Land war unbeanspruchtes Land.
 * Solche Lücken fallen beim Betrachten der Weltkarte nicht auf, weil
 * unbeanspruchtes Land in der Landfarbe erscheint und damit aussieht wie
 * ein Staat ohne Beschriftung.
 *
 * Geprüft werden die 193 Mitgliedstaaten und die beiden Beobachterstaaten.
 * Zusätzlich fallen Gemeinwesen auf, deren Fläche unter 1 km² liegt – das
 * sind entartete Geometrien der Quelle, keine Kleinstaaten.
 *
 * Aufruf: npm run check:staaten
 */
import fs from 'node:fs';

// Die 193 Mitgliedstaaten der Vereinten Nationen, dazu die beiden
// Beobachterstaaten (Heiliger Stuhl, Palästina). Schlüssel: deutscher Name,
// Wert: die Schreibweisen, unter denen der Kartendatensatz sie führen könnte.
const UN = {
  'Afghanistan': ['Afghanistan'],
  'Ägypten': ['Egypt'],
  'Albanien': ['Albania'],
  'Algerien': ['Algeria'],
  'Andorra': ['Andorra'],
  'Angola': ['Angola'],
  'Antigua und Barbuda': ['Antigua and Barbuda'],
  'Äquatorialguinea': ['Equatorial Guinea'],
  'Argentinien': ['Argentina'],
  'Armenien': ['Armenia'],
  'Aserbaidschan': ['Azerbaijan'],
  'Äthiopien': ['Ethiopia'],
  'Australien': ['Australia'],
  'Bahamas': ['Bahamas'],
  'Bahrain': ['Bahrain'],
  'Bangladesch': ['Bangladesh'],
  'Barbados': ['Barbados'],
  'Belarus': ['Belarus', 'Byelarus'],
  'Belgien': ['Belgium'],
  'Belize': ['Belize'],
  'Benin': ['Benin'],
  'Bhutan': ['Bhutan'],
  'Bolivien': ['Bolivia'],
  'Bosnien und Herzegowina': ['Bosnia and Herzegovina', 'Bosnia and Herzegowina'],
  'Botswana': ['Botswana'],
  'Brasilien': ['Brazil'],
  'Brunei': ['Brunei', 'Brunei Darussalam'],
  'Bulgarien': ['Bulgaria'],
  'Burkina Faso': ['Burkina Faso'],
  'Burundi': ['Burundi'],
  'Chile': ['Chile'],
  'China': ['China'],
  'Costa Rica': ['Costa Rica'],
  'Dänemark': ['Denmark'],
  'Deutschland': ['Germany'],
  'Dominica': ['Dominica'],
  'Dominikanische Republik': ['Dominican Republic'],
  'Dschibuti': ['Djibouti'],
  'Ecuador': ['Ecuador'],
  'El Salvador': ['El Salvador'],
  'Elfenbeinküste': ["Cote d'Ivoire", 'Ivory Coast', "Côte d'Ivoire"],
  'Eritrea': ['Eritrea'],
  'Estland': ['Estonia'],
  'Eswatini': ['Eswatini', 'Swaziland'],
  'Fidschi': ['Fiji'],
  'Finnland': ['Finland'],
  'Frankreich': ['France'],
  'Gabun': ['Gabon'],
  'Gambia': ['Gambia', 'The Gambia', 'Gambia, The'],
  'Georgien': ['Georgia'],
  'Ghana': ['Ghana'],
  'Grenada': ['Grenada'],
  'Griechenland': ['Greece'],
  'Guatemala': ['Guatemala'],
  'Guinea': ['Guinea'],
  'Guinea-Bissau': ['Guinea-Bissau'],
  'Guyana': ['Guyana'],
  'Haiti': ['Haiti'],
  'Honduras': ['Honduras'],
  'Indien': ['India'],
  'Indonesien': ['Indonesia'],
  'Irak': ['Iraq'],
  'Iran': ['Iran'],
  'Irland': ['Ireland'],
  'Island': ['Iceland'],
  'Israel': ['Israel'],
  'Italien': ['Italy'],
  'Jamaika': ['Jamaica'],
  'Japan': ['Japan'],
  'Jemen': ['Yemen'],
  'Jordanien': ['Jordan'],
  'Kambodscha': ['Cambodia'],
  'Kamerun': ['Cameroon'],
  'Kanada': ['Canada'],
  'Kap Verde': ['Cape Verde', 'Cabo Verde'],
  'Kasachstan': ['Kazakhstan'],
  'Katar': ['Qatar'],
  'Kenia': ['Kenya'],
  'Kirgisistan': ['Kyrgyzstan'],
  'Kiribati': ['Kiribati'],
  'Kolumbien': ['Colombia'],
  'Komoren': ['Comoros'],
  'Kongo (Republik)': ['Congo', 'Republic of the Congo'],
  'Kongo (Demokratische Republik)': ['Zaire (DR Congo)', 'Democratic Republic of the Congo', 'DR Congo', 'Zaire'],
  'Kroatien': ['Croatia'],
  'Kuba': ['Cuba'],
  'Kuwait': ['Kuwait'],
  'Laos': ['Laos', 'Lao PDR'],
  'Lesotho': ['Lesotho'],
  'Lettland': ['Latvia'],
  'Libanon': ['Lebanon'],
  'Liberia': ['Liberia'],
  'Libyen': ['Libya'],
  'Liechtenstein': ['Liechtenstein'],
  'Litauen': ['Lithuania'],
  'Luxemburg': ['Luxembourg'],
  'Madagaskar': ['Madagascar'],
  'Malawi': ['Malawi'],
  'Malaysia': ['Malaysia'],
  'Malediven': ['Maldives'],
  'Mali': ['Mali'],
  'Malta': ['Malta'],
  'Marokko': ['Morocco'],
  'Marshallinseln': ['Marshall Islands'],
  'Mauretanien': ['Mauritania'],
  'Mauritius': ['Mauritius'],
  'Mexiko': ['Mexico'],
  'Mikronesien': ['Micronesia', 'Federated States of Micronesia'],
  'Moldau': ['Moldova'],
  'Monaco': ['Monaco'],
  'Mongolei': ['Mongolia'],
  'Montenegro': ['Montenegro'],
  'Mosambik': ['Mozambique'],
  'Myanmar': ['Myanmar', 'Burma'],
  'Namibia': ['Namibia'],
  'Nauru': ['Nauru'],
  'Nepal': ['Nepal'],
  'Neuseeland': ['New Zealand'],
  'Nicaragua': ['Nicaragua'],
  'Niederlande': ['Netherlands'],
  'Niger': ['Niger'],
  'Nigeria': ['Nigeria'],
  'Nordkorea': ["Korea, Democratic People's Republic of", 'North Korea'],
  'Nordmazedonien': ['North Macedonia', 'Macedonia'],
  'Norwegen': ['Norway'],
  'Oman': ['Oman'],
  'Österreich': ['Austria'],
  'Osttimor': ['Timor-Leste', 'East Timor', { seit: 2002 }],
  'Pakistan': ['Pakistan'],
  'Palau': ['Palau'],
  'Panama': ['Panama'],
  'Papua-Neuguinea': ['Papua New Guinea'],
  'Paraguay': ['Paraguay'],
  'Peru': ['Peru'],
  'Philippinen': ['Philippines'],
  'Polen': ['Poland'],
  'Portugal': ['Portugal'],
  'Ruanda': ['Rwanda'],
  'Rumänien': ['Romania'],
  'Russland': ['Russia'],
  'Salomonen': ['Solomon Islands'],
  'Sambia': ['Zambia'],
  'Samoa': ['Samoa'],
  'San Marino': ['San Marino'],
  'São Tomé und Príncipe': ['Sao Tome and Principe', 'São Tomé and Príncipe'],
  'Saudi-Arabien': ['Saudi Arabia'],
  'Schweden': ['Sweden'],
  'Schweiz': ['Switzerland'],
  'Senegal': ['Senegal'],
  'Serbien': ['Serbia'],
  'Seychellen': ['Seychelles'],
  'Sierra Leone': ['Sierra Leone'],
  'Simbabwe': ['Zimbabwe'],
  'Singapur': ['Singapore'],
  'Slowakei': ['Slovakia'],
  'Slowenien': ['Slovenia'],
  'Somalia': ['Somalia'],
  'Spanien': ['Spain'],
  'Sri Lanka': ['Sri Lanka'],
  'St. Kitts und Nevis': ['Saint Kitts and Nevis'],
  'St. Lucia': ['Saint Lucia'],
  'St. Vincent und die Grenadinen': ['Saint Vincent and the Grenadines'],
  'Südafrika': ['South Africa'],
  'Sudan': ['Sudan'],
  'Südkorea': ['Korea, Republic of', 'South Korea'],
  'Südsudan': ['South Sudan', { seit: 2011 }],
  'Suriname': ['Suriname'],
  'Syrien': ['Syria'],
  'Tadschikistan': ['Tajikistan'],
  'Tansania': ['Tanzania', 'Tanzania, United Republic of'],
  'Thailand': ['Thailand'],
  'Togo': ['Togo'],
  'Tonga': ['Tonga'],
  'Trinidad und Tobago': ['Trinidad', 'Trinidad and Tobago'],
  'Tschad': ['Chad'],
  'Tschechien': ['Czechia', 'Czech Republic'],
  'Tunesien': ['Tunisia'],
  'Türkiye': ['Türkiye', 'Turkey'],
  'Turkmenistan': ['Turkmenistan'],
  'Tuvalu': ['Tuvalu'],
  'Uganda': ['Uganda'],
  'Ukraine': ['Ukraine'],
  'Ungarn': ['Hungary'],
  'Uruguay': ['Uruguay'],
  'Usbekistan': ['Uzbekistan'],
  'Vanuatu': ['Vanuatu'],
  'Venezuela': ['Venezuela'],
  'Vereinigte Arabische Emirate': ['United Arab Emirates'],
  'Vereinigte Staaten': ['United States'],
  'Vereinigtes Königreich': ['United Kingdom'],
  'Vietnam': ['Vietnam', 'Viet Nam'],
  'Zentralafrikanische Republik': ['Central African Republic'],
  'Zypern': ['Cyprus'],
  // Beobachterstaaten
  'Vatikanstadt (Heiliger Stuhl)': ['Vatican City', 'Holy See', 'Vatican'],
  'Palästina': ['Palestine'],
};

const JAHRE = process.argv.length > 2
  ? process.argv.slice(2)
  : ['1994', '2000', '2010', '2015', '2026'];

let fehlerGesamt = 0;

for (const jahr of JAHRE) {
  const t = JSON.parse(fs.readFileSync(`public/data/epochs/ad${jahr}.json`, 'utf8'));
  const key = Object.keys(t.objects)[0];
  const eigenschaften = t.objects[key].geometries.map((g) => g.properties).filter(Boolean);
  const namen = new Set(eigenschaften.map((p) => p.n).filter(Boolean));

  const fehlen = [];
  for (const [de, eintrag] of Object.entries(UN)) {
    // Ein Eintrag darf als letztes Element { seit: <Jahr> } führen: Vor
    // diesem Jahr gab es den Staat nicht, und sein Fehlen ist richtig.
    const seit = eintrag.find((v) => typeof v === 'object')?.seit;
    if (seit != null && Number(jahr) < seit) continue;
    const varianten = eintrag.filter((v) => typeof v === 'string');
    if (!varianten.some((v) => namen.has(v))) fehlen.push(de);
  }

  // Eine Fläche von 0 km² ist keine Kleinstaatlichkeit, sondern eine
  // entartete Geometrie – San Marino hat 61 km², der Vatikan 0,49.
  const entartet = eigenschaften.filter((p) => p.n && (p.a ?? 0) < 0.4).map((p) => p.n);

  const gut = fehlen.length === 0 && entartet.length === 0;
  fehlerGesamt += fehlen.length + entartet.length;
  console.log(
    `${gut ? '✓' : '✗'} ${jahr}   ${String(namen.size).padStart(3)} Gemeinwesen   `
    + `${Object.keys(UN).length - fehlen.length}/${Object.keys(UN).length} UN-Staaten und Beobachter`,
  );
  for (const f of fehlen) console.log('       fehlt:', f);
  for (const e of entartet) console.log('       entartete Fläche:', e);
}

console.log(fehlerGesamt
  ? `\n${fehlerGesamt} Beanstandung(en).`
  : `\nAlle ${Object.keys(UN).length} Staaten in allen ${JAHRE.length} Gegenwartszeitschnitten vorhanden.`);
process.exit(fehlerGesamt ? 1 : 0);
