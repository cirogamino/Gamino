# Prompt — Block 1C Video Corpus Extraction

Send to agents with `best_at: extraction`. One agent per batch of 10–15 videos.

**Run the calibration pass first:** send this prompt with the *same single video* to three
agents. Compare their rows. If they disagree on what counts as a claim, tighten the prompt
before committing the lane.

---

```
You are extracting structured claims from video transcripts. You are NOT summarizing.
A summary of these videos is worthless to me — I cannot aggregate summaries. I need rows
I can query.

Process this batch of transcripts:
  [PATHS]

Output one row per CLAIM, not per video. A 40-minute video typically yields 5-20 rows.
A claim is any specific, checkable assertion: a tool does X, a workflow has these steps,
this costs that much, this approach fails.

Ignore: intros, outros, channel promotion, restated points, general enthusiasm.

Schema per row:

claim_id:          # video_id + timestamp, e.g. "dQw4w9WgXcQ@12:34"
video_id:
video_url:
video_title:
channel:
published_at:      # the video's date
claim_type:        TOOL | WORKFLOW | TECHNIQUE | PRICING | WARNING | RESULT
timestamp:
verbatim:          # MAX 2 SENTENCES QUOTED EXACTLY FROM THE TRANSCRIPT.
                   # Not paraphrased. This will be grep'd against the source file.
                   # A quote that isn't in the transcript invalidates your entire batch.

# For claim_type: TOOL
canonical_name:    # lowercase, no suffixes. "supabase" not "Supabase.io". "n8n" not "N8N.io".
                   # This is a join key against our software list — normalization matters
                   # more than anything else in this row.
what_it_does:      # max 15 words
agent_drivable:    API | MCP | CLI | BROWSER_ONLY | HUMAN_ONLY | UNKNOWN
cost_mentioned:
prerequisite:      # what else is needed for this to work

# For claim_type: WORKFLOW
steps:             # ordered, as described
inputs_needed:
claimed_outcome:

applies_to_us:     build | content | media | ops | none
status:            CLAIMED          # always CLAIMED. Never write VERIFIED.
hype_score:        # 1 = demonstrated on screen including a failure
                   # 2 = demonstrated, happy path only
                   # 3 = described in detail, not shown
                   # 4 = named in a list, affiliate/discount code mentioned
                   # 5 = "changes everything", no demo, sponsored
extractor_agent:   [your agent id]

RULES:
1. verbatim is mandatory and must be exact. It is the receipt. 5% of your rows will be
   grep'd against the transcript; any miss re-runs your whole batch.
2. Never mark anything VERIFIED. Everything in a video is a claim until an agent runs it.
   Creators are paid to make tools sound like they work.
3. Extract WARNINGs aggressively — "I tried X and it didn't work", "watch out for Y".
   These are the most valuable rows in the corpus and they are always asides, so they are
   easy to miss. Do not miss them.
4. If a video is 40 minutes of hype with no specific claims, output one row with
   claim_type: RESULT, hype_score: 5, and note that. Don't manufacture rows to look thorough.

Output YAML. No prose before or after.
```
