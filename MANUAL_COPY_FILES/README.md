# MANUAL_COPY_FILES — How We Work

> Working note for the manual-copy delivery flow. `CLAUDE.md` at repo root is the
> authority on the *rules*; this file records how the flow actually operates day to
> day, what each folder is, and the drift that exists in here today so nobody
> mistakes legacy layout for the current convention.

---

## Why this folder exists

Claude cannot push to the submodule repos (`contractnest-api`, `contractnest-ui`,
`contractnest-edge`, `ClaudeDocumentation`, `ContractNest-Mobile`) from a session.
So code is **staged** here instead, mirroring the target repo's exact path layout,
and the owner copies it into the real checkout, tests it, and only then commits.

This folder is a **staging area, not a source of truth**. Once a batch is merged
into its submodule's `main`/`master`, the copy here is historical. Nothing in here
is built, imported, or type-checked by any app — it's inert until copied out.

`MANUAL_COPY_FILES/` **is tracked in the parent repo** (~1,241 files today, 181
batch folders). It is not gitignored. That's deliberate — it's the audit trail of
what was handed over and when.

---

## The unit of work: one batch = one folder

```
MANUAL_COPY_FILES/
└── <batch-name>/                  # e.g. mvp-rfq-19, hide-contact-overview-tab
    ├── contractnest-ui/           # exact mirror of the submodule's path layout
    │   └── src/components/.../Foo.tsx
    ├── contractnest-api/
    │   └── src/routes/bar.ts
    └── COPY_INSTRUCTIONS.txt      # mandatory
```

Rules that actually matter in practice:

1. **The batch folder name is the working name for that change** — it's how the
   owner refers to it in conversation ("copy mvp-rfq-19"), and usually matches the
   feature branch used on the session side.
2. **Paths inside must mirror the submodule exactly**, starting at the submodule
   root (`contractnest-ui/src/...`, not `src/...`). The copy command is a blind
   recursive overlay — a wrong path silently creates a junk directory instead of
   replacing the intended file.
3. **Only include files that changed.** A batch folder is a patch, not a snapshot.
4. **Never mix two unrelated changes into one batch folder** — batches get copied
   and merged independently, so mixing makes it impossible to ship one without the
   other.
5. **Never drop loose files in `MANUAL_COPY_FILES/` root.** (See "Known drift".)

### Naming patterns in use

Not enforced, but the existing 181 folders cluster into recognizable prefixes:

| Pattern | Meaning | Examples |
|---|---|---|
| `mvp-rfq-<n>`, `mvp-sprint-<n>` | Numbered sequential batches in a workstream — **order matters**, later ones often depend on earlier | `mvp-rfq-19`, `mvp-sprint-3d` |
| `fix-*`, `hotfix-*` | Targeted bug fix, usually 1–3 files | `fix-theme-preferences-500`, `hotfix-qr-copy-link` |
| `<feature>-<phase>` | Multi-part feature delivered in phases | `group-sessions-phaseD`, `release-3-seller-view` |
| descriptive slug | One-off change | `hide-contact-overview-tab`, `checkin-nocache-headers` |

---

## COPY_INSTRUCTIONS.txt — the contract

Every batch folder must have one. 169 of 181 folders do; the 12 that don't are
legacy (listed below). It is the only place the owner can see *what* they're about
to copy and *why*, so it carries more than a file list.

**Two formats exist in the tree. Both are fine; pick by batch size.**

**Short form** — for a 1–2 file change (see `hide-contact-overview-tab/`):
a numbered list of files, each with `-> Copy to:` target path and `-> Purpose:`,
then `SUBMODULES AFFECTED:`.

**Full form** — for anything substantial (see `mvp-rfq-19/`), follows the PHASE 1
template in `CLAUDE.md`:

- `CHANGES SUMMARY` — batch name + branch
- **Dependency warning up top** if the batch must be applied after another one
  (`mvp-rfq-19` depends on `mvp-rfq-18` — this belongs in the first paragraph, not
  buried, because copy order is destructive to get wrong)
- `WHAT THIS SOLVES` — the problem and the reasoning trail, including what was
  investigated and deliberately *not* done
- `Files Changed:` — per file, what changed in it and why
- `Submodules Affected:`
- `Production Checklist:` — the 5 standards (transactions, race conditions, error
  handling, toasts, loaders), each marked done or explicitly `N/A — <reason>`
- `Verification done this batch:` — what was actually run (e.g. `npx tsc -p
  tsconfig.app.json --noEmit`) **and what was not**, stated plainly
