import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// The night's three bells as a calendar: every weekday, in New York time. No account, nothing to install.
// Exchange holidays are not taken out; on those days the bells simply do not ring.

const TZ = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const EVENTS = [
  { id: "close", at: "160000", end: "161500", title: "ANGELUS · Closing bell: calls open", text: "Wall Street closes; the tokens keep trading. Tonight's Bell starts to move and calls open until 04:00 ET." },
  { id: "lock", at: "040000", end: "041500", title: "ANGELUS · The lock (04:00 ET)", text: "Every number for the morning is frozen, published and sealed on Robinhood Chain." },
  { id: "open", at: "093000", end: "094500", title: "ANGELUS · Opening bell: the Bell is graded", text: "The official open settles every Bell. The miss goes on the public record." },
];

/** RFC 5545 text escaping and 75-octet line folding. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fold = (line: string) => {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); }
  out.push(s);
  return out.join("\r\n");
};

export function GET() {
  const stamp = "20261120T000000Z";
  const first = "20261116"; // a Monday: each series starts here and repeats every weekday
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ANGELUS//The night's bells//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ANGELUS · the night's bells",
    "X-WR-TIMEZONE:America/New_York",
    ...TZ,
    ...EVENTS.flatMap((e) => [
      "BEGIN:VEVENT",
      // stable across domains, so a calendar that subscribed once never gets the events twice
      `UID:angelus-${e.id}@useangelus`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/New_York:${first}T${e.at}`,
      `DTEND;TZID=America/New_York:${first}T${e.end}`,
      "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(`${e.text}\n\n${SITE_URL}`)}`,
      `URL:${SITE_URL}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="angelus-bells.ics"', "cache-control": "public, max-age=86400" },
  });
}
