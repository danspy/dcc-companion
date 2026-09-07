# Character voice, and the System's own words for items

Date: 2026-09-07. Status: approved in chat, implementation pending.

## Goal

Character pages read in the character's own voice. Item pages open on what the
System actually says about the item, verbatim, before the usage log that exists
today. Nothing about the gate changes: every new piece of text is gated by the
same `sortKey` arithmetic as the text it replaces or precedes.

## Numbers

| | |
|---|---|
| Characters | 47 |
| Character beats to rewrite | 139 (45 origin, 54 arc, 18 fate, 22 use) |
| Prose today | about 22,000 characters |
| Characters with one beat only | 4: Quasar, Beatrice, the Maestro, Vrah |
| Items | 11 |

## 1. The frame: confessional to camera

Each character beat becomes the character speaking to the show's camera **at the
moment the beat happens**. Donut at 1:7 has just put on a crown she was told to
read first, and knows nothing after that.

This is the discipline the gate already demands. A voice speaking from its own
timestamp cannot point forward, so the forward-phrase and forward-reference lints
become easier to satisfy, not harder. The frame is generic show format and names
nobody: an interview frame with a named host would print a gated character's name
on every page from book 1.

Alternatives set aside: an interview frame (leaks the host), and a voiced intro
paragraph with narrator beats below it (cheaper, not what was asked for).

## 2. Three voices

| voice | who speaks | where |
|---|---|---|
| `self` | the character, first person, present tense, in their register | default for every beat of a character who has a `voiceNote` |
| `system` | the AI, in the mono `*** ... ***` register the seals already use | every `fate` beat; whole pages for characters the book gives too few lines to voice honestly |
| `narrator` | the wry third person that exists today | items, mechanics, factions, threads; any beat explicitly marked so |

A character speaks for themself only once a `voiceNote` exists. Until then the narrator
keeps the whole page, fate included, so the half-converted cast never shows third-person
prose behind a quotation mark; the lint's "no voice note" warning is the migration queue.
(Refined after the proof batch: the first version defaulted every character to `self`, and
the cast list showed 42 narrator taglines as if spoken.)

A dead crawler does not narrate their own death, and a notice from the dungeon is
exactly how a death is reported in the crawl. So fates are `system` by default and
`self` on a fate is a lint error.

A character with too little dialogue to voice honestly is marked `system` once, at
the entity level, and their page reads as the showrunner's dossier. Mixing voices
inside one page is avoided except for the fate.

**Taglines follow the voice.** A character's tagline is their opening line, so the
cast list on `/who` becomes a chorus. Progressive taglines stay progressive.

**Headlines stay as they are.** They are episode captions: chrome, not prose.

## 3. Data model

### Curation JSON (`data/entities/characters.json`)

```json
{
  "id": "princess-donut",
  "voice": "self",
  "voiceNote": "Imperious, delighted by herself, wounded by any slight. Says CARL. Refers to her own titles in full. Never swears; finds swearing common.",
  "beats": [
    { "kind": "arc",  "at": "1:7", "text": "..." },
    { "kind": "fate", "at": "8:end", "voice": "system", "text": "..." }
  ]
}
```

- `voice` on a **character**: `self` or `system`. When absent, `self` if a `voiceNote` exists,
  otherwise `narrator`. Not allowed on other kinds.
- `voiceNote` on a character: two or three lines for whoever writes in that voice next.
  Committed, because it is editorial guidance, and dropped from the snapshot, because
  it is not content.
- `voice` on a **beat**: `self | system | narrator`, optional. The build resolves the
  effective voice so no view has to know the defaults.

### Curation JSON (`data/entities/items.json`)

```json
{
  "id": "enhanced-pet-biscuit",
  "description": "Enhanced Pet Biscuit. So, it looks like a regular pet biscuit. It's not. Feed to your pet at your own risk. What's the worst that can happen?"
}
```

or, for an item whose text changes when it is upgraded (tags illustrative):

```json
"description": [
  { "at": "6:12", "source": "6:12", "text": "..." },
  { "at": "7:40", "source": "7:40", "text": "..." }
]
```

- A bare string means "safe from `revealedAt`", the same convention taglines use.
  `source` defaults to `at`. The text is the System's verbatim description, quoted
  short and attributed by book and chapter. `description` is allowed on any kind,
  because the System also describes people; it is only required work for items.

