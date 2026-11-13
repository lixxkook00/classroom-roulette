# Lớp Khoa học tự nhiên thầy Lê Quang Quí 🧪

*(project folder: classroom-roulette)*

A chalkboard-style periodic table that picks which student answers the question
(*Ai sẽ trả lời câu hỏi?*). Students get elements in list order, in one of two modes
(a switch on the spin screen):

- **Use the whole table** (default): the table is shared out so every student gets the
  same number of elements — floor(118 ÷ class size). With 30 students that is 3 each:
  #1 owns H (1), Ga (31) and Pm (61), #2 owns He, Ge and Sm, … and elements 91–118 are unused.
- **Off**: one element each — #1 is H, #2 is He — and the rest of the table is unused. Hit **Spin** (or press **Space**),
the table glows through the students, and a card pops up with the student's name and a
fun fact about their element.

## Features

- **Spin screen**: full periodic table coloured by element group, every element lit. The
  glow shuffles across the table, slows down and lands on one element; that student's other
  elements light up too. Every student owns the same number of elements, and the winner is
  drawn per student, so the pick is fair. The colour key sits in the empty gap at the top of
  the table. Space spins and stops early.
- **Mystery card mode** (*Thẻ bí ẩn* — switch *Bảng | Thẻ bí ẩn* at the top): a big blank
  card is on screen from the start. Spin rolls every field like a slot machine, then they lock
  one by one — element type → period → the element (and its group) → the student — so the class
  can guess along; values still rolling only show options that fit the clues already locked.
  The finished card shows the fun fact with *Mark as tested* / *Absent*. The winner is drawn up
  front exactly like table mode, so the reveal never changes anyone's chance.
- **Teacher / student access**: a device that hasn't been unlocked only shows *Bảng tuần hoàn* and
  *Đoán nguyên tố* (what students open from the QR code). Tap **Giáo viên**, enter the teacher
  password once and that device stays unlocked; **Khóa** switches back to student view.
- **QR for students**: on *Bảng tuần hoàn* and *Đoán nguyên tố* (teacher only) — students scan it
  and get the same page on their phones. For a custom element set the link carries the set itself.
- **Question sets** (*Lớp học → Bộ câu hỏi*): write questions with optional audio (mp3), video
  (mp4) or a YouTube link. On *Trả lời câu hỏi* the floating **Câu hỏi** button (bottom-left)
  picks the set; after a student is picked, **Hiện câu hỏi** turns the winner card into the
  question — the name glides to the top-left, and for video / YouTube the popup grows to almost
  full screen. *Câu khác* draws another question; questions don't repeat until the set is used up.
  Audio/video files are stored in the browser (IndexedDB) on that computer only; the backup file
  keeps the text and YouTube links.
- **Question rounds**: next to the *Câu hỏi* button, **Bắt đầu vòng** starts a round with the chosen
  set. The question view has **Kiểm tra đáp án**, which reveals the answer saved with the question (text and/or audio, video or YouTube); questions or answers with video get a near-full-screen popup with everything else made small; then **✓ Trả lời đúng** / **✗ Trả lời sai**: grading marks the student,
  takes that question out of the round (the next spin only draws from the questions left) and
  plays fireworks for a right answer or a smoke-and-bubbles "fizzle" for a wrong one. *Câu khác*
  swaps the question without using it up. **Kết thúc vòng** (or answering the last question)
  shows the results — right/wrong counts, who answered what — with a CSV download. Rounds are
  saved, so a refresh doesn't lose them.
- **Element sets** (*Lớp học → Bộ nguyên tố*): click elements on the table (or a whole group from
  the colour key, or "1–20") to build your own lists for *Đoán nguyên tố*.
- **Tabs**: *Trả lời câu hỏi* · *Bảng tuần hoàn* · *Đoán nguyên tố* · *Lab hữu cơ* · *Lớp học*. Each tab has its own
  link (`/#/table`, `/#/guess`, `/#/lab`, `/#/classes`), so students can be sent straight to one.
- **Lab hữu cơ** (organic chemistry lab, students can open it too): pick the lesson at the top
  (*Bài 26 · Ethylic alcohol*, *Bài 27 · Acetic acid*); the link remembers it (`/#/lab?bai=27`) and the teacher's
  **Chia sẻ** button shows a QR code for it. Each lesson gets the parts its data has:
  1. *Phân tử*: a 3-D ball-and-stick model (WebGL, three.js) — it turns by itself, drag to spin it, tap atoms;
     **Tìm nhóm –OH / –COOH** circles the functional group,
     **Đếm nguyên tử** counts into the molecular formula, and it morphs into the structural formula.
  2. *So sánh*: the "Phiếu học tập số 1" table (ethane · ethylic alcohol · acetic acid) with the lesson's column
     hidden as "……" — tap a cell to reveal it.
  3. *Độ cồn* (Bài 26): pour ethanol and water into a beaker; *Thử thách* asks "add how much water for 25°?"
     or "make 200 mL of 60°" and shows the worked solution.
  4. *Thí nghiệm*: 3-D experiments (WebGL) — glassware and a stand on a lit bench with shadows, particle flames that
     light the scene, rising bubbles, falling and dissolving solids, drops, indicator paper and an inflating balloon — burning, sodium (+ burning splint "pop"), fermentation, litmus,
     Mg, CuO with heating, NaOH + phenolphthalein, limestone. Products stay **?** until the reaction plays.
  5. *Ai phản ứng?*: the class picks which substances react (e.g. Zn, KOH, ZnO, NaCl, MgCO₃, Cu), then **Kiểm tra**
     shows right/wrong with equations.
  6. *Luyện tập*: true/false and A–D questions from the lesson plan, filterable by *Tiết 1/2/3*, with sounds and a
     score (keys Đ/S or A–D, Space = next). Teachers get **🎯 Đưa vào "Trả lời câu hỏi"**, which saves the
     questions as a question set and selects it, so the spin picks who answers.

