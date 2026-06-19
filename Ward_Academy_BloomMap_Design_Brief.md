# Design Brief — The Bloom Map (خريطة التفتّح)
### An addendum to the Ward Academy Design System Brief — read §3 (Interaction & Gamification), §9 and §9b (Progress Logic) of that brief first.

> **Converse with me in Arabic. This brief is written in English only so you read it precisely.**
> The **Bloom Map** is the visual heart of *progress* in Ward Academy. I want to **understand it by seeing it** — so design it as a real, coherent system we could drop straight into the live product (child, teacher, and guardian surfaces), not abstract art. Ground every visual in the real mechanics in §2 below; **do not invent numbers, percentages, or skills.**

---

## 0. Ward Academy in one breath
AI‑supported **1:1 English tutoring for children aged 9–13** (with their guardian and a single teacher). The **Platycodon (balloon flower)** is the **hero and base of the brand** — it represents *the child and their growth*. The AI is a **secondary "spark"** that emerges *from* the flower (supporting, never surrounding or replacing it). **Purple is the hero color**; use **semantic accents** — green = mastery/done, apricot = warmth/next‑step, rose = gentle/limited — **never purple‑only**. Calm, warm, capable; *delightful but not babyish*.

---

## 1. The core idea — what the Bloom Map is
The **Bloom Map** is *how a learner's mastery is made visible — honestly — at every scale*. It unifies two ideas already in the product (Design Brief §9b), which must **read from the same real data so they never contradict**:

- **Five petals = five skills:** Listening, Speaking, Reading, Writing, Vocabulary (this is the **fixed legal order**).
- **bud → balloon → bloom:** the three visual states of a **single learning objective / unit** progressing (bud = just started, balloon = building, bloom = mastered → the joyful **"pop!"**).

Think of it as a **map of a garden**: the curriculum is a path of units → lessons; each lesson blooms as it's mastered; the flower (5 petals) is the big‑picture snapshot of the whole skill balance.

---

## 2. The exact mechanics (your visuals must reflect these)
- The curriculum is a **study plan = units → lessons**. **Each lesson is one objective**, tagged with **exactly one skill** + its **unit** + a **level** (CEFR sub‑level, or a school‑textbook reference).
- A learner practices an objective through homework. **Honest tallies** (attempts / correct) drive that objective's **stage**: bud → balloon → bloom. "Mastered" = reached **bloom**.
- **Each petal fills from the *percentage of mastered objectives* in that skill** — **not** raw scores, **not** plan‑completion.
- The **flower** = the five petals together. A **fully and *evenly* bloomed** flower = balanced mastery **within the current scope**.
- **Scope** differs by track: **CEFR → the level/"season"** (A1, A2…); **school → the textbook / term**. Show this as a small **scope chip**.
- **Honesty over inflation:** show real counts like **"6 of 8"**, never a falsely precise percentage. **Completion marks** (e.g. a submitted voice recording) are tracked **separately** and **never fill a petal**.
- **Speaking** is filled by **teacher assessment only** (no automatic pronunciation scoring in v1).
- **Assessments** at **unit / term / whole‑plan** milestones confirm or raise mastery.
- The **spark** marks any moment the AI helped (a draft, a hint, an auto‑grade) — and there is a clear **"AI draft → teacher‑approved"** distinction, because the human always guarantees what reaches the child/parent.
- Daily rhythm: the **unit's bud→bloom is the fast, animated hero**; the **five‑petal flower is the slower, quieter snapshot** (label its slow pace honestly).

---

## 3. The deliverable — design the Bloom Map across its three surfaces
Represent it **as if seen inside Ward Academy** — real screens and states, **mobile‑first**, with direction noted per surface.

### A) The Child surface (`/learn`) — **English / LTR** (immersion). Playful, achievement‑driven, *capable not babyish*.
- **The flower:** the five petals with unmistakable states — *unopened → half‑open → bloomed* — and a read for *balanced vs uneven* bloom.
- **The daily hero:** the **current unit's bud → balloon → bloom**, animated, with the delightful **"pop!"** on mastery.
- **The garden of achievements:** each completed unit grows a flower; **"growth seasons"** as a warm layer over levels; streaks/badges that fit ages 9–13.
- **The Bloom Map view itself:** a single, child‑friendly **map of the journey** — units as a path/garden, *where I am now*, *what just bloomed*, *what's next* — so the child can literally *see* their progress.
- **First‑time / empty state:** encouraging, never a blank void.

### B) The Teacher surface (`/studio`) — **Arabic / RTL**. Efficient, **data‑dense, honest** — a productivity tool, not a garden.
- A **per‑student mastery panel:** the five petals as **honest meters**, each objective's **stage + tally (e.g. "٦/٨")**, **grouped by unit**.
- An **at‑a‑glance read:** which skills lag, which units are *mastered / current / upcoming*, where to intervene next.
- The **spark / "draft vs approved"** distinction stays visible; completion vs performance clearly separated.

### C) The Guardian surface — **Arabic / RTL**. Clarity, warmth, trust. A read‑only **"Bloom Report."**
- A **candid, plain‑language** bloom snapshot: the flower + an honest summary of real growth and what needs support. **No jargon, no fake precision, no pressure.**

---

## 4. System pieces to define (so engineering can build it)
- The **flower component** + its five **petal states** (unopened / partial / bloomed) and the *balanced vs uneven* read.
- The **bud → balloon → bloom** stages + the **"pop!"** reward animation.
- The **mapping visual: objective → its skill petal** — the *same visual language at two scales* (one objective vs the whole skill).
- The **scope chip** (CEFR level/season vs textbook/term).
- The **completion‑vs‑performance** visual separation.
- The **spark** states reused for AI moments, and the **draft → approved** marker.
- All **states:** empty / in‑progress / mastered / needs‑support; loading; and a **reduced‑motion** variant.

---

## 5. Constraints & quality bar
- **Honesty first** — real tallies, never inflated percentages.
- **Mobile‑first**, verified on a phone; large tap targets; accessible contrast over purple and any gradient; **lightweight animation, respect `prefers-reduced-motion`**.
- **Purple hero + semantic accents** (green / apricot / rose), not purple‑only.
- **Direction:** Child = English/LTR; Teacher & Guardian = Arabic/RTL. Use logical layout, mirror for RTL.
- **Extend the existing identity and components** (the flower mark, the spark, and our `BloomFlower` / `UnitBloom` components) — **don't reinvent** the brand.
- **Ages 9–13:** rewarding and real, *not* toddler‑cute.

---

## 6. What I want back from you
1. The **Bloom Map represented visually for all three surfaces** (child / teacher / guardian) — with the key **states** and the core **animations** (bud→bloom, the "pop!"), shown as **real Ward Academy screens**.
2. The **flower + bud→bloom component spec** (states, sizes, motion).
3. A short **"how it maps to the data"** note tying each visual back to §2 — so we wire it to real mastery data and invent nothing.

> Start by showing me the **one hero image** of the Bloom Map as the child sees it (the garden‑path + flower + current bloom), then expand into the teacher and guardian reads and the component states.