### Effective voice (resolved in the build)

```
entityVoice(e)  = e.kind === 'character' ? (e.voice ?? (e.voiceNote ? 'self' : 'narrator')) : 'narrator'
beatVoice(e, b) = b.voice
               ?? (e.kind === 'character' && b.kind === 'fate' && entityVoice(e) !== 'narrator'
                     ? 'system' : entityVoice(e))
```

This lives in `scripts/lib/voice.mjs`, a pure module like `gate.mjs`, so
`npm run test:gate` can drive it.

### Snapshot and DB

- `Entity` gains `voice` (text, default `narrator`) and `descriptions` (json,
  default `[]`, entries `{ at, sortKey, source, text }` with
  `sortKey = max(parseAt(at), parseAt(entity.revealedAt))`, sorted ascending).
- `Beat` gains `voice` (text, default `narrator`), already resolved.
- `db/seed.ts` passes both through. `voiceNote` never reaches the snapshot.

## 4. Lint (`scripts/lib/lint.mjs`)

Errors:

- unknown `voice` value on an entity or a beat
- `voice: self` on a non-character, at either level
- a `fate` beat whose effective voice is `self`

Warnings:

- a character whose effective voice is `self` and who has no `voiceNote`
- a `description.at` earlier than the entity's `revealedAt`, which is floored to the
  entity's reveal point the way a beat is

Unchanged:

- forward phrasing and forward references apply to every beat and tagline exactly as
  now, in every voice

Quotations are a different category of text from summaries. A `description` entry is
a verbatim quotation of something the reader has already seen in the book, so it
**skips the forward-phrase heuristic and keeps the forward-reference check**. That
is a rule about a category, not an exemption list for entries; the deliberate
absence of an exemption list for summaries stands.

## 5. Rendering

`src/pages/entity/[id].astro`:

- `self` beat: the text renders as spoken prose with a gold opening quotation mark;
  headline and stamp unchanged.
- `system` beat: the text renders in the System block (mono, `*** headline ***`).
  No `kind` label anywhere, as before.
- `narrator` beat: unchanged.
- `descriptions`, when non-empty: a System block above "Where it's used", showing
  the latest description the reader has reached (`descriptionFor()`, mirroring
  `taglineFor()`), with a `Bk b · c` source stamp.

`src/pages/who.astro`: a character with voice `self` shows their tagline with the
same spoken styling. Nothing else changes; sealed collapse and redaction are as they
were, so structure leaks nothing new.

`src/lib/content.ts` gains `descriptionFor(entity, gate)`.

## 6. Production

Voice is subjective, so the reader hears it before the bulk is written.

1. **Proof batch, the Royal Court**: Carl, Princess Donut, Mordecai, Katia, Mongo.
   Voice sheets first, then their beats and taglines. Mongo speaks like Mongo.
   Reviewed by the owner before anything else is rewritten.
2. **Then the rest in book order**, one book per commit, reading that book's chapter
   summaries once per pass.
3. Every rewritten beat and every quoted description is `confidence: draft` until
   checked against the book.
4. **Items**: three descriptions in the proof batch (Enhanced Pet Biscuit, the Ring
   of Divine Suffering, the Tiara of a Thousand Lights, all quoted on the wiki with
   chapter citations), the remaining eight afterwards. The Crown has no wiki
   quotation and needs the book.

After a writing pass: `grep -nE "the series|the books?|books? (before|after)|the reader"`
over `data/entities/`, as the CLAUDE.md already asks.

## 7. Testing

- `npm run test:gate`: new cases for `voice.mjs` (defaults per kind, fate default,
  explicit override) and for each new lint rule (error and pass case), plus the
  quotation exemption (a description containing "later" passes, a tagline containing
  "later" still fails).
- `npm run content:check`, `npm run check`, and a build against a throwaway DB, all
  green.
- Manual: open Donut's page at positions book 0, `1:6`, `1:7`, `1:end` and confirm the
  voiced text appears only from `1:7`, the fate collapses into the sealed count, and
  the description block on the Pet Biscuit page appears from `1:5`.

## Out of scope

Images and the System-card visuals (separate design). Accounts. Voice for
non-character kinds. Rewriting headlines.