- `PHASE 1: COPY FILES` — the literal PowerShell commands
- `TESTING CHECKLIST` — concrete steps the owner ticks off
- `WAITING FOR CONFIRMATION` — the stop line

The `Verification done` section matters most on re-read months later: it's the
record of whether a claim was tested or assumed.

---

## The two-phase flow

```
   analyse → propose → ⏸ owner confirms → code
                                            ↓
   PHASE 1: write batch folder + COPY_INSTRUCTIONS.txt
            hand over copy commands ONLY
                                            ↓
                      ⏸ owner copies, runs, tests locally
                                            ↓
              "Tested, working - proceed with merge"
                                            ↓
   PHASE 2: commit/push per submodule, then bump parent submodule refs
```

**Phase 1 must never contain commit or merge commands.** That's the whole point of
the gate — the owner is the one who confirms a change works before it enters any
`main` branch.

Copy command shape (PowerShell, from the repo root, one line per affected
submodule):

```powershell
Copy-Item "MANUAL_COPY_FILES\<batch>\contractnest-ui\*" -Destination "contractnest-ui\" -Recurse -Force
```

`-Recurse -Force` means **overwrite without prompting**. There is no undo other
than `git checkout` inside the submodule, which is exactly why the batch is copied
into a clean submodule working tree and tested before anything is committed.

### After merge

The batch folder is left in place as history. It is not deleted or moved. So the
folder list grows monotonically and a folder's presence says nothing about whether
it's been merged — `COPY_INSTRUCTIONS.txt` and the submodule's own git log are the
only reliable indicators.

---

## Known drift (do not copy these patterns)

Real state of the folder today, so it isn't mistaken for convention:

- **28 loose files in `MANUAL_COPY_FILES/` root** — `App.tsx`,
  `BrandColorPicker.tsx`, `ServiceCard.tsx`, `catalog-view.tsx`,
  `useTenantProfile.ts`, etc. These are from before the batch-folder convention.
  They have no target path recorded, so where each belongs must be recovered by
  searching the submodules for a matching filename. **Do not add more.**
- **Root folders named after submodules** — `contractnest-api/`,
  `contractnest-ui/`, `contractnest-edge/`, `ClaudeDocumentation/`, plus `ui/` and
  `migrations/`. These are legacy batches that skipped the batch-folder level, so
  they're structurally ambiguous with the mirror directories that live *inside* a
  batch. Leave them; don't extend them.
- **`COPY_INDSTRUCTIONS.TXT`** (typo, root) alongside the correctly-spelled
  `COPY_INSTRUCTIONS.txt` and `COPY_INSTRUCTIONS_401_FIX.txt`.
- **12 batch folders with no copy instructions**: `ClaudeDocumentation`,
  `api-layer`, `cnak-claim-feature`, `contractnest-api`, `contractnest-ui`,
  `cycle3-edge`, `fk-user-invite`, `hotfix-guest-tag-casing`,
  `kt-compliance-engine`, `migrations`, `n8n-workflows`, `simplified-landing-v1`,
  `ui`, `ux-metering-handover`. Their contents have to be read to know what they
  do.
- **Non-code artifacts at root** — `HANDOVER_SESSION.md`, `RFQ-HANDOVER.md`,
  `TEST_CASES.md`, `PRD-*.md`, `IMPACT_ANALYSIS_*.md`. These are docs, not copy
  targets; they'd be better placed in `ClaudeDocumentation/`, but are left where
  they are so existing references don't break.

Some batches also carry non-copyable helpers — `.sql` migrations (e.g.
`bbb-foundation/048_checkin_ist_today.sql`) and `.ps1` scripts. These are **run**,
not copied into a submodule; the instructions file should say so explicitly when
present.

---

## Checklist before handing a batch over

- [ ] Batch folder created with a descriptive name; nothing dropped in root
- [ ] Paths mirror the submodule exactly, starting at submodule root
- [ ] Only changed files included
- [ ] `COPY_INSTRUCTIONS.txt` present, with purpose per file
- [ ] Dependencies on earlier batches stated at the top, if any
- [ ] `Submodules Affected` listed
- [ ] Production checklist filled — each item done or `N/A` with a reason
- [ ] Verification section states what was run **and what wasn't**
- [ ] Copy commands cover every affected submodule
- [ ] Testing checklist is concrete enough to actually tick off
- [ ] **No commit/merge commands anywhere in the Phase 1 handover**
