# Design System Brief — Ward Academy
### AI-Powered 1:1 English Learning Platform for Children (ages 9–13)

> ## ⚠️ LANGUAGE & DIRECTION — READ FIRST (this supersedes any earlier language note)
> - **Converse with me (the founder) in ARABIC.** This brief is written in English only so you read it precisely.
> - **The product is bilingual and direction-aware. Design the system for BOTH RTL and LTR from the start — not LTR only.**
>   - **Parent/Guardian-facing surfaces** (landing page, registration, parental consent, booking, guardian dashboard, "Bloom Reports") **and the Teacher workspace** → **Arabic, RTL** as the default. (The landing page additionally offers an **EN toggle**, since the primary customer is a native Arabic speaker.)
>   - **The Child's learning surface** (homework, exercises, in-session content) → **English, LTR** (immersion — the child is learning English).
> - Use **logical CSS properties** (`margin-inline`, `padding-inline`, `start`/`end`), mirror layouts and directional icons for RTL, and design a clean **language toggle**. **Never hard-code left/right.**
> - Pair an **Arabic-friendly typeface** (e.g., IBM Plex Sans Arabic / Cairo / Tajawal) with an English face.

> **Core identity concept:** The Platycodon (balloon flower) is the **hero and base of the brand** — representing the child and their growth. The AI is a **secondary "spark" that emanates / emerges from the flower** (a "smart flower" emitting small AI sparkles) — supporting and illuminating, but **never surrounding, dominating, or replacing** it. Reflect: **the child/human at the center, technology emerging to support them.** (The brand name "Ward" means *flowers* in Arabic — lean into this harmony.)

---

## 1. The Star & Spark (the AI layer)

Make the "spark" the consistent visual signature for every moment the AI steps in, so the user always knows when technology helped.

**Where the spark appears:** auto-graded homework; a newly generated quiz/exercise; a written parent report or teacher summary; a hint or encouragement offered to the child.

**Spark states (one component, multiple states):** *Idle* — soft calm shimmer; *Thinking/Active* — gentle pulse/rotation (doubles as loading indicator); *Success* — quick sparkle on completion.

**System-wide uses:** the AI assistant's chat avatar; a small badge beside any AI-generated content; the unified loading indicator platform-wide.

**Principle (logo direction):** the **flower is the hero of the mark**; the spark is **secondary and emerges from the flower** (e.g., small sparkles rising or radiating from its petals or center) — it must **never surround, overpower, or replace** the flower as the dominant shape. Derive the spark's color from the brightest point of the brand's purple palette.

---

## 2. Symbolic Meaning → Design Decisions

- **Eternal love & loyalty → the 1:1 relationship & continuity:** frame the teacher as a "gardener" nurturing growth over time; show the journey's continuity (attendance streaks, session sequences, a growth timeline) rather than isolated wins; warm, long-term tone.
- **Sincerity & honesty → transparency:** parent reports are **"Bloom Reports"** — candid, showing real growth and areas needing support without sugarcoating; assessments presented clearly and credibly.
- **Gentleness & softness → interaction tone:** correct mistakes kindly and encouragingly, never punitively; calm colors and motion; friendly, non-discouraging error messages.

---

## 3. Interaction & Gamification

- **Five petals = five skills:** map each petal to a language skill (Listening, Speaking, Reading, Writing, Vocabulary/Confidence). On the child's dashboard their own flower appears; each petal fills as they progress. A fully bloomed flower = balanced mastery.
- **Bud to bloom:** closed bud (beginning) → inflated balloon (building confidence) → bloom (mastery), as visual states for skill/unit progress.
- **The "pop!" moment:** the balloon-bud burst as a delightful reward animation on task completion.
- **Garden of achievements:** each completed unit grows a new flower in the child's personal garden.
- **Seasons of growth:** present the curriculum as "growth seasons" (a warm layer over levels).
- **Certificates, levels & badges:** earnable certificates and visible levels/badges at meaningful milestones — ages 9–13 respond strongly to recognition and "leveling up."
- **Micro-interactions:** the spark accompanies every AI intervention, integrating the gamification and AI layers into one harmonious experience.

---

## Color