### Adding an organic chemistry lesson

Lessons are plain data in `src/data/organic/` — no component code needed:

1. Copy `lessons/bai27-acetic-acid.ts` to e.g. `lessons/bai28-chat-beo.ts` and change the content
   (title, facts, reactions, `whoReacts`, quiz). Types and comments are in `types.ts`.
2. If the lesson's molecule isn't in `molecules.ts` yet, add it there (atoms with `p: [x, y, z]` in Å for the
   3-D model and x/y in a 640 × 400 box for the structural formula, bonds with `2`/`3` for double/triple bonds,
   and the functional group to circle).
   Already there: methane, ethane, ethylene, acetylene, methyl alcohol, ethylic alcohol, acetic acid.
3. Import it in `src/data/organic/index.ts` and add it to `LESSONS`.

The lab tab loads three.js on demand (its own chunk), so the other tabs stay light. Experiments are described, not drawn: a `tube` scene takes a liquid (colour before/after), an optional solid
(`pellet`, `ribbon`, `powder`, `chunk`), drops from a dropper, indicator paper, heating, bubbles and a splint test;
`burn` and `ferment` cover burning and fermentation.
- **Smart periodic table** (*Bảng tuần hoàn thông minh*, for students): click any element for
  its name with IPA (phiên âm) and an English pronunciation button — UK or US accent, normal or
  slow (browser voices), a 3-D stage (WebGL, loaded on demand) with two views — *Nguyên tử*: a nucleus of
  protons and neutrons with electrons orbiting on tilted shells (drag to turn), and *Ngoài đời*: what the element
  looks like in real life (a lump or bar of metal, crystals, powder, a glowing gas tube, a liquid, mercury beads…)
  with one line on where students meet it (`src/data/looks.ts`) — p⁺/n⁰/e⁻ counts and electrons per shell,
  atomic number, mass, period/group, state at 25 °C, electron configuration, fun fact and key
  equations (with conditions like t°, xt). Search by symbol, English or Vietnamese name or
  number (accents optional); click the colour key to filter by group; ← → moves between elements.
- **Guess the element** (*Đoán nguyên tố*): 9 clues from hard to easy — type, state, period,
  group, electron configuration, mass, fun fact (name hidden), atomic number, first letter.
  10 points minus one per clue; a wrong guess opens the next clue. Guesses accept symbol,
  English/Vietnamese name (with or without accents) or number. Four levels (1–20, 1–36,
  1–86, all). Space = next clue.
- **Winner card**: element tile, student name, a fun fact, all of the student's elements,
  and three actions:
  *Mark as tested*, *Spin again*, *Absent — skip* (skips them for the rest of the session).
- **Tested last time**: students marked as tested sit out until the marks are cleared.
  When everyone has had a turn, the app offers to start a new round.
- **Element tooltips**: hover any element for its name, group, mass, period/group and the
  student who owns it (and whether they were tested or are absent).
- **Smart list import**: press *Import a list*, or just Ctrl+V anywhere on the class page.
  Paste cells from Excel / Google Sheets, a list from Word or Zalo, or drop a .csv / .txt
  file. It detects the header row and which columns hold the name (joins *Họ đệm* + *Tên*),
  skips STT / ID / date / gender columns, fixes ALL-CAPS names, strips numbering and flags
  duplicates — with a live preview before adding.
- **Class manager**: create, rename and delete classes; reorder, edit and remove students;
  tick or untick "tested last time" by hand.
- **Backup**: everything is saved in the browser (localStorage). Export or import a JSON
  file to move the classes to another computer.
- **Vietnamese / English**: switch with the VI | EN toggle on the class page; the choice is remembered.
  Vietnamese shows IUPAC names as in the new textbooks, plus the familiar name where there
  is one (e.g. *Iron (sắt)*), and groups the Vietnamese-textbook way (*Nhóm VIIIB*).
- **Always fits the screen**: the table scales to the window; nothing scrolls the page
  (the student list scrolls inside its own box).
- Screens slide between each other, and switching *Bảng ⇄ Thẻ bí ẩn* animates too: the old
  view shrinks away, the table's elements fly in as a wave from H, or the card flips in
  (View Transitions API, with a fallback).
