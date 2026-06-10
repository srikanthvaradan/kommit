# KOMMIT

Your word, backed.

## What it does

You type what's weighing on you. Ten AI agents argue about it. They surface the truth you're avoiding, not the one you want to hear. Then you back your commitment with money that actually hurts to lose.

If you follow through, your money comes back. If you don't, it goes to a random KOMMIT member — with a note that just says "Failed to KOMMIT."

That's the mechanic. The AI is the entry point. The money is the product.

## Why this exists

Every clarity tool softens. ChatGPT has your history and accommodates you. Therapists charge $300 an hour. Journaling has no consequence.

KOMMIT has zero context about you. Only this moment. And $5 on the line changes behavior in ways that a chatbot never will. Forty years of behavioral economics says so.

## The agent pipeline

Five agents run in sequence. Each one makes a decision.

- **Safety Check (Gus Fring)** — classifies the input before anything fires. Crisis inputs get resources, not analysis.
- **Language Agent (Agent Smith)** — detects language, routes to translation if needed. Card comes back in your language.
- **Comprehend Agent (Hannibal)** — sentiment scores and key phrases. Feeds the search.
- **Query Agent (T-1000)** — builds a semantic Exa search from your key phrases. Not generic wellness results. Your situation, grounded in what's actually happening in the world.
- **Synthesis Agent (Thanos)** — picks the model, picks the prompt, delivers the truth.

The deliberation happens between Clarity, Challenge, and Verdict — three perspectives on the same input, resolved into one card.

## The Stripe mechanic

This is not Stripe as infrastructure. This is Stripe as the product.

User sets their own stake ($5 floor). On forfeit, the stake routes to a random KOMMIT pool member with the metadata "Failed to KOMMIT." That stranger gets curious. They sign up. They become a user. Eventually their stake goes to another stranger.

Stripe Connect is the payout layer. Approval is in progress. The architecture is real.

## Tech stack

Every sponsor tool is load-bearing. Remove any one and something breaks.

- **AWS Transcribe** — voice input, auto language detection, 20+ languages
- **AWS Comprehend** — sentiment and key phrase extraction, always on English post-translation
- **Amazon Translate** — non-English to English before analysis
- **Exa** — situational semantic search, query built by Claude from Comprehend key phrases
- **Claude Haiku** — English synthesis, safety classification
- **Gemini Flash** — non-English synthesis, better Asian language quality
- **Stripe** — behavioral commitment mechanic, pool routing on forfeit
- **Vercel** — deployment, edge functions, country detection for crisis resources
- **Neon PostgreSQL** — users, sessions, commitments, OTP tokens

## Crisis handling

Every input is classified before any processing begins. Crisis inputs get country-specific resources immediately. No card generated. No commitment asked for. This was not an afterthought.

Tamil crisis inputs run a second safety check after translation. The pipeline catches what the original language check cannot.

## Live

https://kommit-ai.vercel.app

Built solo in 30 hours at SuperAI NEXT Hackathon, Singapore, June 2026.