- **The PRIMARY / hero color is PURPLE (violet) — fixed and non-negotiable.** The Platycodon flower is purple, so purple must be the **dominant** brand color across the entire system. **Do NOT make blue — or any other color — the primary.** (An earlier attempt wrongly made blue the primary; purple leads.)
- **You, the designer, decide the entire rest of the palette yourself** — supporting colors, any gradient (purple-led), accents, success/warning states, and neutrals — using your own design judgment to best express the identity. **No other colors are prescribed; do not ask me for suggestions.**
- Target mood: calm, dreamy, trustworthy, warm, child-appropriate without being overly childish. **Ensure every color meets readable contrast on its background** (accessibility).

Keep the white flower a repeatable iconic element (icons, petal-shaped progress indicators, achievement badges).

## Visual Style & Mood
Aim for a **playful, warm, joyful** aesthetic in the garden/blooming spirit: soft rounded shapes, **pill-shaped buttons**, gentle **purple-led gradients**, friendly illustration and a charming brand character/mascot **derived from the flower**, and light **gamification cues** (earned stars, levels, badges). Soft, airy backgrounds; purple as the hero.

**Critical age calibration — for ages 9–13, NOT 4–8:** warm and fun but **more mature and capable, not babyish**. Avoid overly cartoonish/cutesy mascots, baby talk, or a toddler feel. Aim for *"a delightful app a confident 9–13-year-old is proud to use,"* while the **parent** (who registers and pays) finds it **trustworthy and credible**. Do **not** imitate any specific competitor's branding — treat external references as mood direction only.

---
---

# Product-Grounding Additions (make the system fit the real platform)

## 4. Four Audiences — One Identity, Four Tones
The flower/spark identity and palette **unify** the whole product, but tone and density **differ** per surface:
- **Admin / Operations (`/admin`):** the operator's console — efficient, neutral, data-dense. Owns the pre-learning **funnel** (registration → booking → placement → intro session → account creation) and ongoing operations (monthly invoices, cases, periodic evaluations, watching teacher schedules). Pipeline/stepper patterns, tables, status badges; identity shows only lightly. Use **semantic colours** (green = done/success, apricot = next-step, rose = gentle errors/delete — never harsh red), not purple-only.
- **Teacher workspace (the most-used teaching surface):** efficient, fast, professional, information-dense. **It is a productivity tool, not a garden** — minimal clicks, clear forms, quick review/approve, plus the teacher sets her **own availability**. The identity shows lightly (palette, spark), not heavy gamification.
- **Guardian:** clarity, warmth, trust. Read-only. "Bloom Reports" candid and easy to understand.
- **Child (ages 9–13):** playful, achievement-driven, and capable — the flower/garden/petals and earnable rewards; digitally fluent, so interactions can be real (not babyish).

> **Direction:** Admin, Teacher, and Guardian surfaces are **Arabic / RTL**; the Child surface is **English / LTR**. All four are **mobile-first** (verified on a phone, with a bottom nav on the responsive shells).

## 5. Make the AI Trust Model Visible — "Draft" vs "Teacher-Approved"
Core product rule: **every AI output is a DRAFT the teacher reviews and approves before it reaches the child or parent.**
- The spark marks AI involvement (Section 1).
- **Add a clear visual distinction** between *"AI draft — pending teacher approval"* and *"Teacher-approved / verified."*
This embodies the promise — **AI assists, the human guarantees** — and is central to parent trust.

## 6. Surface Inventory (design the system to cover these real screens)
- **Public:** bilingual landing page; registration + parental consent; free-trial booking; placement test.
- **Admin / Operations:** dashboard (funnel metrics + at-risk list); registrations list + detail with a pipeline stepper; placement-test generate/approve; AI intro-session report (draft → review → send); account provisioning + teacher assignment; monthly invoices; cases/complaints; periodic evaluations; teachers list + per-teacher page with a **read-only month calendar** of the teacher's schedule (allocated / booked / remaining as colour areas).
- **Teacher:** roster/dashboard; create homework (AI-generated path + manual path); review & approve AI output; grade; session-report form; per-student progress; **own availability editor** (weekly rules + exceptions).
- **Child:** do homework (multiple-choice/fill/match/true-false, short & open writing, voice recording); see assignments; personal flower/progress.
- **Guardian:** read-only dashboard (supports **multiple children** under one account); Bloom Reports.

