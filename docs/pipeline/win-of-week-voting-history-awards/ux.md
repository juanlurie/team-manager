# UX Specification: Win of the Week — Voting Visibility, History, and Awards

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Draft |
| Author | UX Design |
| Date | 2026-05-14 |
| Related | `arch.md` (Architecture Document) |

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [User Journey Maps](#2-user-journey-maps)
3. [Wireframe Specifications](#3-wireframe-specifications)
4. [Component-Level UX Specs](#4-component-level-ux-specs)
5. [State Machine Diagrams](#5-state-machine-diagrams)
6. [Microcopy Reference](#6-microcopy-reference)
7. [Accessibility](#7-accessibility)
8. [Animation & Transitions](#8-animations--transitions)
9. [Mobile Adaptations](#9-mobile-adaptations)
10. [Design Token Reference](#10-design-token-reference)

---

## 1. Design Principles

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Visibility over mystery** | Users should always know what phase they're in, what actions are available, and what's coming next. Never hide functionality behind invisible time gates. |
| **Progressive disclosure** | Show the most important action first (nominate/vote), then surface secondary options (history, Win of the Month) contextually. |
| **Reward visibility** | Winning and voting should feel meaningful. Awards, points, and achievements must be visually celebrated, not buried. |
| **Continuity** | Weekly wins should feel connected to monthly contests, which should feel connected to the leaderboard. The user should perceive one system, not three disconnected features. |
| **Forgiveness** | Allow vote removal during the voting window. Make it easy to correct mistakes. |

### 1.2 Visual Hierarchy

The Fun Hub features follow this visual priority order:

```
1. Current actionable feature (nominate or vote)
2. Upcoming phase indicator (countdown, schedule)
3. Cross-promotion to related feature (Win of the Month banner)
4. Historical content (past winners)
5. Leaderboard context (points, achievements)
```

---

## 2. User Journey Maps

### 2.1 Journey: Nominating (Mon–Thu)

**Actor:** Team member
**Goal:** Nominate someone for Win of the Week

| Step | Screen | User Action | System Response | Emotional State |
|------|--------|-------------|-----------------|-----------------|
| 1 | Fun Hub → Win of the Week tab | Clicks "Win of the Week" tab | Loads current week view | Curious |
| 2 | WoW Current View (Nominating phase) | Sees schedule bar, nomination form | Schedule shows "Nominations Open" highlighted, current day indicator on Mon–Thu | Informed |
| 3 | Nomination form | Reads "Nominations Open" header, sees vote allocation hint ("You'll get 3 votes when voting opens Friday") | Form shows nominee selector, title input, description textarea | Motivated |
| 4 | Fills form | Selects teammate, enters title + description, clicks "Submit Nomination" | Toast: "Nomination submitted! Voting opens Friday." Form resets or shows confirmation | Satisfied |
| 5 | Post-submit view | Sees "Your nominations" section with submitted entries | List of their nominations for this week, status: "Pending vote" | Reassured |
| 6 | Exit or explore | Sees "View past winners" link and/or Win of the Month banner | Can navigate to History or Win of the Month | Engaged |

**Pain points addressed:**
- User now sees the schedule bar — understands voting exists and when it opens
- Vote allocation hint sets expectations ("3 votes coming Friday")
- Past winners link provides context for what winning looks like

**Edge cases:**
- User has already nominated the maximum allowed: form shows "You've submitted all your nominations for this week" with disabled submit
- No nominations submitted yet: empty state with "Be the first to nominate someone this week!"

---

### 2.2 Journey: Voting Weekly (Fri–Sun)

**Actor:** Team member
**Goal:** Vote for their favorite nominees

| Step | Screen | User Action | System Response | Emotional State |
|------|--------|-------------|-----------------|-----------------|
| 1 | Fun Hub → Win of the Week tab | Clicks tab | Loads current week view | Curious |
| 2 | WoW Current View (Voting phase) | Sees schedule bar with "Voting Open" highlighted, sees nomination cards with vote buttons | Schedule shows Fri–Sun highlighted, vote buttons visible on each card, "X votes remaining" counter in header | Excited |
| 3 | Reviews nominations | Scrolls through nomination cards, reads titles and descriptions | Each card shows nominee name, title, description, current vote count, and a vote button | Engaged |
| 4 | Casts vote | Clicks "Vote" button on a card | Button changes to "Voted" (filled state), vote count increments, votes remaining decrements, toast: "Vote cast! X votes remaining" | Satisfied |
| 5 | Casts more votes | Repeats for 2 more nominations | After 3rd vote: "All votes used" banner appears, remaining vote buttons disabled | Complete |
| 6 | Removes vote (optional) | Clicks "Voted" button on a card they want to change | Confirmation: "Remove your vote for [Name]?" → on confirm: button resets, vote count decrements, votes remaining increments | In control |
| 7 | Voting closes (Sun night) | Returns after close | View shows "Voting Closed" with winner announced | Anticipating |

**Pain points addressed:**
- Vote buttons are now visible during voting phase (previously hidden entirely)
- Schedule bar makes the phase transition obvious
- Vote counter in header provides constant feedback
- Vote removal gives flexibility

---

### 2.3 Journey: Viewing History

**Actor:** Team member
**Goal:** See past winners and understand the feature

| Step | Screen | User Action | System Response | Emotional State |
|------|--------|-------------|-----------------|-----------------|
| 1 | Fun Hub → History tab | Clicks "History" tab | Loads Win of the Week History view | Curious |
| 2 | History grid view | Sees grid of winner cards, newest first | Each card shows: winner avatar, name, title, week date range, vote count, trophy icon | Impressed |
| 3 | Filters by year (optional) | Selects year from dropdown | Grid refreshes with filtered results | In control |
| 4 | Expands a week | Clicks a winner card | Card expands inline to show all nominations from that week with vote counts | Informed |
| 5 | Browses more | Scrolls or clicks "Load more" | Next batch of winners loads (infinite scroll or paginated) | Engaged |
| 6 | Navigates back | Clicks "Win of the Week" tab | Returns to current week view | Oriented |

**Empty state:** If no history exists yet, shows illustration + "No winners yet — be the first to win!" with CTA to go to current WoW.

---

### 2.4 Journey: Voting Monthly

**Actor:** Team member
**Goal:** Vote for their favorite weekly winner to become Win of the Month

| Step | Screen | User Action | System Response | Emotional State |
|------|--------|-------------|-----------------|-----------------|
| 1 | Fun Hub → Win of the Month tab | Clicks tab (or follows banner from WoW) | Loads Win of the Month view | Curious |
| 2 | WoM Current View (Voting phase) | Sees header "Win of the Month — May 2026", countdown timer, nomination cards | Countdown shows days/hours remaining, cards show weekly winners with source week info | Excited |
| 3 | Reviews monthly nominations | Reads each card: nominee name, original win title, source week date, description | Each card has a distinct "from Week of May 5" badge | Contextual |
| 4 | Casts votes | Clicks vote buttons (max 3) | Same interaction pattern as weekly voting | Engaged |
| 5 | Voting ends | Returns after close | Winner banner with celebration animation, all votes shown | Satisfied |
| 6 | Sees award notification | Winner sees achievement badge animation, points added to leaderboard | Toast or banner: "You won Win of the Month! +50 points" | Thrilled |

**Empty state (no active month):** "Next month's contest starts when we have enough weekly winners." Shows progress: "3 of 4 weekly wins needed."

---

### 2.5 Journey: Receiving Awards

**Actor:** Weekly winner → Monthly winner
**Goal:** Understand and celebrate their achievement

#### Weekly Win Award

| Step | Trigger | System Response | User Experience |
|------|---------|-----------------|-----------------|
| 1 | Week closes, user is winner | Achievement `win-of-the-week` awarded (10 pts) | Next login: toast notification "You won Win of the Week! +10 points" with trophy animation |
| 2 | User checks leaderboard | Sees "Win of the Week" breakdown source in their bar | Gold-colored segment in their points bar |
| 3 | User checks profile/achievements | Sees "Weekly Champion" badge in achievements list | Badge with `emoji_events` icon, date earned |

#### Monthly Win Award

| Step | Trigger | System Response | User Experience |
|------|---------|-----------------|-----------------|
| 1 | Month closes, user is winner | Achievement `win-of-month-champion` awarded (50 pts) | Celebration overlay: "You are the Win of the Month Champion! +50 points" with confetti animation |
| 2 | All voters | Achievement `win-of-month-voter` awarded (5 pts each) | Toast: "Thanks for voting in Win of the Month! +5 points" |
| 3 | User checks leaderboard | Sees larger gold segment, total points increased | Leaderboard position may have changed |
| 4 | User checks achievements | Sees "Monthly Champion" badge (premium icon) | Distinctive `workspace_premium` icon, highlighted |

---

## 3. Wireframe Specifications

### 3.1 Win of the Week — Current View (Nominating Phase)

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Week                                             │
│                                                                 │
│  ┌─ Schedule Bar ─────────────────────────────────────────────┐ │
│  │  Mon ── Tue ── Wed ── Thu ── Fri ── Sat ── Sun            │ │
│  │  [████████████████████████] [░░░░░░░░░░░░░░░░░░░░░░░░░░░] │ │
│  │   NOMINATIONS OPEN          VOTING OPENS FRIDAY            │ │
│  │        ▲ CURRENT DAY                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Nomination Form ──────────────────────────────────────────┐ │
│  │  Nominate someone for this week's win                       │
│  │                                                             │ │
│  │  Nominee:      [Select teammate ▼]                          │ │
│  │  Title:        [Enter a catchy title              ]         │ │
│  │  Description:  [Tell us why they deserve it...    ]         │ │
│  │                                                             │ │
│  │  [Submit Nomination]                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Your Nominations This Week ───────────────────────────────┐ │
│  │  You have submitted 2 nominations                           │ │
│  │                                                             │ │
│  │  ┌─ Sarah Chen ──────────────────────────────────────────┐ │ │
│  │  │ "Fixed the production deploy pipeline"                 │ │ │
│  │  │ Status: Pending vote                                   │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │  ┌─ James Park ──────────────────────────────────────────┐ │ │
│  │  │ "Mentored three new team members"                      │ │ │
│  │  │ Status: Pending vote                                   │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Info Banner ──────────────────────────────────────────────┐ │
│  │  💡 Voting opens Friday. You'll have 3 votes to use.       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [View past winners →]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Win of the Week — Current View (Voting Phase)

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Week                              [3 votes left] │
│                                                                 │
│  ┌─ Schedule Bar ─────────────────────────────────────────────┐ │
│  │  Mon ── Tue ── Wed ── Thu ── Fri ── Sat ── Sun            │ │
│  │  [░░░░░░░░░░░░░░░░░░░░░░] [████████████████████████████] │ │
│  │   NOMINATIONS CLOSED         VOTING OPEN                   │ │
│  │                              ▲ CURRENT DAY                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ If Win of the Month is active ────────────────────────────┐ │
│  │  🏆 Win of the Month voting is open!                       │ │
│  │  Vote for your favorite weekly winner →                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Nomination Cards ─────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌─ Sarah Chen ──────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  Sarah Chen                                  │ │ │
│  │  │            "Fixed the production deploy pipeline"      │ │ │
│  │  │            Saved the team 4 hours of manual work...    │ │ │
│  │  │                                    [ 12 votes ] [Vote] │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─ James Park ──────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  James Park                                  │ │ │
│  │  │            "Mentored three new team members"           │ │ │
│  │  │            Helped onboard the new hires with...        │ │ │
│  │  │                                     [ 8 votes ] [Vote] │ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ After all votes used ─────────────────────────────────────┐ │
│  │  ✓ All votes cast! Results will be announced Sunday night. │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Win of the Week — Current View (Closed / Winner Announced)

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Week                                             │
│                                                                 │
│  ┌─ Schedule Bar ─────────────────────────────────────────────┐ │
│  │  Mon ── Tue ── Wed ── Thu ── Fri ── Sat ── Sun            │ │
│  │  [░░░░░░░░░░░░░░░░░░░░░░] [░░░░░░░░░░░░░░░░░░░░░░░░░░░] │ │
│  │   NOMINATIONS CLOSED         VOTING CLOSED                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Winner Announcement ──────────────────────────────────────┐ │
│  │  🎉 This Week's Winner                                     │ │
│  │                                                             │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  [Large Avatar]  Sarah Chen                           │ │ │
│  │  │                  "Fixed the production deploy..."     │ │ │
│  │  │                  18 votes                             │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐  │ │ │
│  │  │  │  🏅 Weekly Champion  +10 points                 │  │ │ │
│  │  │  └─────────────────────────────────────────────────┘  │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Next week's nominations open Monday.                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Win of the Week — History View

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📜 Win of the Week History                                     │
│                                                                 │
│  [Year: 2026 ▼]                                    [List] [Grid]│
│                                                                 │
│  ┌─ Winner Cards (Grid View) ─────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │ [Avatar] │  │ [Avatar] │  │ [Avatar] │  │ [Avatar] │   │ │
│  │  │ Sarah C. │  │ James P. │  │ Alex K.  │  │ Maria L. │   │ │
│  │  │          │  │          │  │          │  │          │   │ │
│  │  │ Week     │  │ Week     │  │ Week     │  │ Week     │   │ │
│  │  │ May 5-11 │  │ Apr 28-  │  │ Apr 21-  │  │ Apr 14-  │   │ │
│  │  │          │  │ May 4    │  │ Apr 27   │  │ Apr 20   │   │ │
│  │  │ 🗳️ 18    │  │ 🗳️ 14    │  │ 🗳️ 22    │  │ 🗳️ 11    │   │ │
│  │  │          │  │          │  │          │  │          │   │ │
│  │  │ "Fixed   │  │ "Mentored│  │ "Shipped │  │ "Resolved│   │ │
│  │  │ deploy.."│  │ new..."  │  │ feature" │  │ outage"  │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │ [Avatar] │  │ [Avatar] │  │ [Avatar] │  │ [Avatar] │   │ │
│  │  │ Tom W.   │  │ Lisa R.  │  │ David H. │  │ Nina S.  │   │ │
│  │  │ ...      │  │ ...      │  │ ...      │  │ ...      │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Load More]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Expanded Card (inline detail):**

```
  ┌─ Sarah Chen — Week of May 5-11 ────────────────────────────┐
  │  Winner: Sarah Chen — "Fixed the production deploy..."     │
  │  🗳️ 18 votes                                               │
  │                                                             │
  │  All Nominations:                                           │
  │  ┌───────────────────────────────────────────────────────┐ │
  │  │  1. Sarah Chen  —  "Fixed the deploy..."  —  18 🗳️   │ │
  │  │  2. James Park  —  "Mentored new members" —  12 🗳️   │ │
  │  │  3. Alex Kim    —  "Shipped feature X"    —   8 🗳️   │ │
  │  │  4. Maria Lopez —  "Resolved outage"      —   5 🗳️   │ │
  │  └───────────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────┘
```

### 3.5 Win of the Month — Active Voting

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Month — May 2026                  [2 votes left] │
│                                                                 │
│  ┌─ Countdown Timer ──────────────────────────────────────────┐ │
│  │  ⏰ Voting closes in 3d 14h 22m                             │ │
│  │  ████████████████████████░░░░░░░░░░░░  62% complete        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Vote for your favorite weekly winner to become                 │
│  the May 2026 Champion!                                         │
│                                                                 │
│  ┌─ Nomination Cards ─────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌─ Sarah Chen ──────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  Sarah Chen                                  │ │ │
│  │  │  📅 Week of May 5-11                                   │ │ │
│  │  │  "Fixed the production deploy pipeline"                │ │ │
│  │  │  Saved the team 4 hours of manual work every week...   │ │ │
│  │  │                                    [ 24 votes ] [Vote] │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─ James Park ──────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  James Park                                  │ │ │
│  │  │  📅 Week of Apr 28 - May 4                             │ │ │
│  │  │  "Mentored three new team members"                     │ │ │
│  │  │  Helped onboard the new hires with personalized...     │ │ │
│  │  │                                    [ 19 votes ] [Vote] │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─ Alex Kim ────────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  Alex Kim                                    │ │ │
│  │  │  📅 Week of Apr 21-27                                  │ │ │
│  │  │  "Shipped the new reporting feature"                   │ │ │
│  │  │  Delivered ahead of schedule with zero bugs...         │ │ │
│  │  │                                    [ 15 votes ] [Vote] │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─ Maria Lopez ─────────────────────────────────────────┐ │ │
│  │  │  [Avatar]  Maria Lopez                                 │ │ │
│  │  │  📅 Week of Apr 14-20                                  │ │ │
│  │  │  "Resolved the critical production outage"             │ │ │
│  │  │  Worked through the night to restore service...        │ │ │
│  │  │                                    [ 31 votes ] [Vote] │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [View past monthly winners →]                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Win of the Month — Closed / Winner Announced

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Month — May 2026                                 │
│                                                                 │
│  ┌─ Winner Celebration Banner ────────────────────────────────┐ │
│  │                                                             │ │
│  │         🎉 MAY 2026 CHAMPION 🎉                            │ │
│  │                                                             │ │
│  │         [Large Avatar]                                      │ │
│  │         Maria Lopez                                         │ │
│  │         "Resolved the critical production outage"           │ │
│  │         31 votes                                            │ │
│  │                                                             │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  🏅 Monthly Champion  +50 points                      │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Final Standings ──────────────────────────────────────────┐ │
│  │  1. Maria Lopez  —  31 votes  🥇                           │ │
│  │  2. Sarah Chen   —  24 votes  🥈                           │ │
│  │  3. James Park   —  19 votes  🥉                           │ │
│  │  4. Alex Kim     —  15 votes                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  June's contest will begin when enough weekly winners           │
│  are available.                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.7 Win of the Month — Empty / Waiting State

```
┌─────────────────────────────────────────────────────────────────┐
│  Fun Hub                                                        │
│  [Win of the Week] [History] [Win of the Month] [Leaderboard]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 Win of the Month                                            │
│                                                                 │
│  ┌─ Empty State ──────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │           [Illustration: trophy with hourglass]             │ │
│  │                                                             │ │
│  │  Next month's contest is on its way!                        │ │
│  │                                                             │ │
│  │  We need 4 weekly winners to start the monthly vote.        │ │
│  │                                                             │ │
│  │  ┌─ Progress ────────────────────────────────────────────┐ │ │
│  │  │  [███░]  3 of 4 weekly wins collected                 │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  Keep nominating and voting in Win of the Week to           │ │
│  │  help fill this up!                                         │ │
│  │                                                             │ │
│  │  [Go to Win of the Week →]                                  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Past Monthly Winners ─────────────────────────────────────┐ │
│  │  April 2026: David Huang — "Led the migration project"     │ │
│  │  March 2026: Lisa Rodriguez — "Automated the test suite"   │ │
│  │  February 2026: Tom Wilson — "Designed the new UI"         │ │
│  │  [View all past winners →]                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Component-Level UX Specs

### 4.1 Schedule Bar

**Purpose:** Visual indicator of the current phase within the week.

| Property | Value |
|----------|-------|
| Height | 48px |
| Background | `--surface-variant` (light gray) |
| Border radius | 8px |
| Padding | 8px 16px |
| Font | 12px, medium weight, `--text-secondary` |
| Active segment color | `--primary` (blue) with 20% opacity fill |
| Inactive segment color | `--surface` (white/light) |
| Current day indicator | Small triangle pointer below the day label, `--primary` color |
| Margin bottom | 24px |

**Responsive:**
- Desktop: Full width with day labels evenly spaced
- Tablet: Day labels abbreviated (Mon, Tue, Wed...)
- Mobile: Stacked layout — "Current Phase: Nominations Open" with a mini progress bar

**States:**
| Phase | Visual |
|-------|--------|
| Nominating (Mon–Thu) | Mon–Thu segment filled blue, Fri–Sun gray. Label: "Nominations Open" / "Voting Opens Friday" |
| Voting (Fri–Sun) | Fri–Sun segment filled blue, Mon–Thu gray. Label: "Nominations Closed" / "Voting Open" |
| Closed | All segments gray. Label: "Week Complete" |

---

### 4.2 Nomination Card

**Purpose:** Display a single nomination with voting action.

| Property | Value |
|----------|-------|
| Width | Full width, max 600px centered |
| Min height | 120px |
| Background | `--surface` (white) |
| Border | 1px solid `--border` |
| Border radius | 12px |
| Padding | 16px |
| Margin bottom | 12px |
| Shadow | `0 1px 3px rgba(0,0,0,0.08)` |
| Hover shadow | `0 4px 12px rgba(0,0,0,0.12)` |

**Internal layout:**
```
┌────────────────────────────────────────────────────┐
│ [Avatar 40px]  Nominee Name                        │
│              "Title of the nomination"             │
│              Description text (2 lines max,        │
│              truncated with ellipsis)              │
│                              [Vote count] [Button] │
└────────────────────────────────────────────────────┘
```

**Typography:**
- Nominee name: 16px, semibold, `--text-primary`
- Title: 14px, regular, `--text-primary`, italic
- Description: 13px, regular, `--text-secondary`, line-clamp: 2
- Vote count: 12px, medium, `--text-secondary`

**Vote button states:**
| State | Appearance |
|-------|------------|
| Default | Outlined button, `--primary` border, `--primary` text, "Vote" |
| Hover | Filled background `--primary`, white text |
| Voted | Filled button, `--primary` background, white text, "✓ Voted" |
| Disabled (votes exhausted) | Gray background, gray text, "No votes left" |
| Disabled (own nomination) | Gray background, gray text, "Can't vote for yourself" |

---

### 4.3 Winner Card (History)

**Purpose:** Display a past winner in the history grid.

| Property | Value |
|----------|-------|
| Width (grid) | 240px (desktop), 160px (tablet), 100% (mobile list) |
| Height | 200px (desktop), auto (mobile) |
| Background | `--surface` |
| Border | 1px solid `--border` |
| Border radius | 12px |
| Padding | 16px |
| Hover | Lift effect: `translateY(-4px)`, enhanced shadow |

**Internal layout (grid):**
```
┌──────────────────────┐
│  [Avatar 48px]       │
│                      │
│  Nominee Name        │
│  "Title"             │
│                      │
│  Week of May 5-11    │
│  🗳️ 18 votes         │
└──────────────────────┘
```

**Internal layout (expanded detail):**
- Expands inline below the card
- Shows all nominations from that week in a ranked list
- Each row: rank number, nominee name, title, vote count
- Winner row highlighted with gold left border (3px)

---

### 4.4 Countdown Timer

**Purpose:** Show time remaining for Win of the Month voting.

| Property | Value |
|----------|-------|
| Height | 56px |
| Background | Linear gradient: `--primary` to `--primary-dark` |
| Border radius | 12px |
| Padding | 12px 16px |
| Text color | White |
| Font | 14px, medium |
| Progress bar height | 4px |
| Progress bar background | White at 30% opacity |
| Progress bar fill | White at 90% opacity |

**Format:** "Voting closes in 3d 14h 22m"
- Updates every 60 seconds
- When < 1 hour: "Voting closes in 45m" (red tint)
- When < 10 minutes: "Voting closes in 8m" (pulsing red)

---

### 4.5 Vote Counter Badge

**Purpose:** Show remaining votes in the header.

| Property | Value |
|----------|-------|
| Position | Top right of section header |
| Background | `--primary` with 15% opacity |
| Text color | `--primary` |
| Border radius | 20px (pill) |
| Padding | 4px 12px |
| Font | 13px, semibold |
| Icon | Small ballot box icon before text |

**States:**
| State | Appearance |
|-------|------------|
| Votes remaining | "3 votes left" — blue pill |
| 1 vote remaining | "1 vote left" — amber pill |
| No votes remaining | "All votes used" — green pill with checkmark |

---

### 4.6 Achievement Badge (Inline)

**Purpose:** Show awarded achievement within winner announcement.

| Property | Value |
|----------|-------|
| Background | Gold gradient: `#FFD700` to `#FFA500` at 15% opacity |
| Border | 1px solid `#FFD700` at 40% opacity |
| Border radius | 8px |
| Padding | 8px 12px |
| Icon | Material icon, 20px, `#FFD700` |
| Text | 13px, semibold, `#B8860B` |
| Points | 13px, bold, `#B8860B` |

**Format:**
```
┌──────────────────────────────────────┐
│ 🏅  Weekly Champion    +10 points   │
└──────────────────────────────────────┘
```

---

### 4.7 Progress Bar (WoM Collection)

**Purpose:** Show progress toward generating a Win of the Month contest.

| Property | Value |
|----------|-------|
| Height | 8px |
| Background | `--surface-variant` |
| Border radius | 4px |
| Fill color | `--primary` |
| Fill border radius | 4px |
| Label | Below bar, 12px, `--text-secondary` |

**Format:**
```
[████████████░░░░░░░░]
3 of 4 weekly wins collected
```

---

### 4.8 Cross-Promotion Banner

**Purpose:** Link between WoW and WoM features.

| Property | Value |
|----------|-------|
| Background | `--primary` at 8% opacity |
| Border | 1px solid `--primary` at 20% opacity |
| Border left | 3px solid `--primary` |
| Border radius | 8px |
| Padding | 12px 16px |
| Margin | 16px 0 |

**Content:**
- Icon: trophy emoji or Material `emoji_events`
- Text: "Win of the Month voting is open! Vote for your favorite weekly winner"
- Link: "Vote now →" in `--primary` color

**Dismissal:** Not dismissable — persists while WoM is active.

---

### 4.9 Toast Notifications

| Type | Appearance | Duration |
|------|------------|----------|
| Success (nomination submitted) | Green left border, checkmark icon, "Nomination submitted!" | 3s |
| Success (vote cast) | Blue left border, checkmark icon, "Vote cast! 2 votes remaining" | 3s |
| Success (vote removed) | Gray left border, undo icon, "Vote removed" | 2s |
| Achievement awarded | Gold left border, trophy icon, "You won Win of the Week! +10 points" | 5s |
| Error | Red left border, error icon, error message | 5s |
| Info | Blue left border, info icon | 4s |

**Position:** Bottom-right corner (desktop), bottom-center (mobile)

---

## 5. State Machine Diagrams

### 5.1 Win of the Week Lifecycle

```
                    ┌──────────────┐
                    │   No Week    │
                    │   Exists     │
                    └──────┬───────┘
                           │
                    Auto-create on
                    first access
                           │
                           ▼
              ┌────────────────────────┐
              │   NOMINATING PHASE     │
              │   Mon 00:00 – Thu 23:59│
              │                        │
              │  • Users submit noms   │
              │  • No voting UI        │
              │  • Schedule bar shows  │
              │    "Nominations Open"  │
              └──────────┬─────────────┘
                         │
                  Friday 00:00
                  (auto-transition)
                         │
                         ▼
              ┌────────────────────────┐
              │    VOTING PHASE        │
              │   Fri 00:00 – Sun 23:59│
              │                        │
              │  • Vote buttons visible│
              │  • 3 votes per user    │
              │  • Votes removable     │
              │  • Countdown visible   │
              └──────────┬─────────────┘
                         │
                  Monday 00:00
                  (auto-transition)
                         │
                         ▼
              ┌────────────────────────┐
              │    CLOSED PHASE        │
              │   Mon 00:00 onward     │
              │                        │
              │  • Winner announced    │
              │  • Achievement awarded │
              │  • No more votes       │
              │  • Triggers WoM check  │
              └──────────┬─────────────┘
                         │
                  Next Monday 00:00
                  (new week created)
                         │
                         ▼
              ┌────────────────────────┐
              │   NOMINATING PHASE     │
              │   (new cycle begins)   │
              └────────────────────────┘
```

### 5.2 Win of the Month Lifecycle

```
              ┌────────────────────────┐
              │   NO ACTIVE MONTH      │
              │                        │
              │  • Waiting for 4+      │
              │    closed weeks        │
              │  • Progress bar shows  │
              │    collection status   │
              └──────────┬─────────────┘
                         │
                  4+ closed weeks
                  in current month
                  (auto-generate)
                         │
                         ▼
              ┌────────────────────────┐
              │   VOTING PHASE         │
              │   5 days from creation │
              │                        │
              │  • Weekly winners as   │
              │    nominations         │
              │  • 3 votes per user    │
              │  • Countdown timer     │
              │  • Votes removable     │
              └──────────┬─────────────┘
                         │
                  VotingEndsAt reached
                  (auto-close or admin)
                         │
                         ▼
              ┌────────────────────────┐
              │   CLOSED PHASE         │
              │                        │
              │  • Winner announced    │
              │  • Monthly Champion    │
              │    achievement (+50)   │
              │  • Voter achievement   │
              │    to all (+5 each)    │
              │  • Final standings     │
              │    displayed           │
              └────────────────────────┘
```

### 5.3 Combined Feature State Map

```
Week State          WoM State           User Sees
─────────────────────────────────────────────────────────────
Nominating          No active month     Nomination form + schedule
Nominating          WoM voting active   Nomination form + WoM banner
Voting              No active month     Vote buttons + schedule
Voting              WoM voting active   Vote buttons + WoM banner
Closed              No active month     Winner announcement
Closed              WoM voting active   Winner + WoM banner
Closed              WoM closed          Winner + WoM results
Closed              WoM generating      Winner + "Next month coming soon"
```

---

## 6. Microcopy Reference

### 6.1 Buttons

| Context | Label | Tooltip |
|---------|-------|---------|
| Submit nomination | `Submit Nomination` | — |
| Cast weekly vote | `Vote` | "Cast your vote for this nominee" |
| Remove weekly vote | `✓ Voted` | "Click to remove your vote" |
| Cast monthly vote | `Vote` | "Vote for Monthly Champion" |
| Remove monthly vote | `✓ Voted` | "Click to remove your vote" |
| View history | `View past winners →` | — |
| Load more history | `Load More` | — |
| View month history | `View past monthly winners →` | — |
| Go to WoW (from WoM empty) | `Go to Win of the Week →` | — |
| Expand week detail | `View all nominations` | — |
| Collapse week detail | `Show less` | — |
| Close month (admin) | `Close Month & Declare Winner` | "End voting and announce the winner" |
| Generate month (admin) | `Generate Month Contest` | "Create this month's contest from closed weeks" |

### 6.2 Headers & Labels

| Context | Text |
|---------|------|
| WoW section header | `Win of the Week` |
| History section header | `Win of the Week History` |
| WoM section header (active) | `Win of the Month — {Month Year}` |
| WoM section header (closed) | `Win of the Month — {Month Year}` |
| Nomination form title | `Nominate someone for this week's win` |
| Nominee field label | `Nominee` |
| Title field label | `Title` |
| Description field label | `Description` |
| Your nominations section | `Your Nominations This Week` |
| Winner announcement header | `This Week's Winner` |
| Monthly winner header | `{Month Year} Champion` |
| Final standings header | `Final Standings` |
| Vote counter | `{N} votes left` |
| Countdown label | `Voting closes in {time}` |
| Source week badge | `Week of {date}` |

### 6.3 Empty States

| Context | Text | Subtext |
|---------|------|---------|
| No WoW history | `No winners yet` | `Be the first to win! Nominate someone in Win of the Week.` |
| No nominations this week | `No nominations yet` | `Be the first to nominate someone this week!` |
| No active WoM | `Next month's contest is on its way!` | `We need 4 weekly winners to start the monthly vote.` |
| No WoM history | `No monthly contests yet` | `Monthly contests begin after enough weekly wins are recorded.` |
| No user nominations | `You haven't nominated anyone yet` | `Select a teammate above to get started.` |

### 6.4 Status Messages

| Context | Text |
|---------|------|
| Nomination submitted | `Nomination submitted! Voting opens Friday.` |
| Vote cast | `Vote cast! {N} votes remaining.` |
| Vote removed | `Vote removed.` |
| All votes used | `All votes cast! Results will be announced Sunday night.` |
| Can't vote for self | `You can't vote for your own nomination.` |
| Voting ended | `Voting has closed. The winner has been announced.` |
| Week closed, user won | `You won Win of the Week! +10 points` |
| Month closed, user won | `You are the Win of the Month Champion! +50 points` |
| Month voter award | `Thanks for voting in Win of the Month! +5 points` |
| Duplicate nomination | `You've already nominated this person this week.` |
| Already voted | `You've already voted for this nominee.` |

### 6.5 Error Messages

| Context | Text |
|---------|------|
| Nomination failed | `Failed to submit nomination. Please try again.` |
| Vote failed | `Failed to cast vote. Please try again.` |
| Vote after close | `Voting has closed for this contest.` |
| Vote before open | `Voting hasn't opened yet. Check back Friday!` |
| Max votes exceeded | `You've used all your votes for this contest.` |
| Network error | `Connection lost. Please check your internet and try again.` |
| Unauthorized | `You must be logged in to vote.` |
| Week not found | `This week's data is no longer available.` |

### 6.6 Tooltips

| Element | Tooltip |
|---------|---------|
| Schedule bar | "Nominations are open Mon–Thu. Voting is open Fri–Sun." |
| Vote count on card | "Current vote count" |
| Source week badge (WoM) | "This person won the week of {date}" |
| Achievement badge | "Awarded for winning Win of the Week" |
| Progress bar (WoM collection) | "Weekly wins collected toward next month's contest" |
| Year filter dropdown | "Filter winners by year" |

---

## 7. Accessibility

### 7.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | All text meets 4.5:1 minimum ratio. Gold achievement text uses `#B8860B` on `#FFF8DC` background (7.2:1). |
| Focus indicators | All interactive elements have visible focus ring: 2px solid `--primary` with 2px offset. |
| Keyboard navigation | Full tab order: tabs → form fields → buttons → cards → pagination. Enter/space activates buttons. Escape closes expanded cards. |
| Screen reader labels | All icons have `aria-label`. Vote buttons: "Vote for [Name]" / "Remove vote for [Name]". Schedule bar: "Current phase: Nominations Open". |
| Live regions | Vote count changes announced via `aria-live="polite"`. Winner announcements via `aria-live="assertive"`. Countdown timer via `aria-live="off"` (updated every 60s, not every second). |
| Reduced motion | All animations respect `prefers-reduced-motion`. Confetti replaced with static badge. Card transitions become instant. |
| Touch targets | All buttons minimum 44x44px touch area. Vote buttons have 48px height. |
| Form labels | All form fields have visible labels (not placeholders-only). Error messages linked via `aria-describedby`. |

### 7.2 Semantic HTML Structure

```html
<!-- Schedule bar -->
<nav aria-label="Weekly schedule">
  <div role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="7">
    <!-- Visual bar -->
  </div>
</nav>

<!-- Nomination card -->
<article aria-labelledby="nomination-{id}">
  <h3 id="nomination-{id}">Nominee Name</h3>
  <p>"Title"</p>
  <p>Description</p>
  <button aria-label="Vote for Nominee Name">Vote</button>
</article>

<!-- Winner announcement -->
<section aria-label="Winner announcement">
  <h2>This Week's Winner</h2>
  <div role="status" aria-live="assertive">
    <!-- Winner content -->
  </div>
</section>

<!-- Vote counter -->
<span role="status" aria-live="polite" aria-atomic="true">
  3 votes left
</span>
```

### 7.3 Color Blindness Considerations

| Scenario | Solution |
|----------|----------|
| Schedule bar phase distinction | Blue fill + text label (not color-only). Pattern overlay option for deuteranopia. |
| Vote button states | Outline (default) vs filled (voted) — shape difference, not just color. Checkmark icon for voted state. |
| Winner highlighting | Gold left border + trophy icon + bold text — not color-only. |
| Error states | Red border + error icon + text message — never color-only. |

---

## 8. Animations & Transitions

### 8.1 Transition Specifications

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Card hover lift | `translateY(-4px)` + shadow increase | 200ms | `ease-out` |
| Vote button click | Scale down to 0.95, then fill animation | 150ms | `ease-in-out` |
| Vote count increment | Number count-up animation | 300ms | `ease-out` |
| Card expand (history detail) | Height expand + fade in content | 300ms | `ease-out` |
| Card collapse | Height shrink + fade out content | 200ms | `ease-in` |
| Toast enter | Slide up from bottom + fade in | 300ms | `ease-out` |
| Toast exit | Fade out + slide down | 200ms | `ease-in` |
| Tab switch | Fade old content, fade new content | 200ms | `ease-in-out` |
| Winner announcement | Scale up from 0.9 + fade in | 400ms | `ease-out` |
| Achievement badge appear | Pop-in with slight overshoot | 300ms | `spring(1, 80, 15, 0)` |
| Confetti (monthly winner) | Particle burst from center | 2000ms | physics-based |
| Progress bar fill | Width animation | 500ms | `ease-out` |
| Countdown update | Number flip (no animation, just replace) | — | — |
| Load more spinner | Rotating circle | continuous | linear |

### 8.2 Confetti Specification (Monthly Winner)

- Triggered only on Win of the Month winner announcement
- Duration: 2 seconds
- Particles: 50-80 gold and white particles
- Origin: Center of winner banner
- Spread: 180-degree arc upward
- Particle size: 4-8px random
- Respects `prefers-reduced-motion`: replaced with a static gold glow effect

### 8.3 Skeleton Loading States

| View | Skeleton |
|------|----------|
| WoW current | 3 nomination card skeletons (avatar circle + 3 text lines + button rectangle) |
| History grid | 8 card skeletons (avatar circle + 2 text lines + badge rectangle) |
| WoM current | Countdown skeleton + 4 nomination card skeletons |
| WoM empty | Progress bar skeleton + 3 past winner row skeletons |

**Skeleton style:** `--surface-variant` background with shimmer animation (left-to-right gradient sweep, 1.5s loop).

---

## 9. Mobile Adaptations

### 9.1 Layout Changes

| Element | Desktop | Tablet (768px) | Mobile (375px) |
|---------|---------|----------------|----------------|
| Fun Hub tabs | Horizontal row | Horizontal, scrollable | Horizontal, scrollable, smaller font |
| Schedule bar | Full width, day labels | Full width, abbreviated labels | Stacked: "Phase: Nominations Open" + mini bar |
| Nomination cards | Max 600px, centered | Max 500px | Full width, edge-to-edge |
| History view | 4-column grid | 3-column grid | Single column list |
| WoM nominations | 2-column card grid | Single column | Single column, compact |
| Vote counter badge | Top right of header | Top right, smaller | Inline with header text |
| Winner announcement | Centered large card | Full width card | Full width, smaller avatar |
| Toast | Bottom-right | Bottom-right | Bottom-center, full width |

### 9.2 Touch Optimizations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Vote button | 32px height, click | 48px height, tap |
| Card tap area | Hover for detail | Tap to expand (no hover state) |
| Schedule bar | Hover for tooltip | Tap for info popover |
| Year filter | Dropdown on hover | Bottom sheet picker |
| Load more | Button | Pull-to-refresh or large button |
| Form inputs | Standard | Larger tap targets, native pickers |

### 9.3 Mobile-Specific Patterns

**Bottom sheet for expanded history detail:**
- On mobile, tapping a history card opens a bottom sheet (not inline expand)
- Sheet slides up from bottom, covers 70% of viewport
- Shows all nominations from that week
- Dismissed by swipe down or tap outside

**Swipe actions on nomination cards (WoM):**
- Swipe left: "Vote" action (reveals green button)
- Swipe right: "Remove vote" if already voted (reveals gray button)
- Haptic feedback on action trigger

**Sticky vote counter:**
- On mobile, the vote counter sticks to the top of the viewport when scrolling past the header
- Ensures user always knows their remaining votes

**Simplified schedule bar:**
```
┌─────────────────────────────┐
│  Current: Nominations Open  │
│  [████████░░░░░░░░░░░░░░░] │
│  Voting opens Friday        │
└─────────────────────────────┘
```

---

## 10. Design Token Reference

### 10.1 Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#2563EB` | Primary actions, active states, schedule bar |
| `--primary-dark` | `#1D4ED8` | Countdown gradient end |
| `--primary-light` | `#DBEAFE` | Primary backgrounds at 15% |
| `--success` | `#059669` | Success toasts, "all votes used" state |
| `--warning` | `#D97706` | 1 vote remaining state |
| `--error` | `#DC2626` | Error states, overdue countdown |
| `--gold` | `#FFD700` | Achievement badges, winner highlights |
| `--gold-dark` | `#B8860B` | Achievement text |
| `--gold-bg` | `#FFF8DC` | Achievement background |
| `--surface` | `#FFFFFF` | Card backgrounds |
| `--surface-variant` | `#F3F4F6` | Skeleton, inactive schedule segments |
| `--border` | `#E5E7EB` | Card borders |
| `--text-primary` | `#111827` | Primary text |
| `--text-secondary` | `#6B7280` | Secondary text, descriptions |
| `--text-disabled` | `#9CA3AF` | Disabled button text |

### 10.2 Typography Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family` | `Inter, system-ui, sans-serif` | All text |
| `--font-mono` | `JetBrains Mono, monospace` | Vote counts, timers |
| `--text-xs` | `12px / 1.4` | Labels, vote counts, tooltips |
| `--text-sm` | `13px / 1.4` | Descriptions, secondary text |
| `--text-base` | `14px / 1.5` | Body text |
| `--text-lg` | `16px / 1.4` | Nominee names, card titles |
| `--text-xl` | `20px / 1.3` | Section headers |
| `--text-2xl` | `24px / 1.2` | Page titles |
| `--text-3xl` | `32px / 1.2` | Winner names (announcement) |
| `--font-regular` | `400` | Body text |
| `--font-medium` | `500` | Labels, counters |
| `--font-semibold` | `600` | Names, buttons |
| `--font-bold` | `700` | Headers, points values |

### 10.3 Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight padding |
| `--space-2` | `8px` | Small gaps |
| `--space-3` | `12px` | Card internal spacing |
| `--space-4` | `16px` | Standard padding |
| `--space-5` | `20px` | Section gaps |
| `--space-6` | `24px` | Large gaps |
| `--space-8` | `32px` | Section margins |
| `--space-10` | `40px` | Page margins |
| `--space-12` | `48px` | Hero spacing |

### 10.4 Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Progress bars, small elements |
| `--radius-md` | `8px` | Buttons, badges, banners |
| `--radius-lg` | `12px` | Cards, inputs |
| `--radius-xl` | `16px` | Large cards, modals |
| `--radius-full` | `9999px` | Pills, avatars |

### 10.5 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Default cards |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.12)` | Hovered cards |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.16)` | Modals, toasts |
| `--shadow-gold` | `0 0 20px rgba(255,215,0,0.3)` | Winner announcement |

---

## Appendix A: Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked elements |
| Tablet | 640px – 1024px | 2-3 column grids, compressed spacing |
| Desktop | > 1024px | Full layout, 4-column history grid |

## Appendix B: Icon Reference

| Icon | Material Symbol | Usage |
|------|-----------------|-------|
| Trophy | `emoji_events` | Win of the Week header, weekly achievement |
| Premium trophy | `workspace_premium` | Monthly achievement |
| Vote | `how_to_vote` | Vote buttons, voter achievement |
| Calendar | `calendar_today` | Source week badge |
| History | `history` | History tab |
| Leaderboard | `leaderboard` | Leaderboard tab |
| Casino | `casino` | Spin Wheel tab |
| Timer | `timer` | Countdown timer |
| Check | `check` | Voted state |
| Close | `close` | Dismiss, cancel |
| Expand | `expand_more` | Expand card |
| Collapse | `expand_less` | Collapse card |
| Arrow right | `arrow_forward` | Link indicators |
| Info | `info` | Info banners, tooltips |
| Error | `error` | Error messages |
| Star | `star` | Winner highlight |
| Medal | `military_tech` | Achievement badges |

## Appendix C: Interaction State Matrix

| Component | Default | Hover | Focus | Active | Disabled |
|-----------|---------|-------|-------|--------|----------|
| Vote button | Outline, primary text | Filled primary | Outline + focus ring | Scale 0.95 | Gray, no pointer |
| Submit button | Filled primary | Darker primary | Focus ring | Scale 0.98 | Gray, no pointer |
| History card | Default shadow | Lift + shadow-md | Focus ring | — | — |
| Tab | Text, no border | Text + underline | Focus ring | Filled bg | — |
| Input | Border, white bg | Border primary | Border + focus ring | — | Gray bg |
| Dropdown | Border, white bg | Border primary | Border + focus ring | — | Gray bg |