- Vietnamese by default; credit *Thực hiện bởi thầy Lê Quang Quí* floats in the bottom-right.
- Chalk-styled dropdowns, switches and checkboxes instead of the browser defaults.
- Sound effects with a mute toggle; respects "reduce motion".

## Performance on old devices

- **Đồ hoạ 3D** (*Lớp học*, left column): *Tự động / Nhẹ / Đầy đủ*. Auto looks at the device (cores, memory, GPU name,
  phone) and, if a 3-D canvas still cannot hold ~30 fps, switches the whole app to *Nhẹ* and remembers it on that
  device. *Nhẹ* = pixel ratio 1, no shadows or antialiasing, 30 fps, fewer particles, still thumbnails. A link with
  `?q=low` or `?q=high` forces it once (`src/perf.ts`).
- 3-D canvases pause when the tab is hidden or the canvas is scrolled out of view.
- Students' phones only download the table and the game: the teacher screens, the QR code library, the organic lab and
  three.js are separate chunks loaded when first used.

## Run it locally

```bash
pnpm install
pnpm dev
```

## Site address & SEO

The live address is used for the search/sharing tags, `robots.txt` and `sitemap.xml`.
Default: `https://lequangqui-classroom.vercel.app`. To use a different one (or your own
domain), set **`VITE_SITE_URL`** in Vercel → *Project → Settings → Environment Variables*
(no trailing slash), then redeploy.

Included: Vietnamese title/description/keywords, a share image for Zalo/Facebook
(`public/og-image.png`, 1200×630), structured data (schema.org `WebApplication`), app icons and a
web manifest (students can "Add to Home Screen" — it opens on the periodic table), and a
per-tab browser title. After the first deploy, add the site in Google Search Console and submit
`/sitemap.xml`.

## Teacher password

Default: **`thayqui2026`** (capitals, spaces and accents don't matter — "Thầy Quí 2026" works too).

Change it for the live site in Vercel → *Project → Settings → Environment Variables*:
add `VITE_TEACHER_PIN` = your password, then redeploy. Locally, put `VITE_TEACHER_PIN=...` in a
`.env.local` file. Only a hash of the password is built into the app, and changing it locks every
device again.

Note: this keeps students out of the teacher screens on their own phones; it is not bank-grade
security (the class lists only ever live in the teacher's own browser anyway).

## Deploy to Vercel

1. Push this folder to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Vercel detects Vite automatically (build: `npm run build`, output: `dist`). Click **Deploy**.

No server or environment variables are needed. The app uses hash URLs (`#/classes`),
so no rewrite rules are needed either.

## Project layout

```
src/
  data/elements.ts          118 elements: symbol, name, mass, group, position, fun fact (EN)
  data/facts.vi.ts          Vietnamese fun facts and traditional names
  data/chem.ts              electron configurations, states, equations, guess matching
  speech.ts                 English pronunciation, UK / US voices (Web Speech API)
  data/pronunciation.ts     IPA (UK + US) for all 118 names
  pin.ts                    teacher password hashing (shared with vite.config.ts)
  media.ts                  IndexedDB storage for question audio/video, YouTube link parsing
  i18n.tsx                  VI/EN strings, language toggle
  store.ts                  classes & students, saved to localStorage
  smartImport.ts            turns pasted sheets / lists / CSV into clean names
  sound.ts                  tiny Web Audio tick / lock / win sounds
  util.ts                   random helpers, Space-key handling
  components/
    PeriodicTable.tsx       the table grid
    SpinScreen.tsx          spin animation, Space shortcut, landed banner
    WinnerModal.tsx         the fun-fact popup
    ExploreScreen.tsx       smart periodic table tab
    ElementDetail.tsx       element card: facts, pronunciation, equations
    GuessScreen.tsx         guess-the-element game
    chemText.tsx            formulas with subscripts, configurations, equations
    BohrAtom.tsx            animated Bohr model
    ElementSetsPanel.tsx    teacher's element sets editor
    QrDialog.tsx            QR code for students
    PinDialog.tsx           teacher password prompt
    QuestionSetsPanel.tsx   question-set editor (text, mp3, mp4, YouTube)
    QuestionPicker.tsx      floating question-set button on the spin screen
    QuestionStage.tsx       the question view (name top-left, question, media)
    MediaView.tsx           audio / video / YouTube player
    Celebration.tsx         fireworks (correct) / fizzle (wrong) overlay
    RoundSummary.tsx        end-of-round results + CSV
    CardMode.tsx            mystery card: slot-machine reveal, clue by clue
    ClassesScreen.tsx       class & student manager
    ImportDialog.tsx        paste / drop a class list with live preview
    controls.tsx            chalk dropdown and switch
  index.css                 chalkboard theme
```

## Checking the chemistry data

```bash
npx tsx scripts/check-chem.ts
```

Checks that every electron configuration and shell list adds up to Z electrons, that every
equation is balanced, that all 118 elements have IPA, and that typed guesses ("Fe", "sắt", "sat", "iron", "26") resolve correctly.