## 7. Target Audience & Age Calibration (ages 9–13)
The platform targets a deliberately tight **sweet spot: children aged 9–13** — *not* the very young (6–8, who need constant parental hand-holding) and *not* teens (14–18, harder to motivate, different agendas). Design with confidence for this group's traits:
- **Aware & independent enough:** they read and follow instructions and work without constant adult help — the child UI can use real text instructions and slightly richer interactions, not icons alone.
- **Pre-teen & enthusiastic:** keep it **friendly, energetic, and rewarding — not babyish** (they are past the 6–8 stage) and **not pseudo-teen** (avoid edgy/adolescent styling). Aim for *"a capable, fun app a 9–13-year-old is proud to use."*
- **Achievement-driven:** they respond strongly to points, levels, badges, and certificates — so **embrace the gamification/achievement layer confidently** (the flower, garden, seasons, streaks, and earnable certificates fit this age perfectly).
- **Digitally fluent:** comfortable with a real app — no need to over-simplify; keep cognitive load low, but interactions can be genuine.
- **Prime language-acquisition window:** scientifically the best age for a second language — make the experience encouraging and confidence-building, reinforcing visible progress and frequent small wins.

## 8. Accessibility & Technical Constraints
- **Mobile-first.** Full **RTL + LTR** via logical properties.
- **Sufficient text contrast** over the brand colors and any gradient; child-appropriate font sizes; **large tap targets**.
- **Lightweight animations**; respect `prefers-reduced-motion`; delight without performance cost (some users are on modest devices/connections).

## 9. Coherence with the Product Data Model
- **"Five petals = five skills"** must map onto the platform's **objective/CEFR progress model** (skills aggregate underlying tagged objectives) — don't invent a parallel taxonomy the data can't feed.
- **"Growth seasons"** is a warm presentation layer **over real CEFR levels**, not a replacement — it must map to actual levels underneath.
- The **"Speaking" petal reflects teacher assessment** — the platform does **not** auto-score pronunciation in v1 (voice = completion credit + the teacher listens).
- **Bloom Reports honesty** = show real numbers ("6 of 8"), never inflated mastery percentages. **Completion marks** (e.g., a submitted voice recording) are shown **separately** from performance and never inflate the bloom.

## 9b. Progress Logic (reference card — dual-track)
Two layers, **not** alternatives, both read from the **same data** (mastered tagged objectives) so they never contradict:

- **Five petals = five skills (cross-sectional "what"):** Listening, Speaking, Reading, Writing, Vocabulary (fixed legal order). Each petal fills from the **% of mastered objectives** in that skill — **not** raw scores and **not** plan-completion. Speaking = **teacher assessment only** (no auto pronunciation scoring). **Completion** (e.g., a submitted recording) is counted **separately** and never fills a petal. The flower is the **slower, big-picture** snapshot.
- **bud → balloon → bloom (longitudinal "how far"):** three visual states of **one unit/task** progressing (bud = start, balloon = building, bloom = mastered → "pop!"). This is the **fast daily hero** the child sees move within days.
- **How they connect:** each mastered unit pushes objectives that fill the matching petal — the same visual language at two scales.

**Dual-track scope (critical):**
- **Petals (skills)** and **bud→bloom (unit)** work **identically** in both tracks — fed by objectives tagged on the homework, whether the source is CEFR or the school textbook.
- Only the flower's **cumulative scope** differs: **CEFR track → the level/season** (A1, A2…); **school track → the textbook / term**, *not* a CEFR season.

**Child-surface rhythm:** the **unit's bud→bloom is the prominent, animated daily hero**; the five-petal flower is a **quieter, smaller background snapshot** (label its slow pace honestly, e.g., "grows slowly across the season") so the child is never left waiting on petals.

## 10. Scope Discipline
**Define the full identity system now** (colors, spark, flower, components, tone, both text directions). But **implement only the gamification subset the v1 screens actually need** — don't build the whole garden/seasons before the core platform works.
