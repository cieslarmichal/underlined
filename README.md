<div align="center">

# <ins>Underlined</ins>

**Underline a word in your paper book. Snap a photo. Keep reading.**

</div>

Reading a book in a foreign language on paper? Underline the words you don't know with a pencil, take a photo of the page, and Underlined hands you each word translated **the way the book uses it** — then saves it to your personal dictionary.

Kindle has a Vocabulary Builder. Paper books had nothing. Now they do, and the pencil stays.

## How it works

1. **Underline** unknown words while you read.
2. **Photograph** the page. No book, page or language to enter — one tap.
3. **Understand** in ~15 seconds: each word with its base form and its meaning *in that sentence*.
4. **Accept** and the words land on your book's page. Keep reading.

Later, browse everything in the **Words** tab: every word from every book, with the original sentences, search, filters and "most often met" sorting.

## Why it's different

- 📖 **Real context.** Every word comes with the sentence from *your* book, not a made-up dictionary example.
- 🧠 **Meaning, not the first dictionary entry.** The AI knows the book's title and the sentence, so *bank* is "riverbank" in one place and "bank" in another. It even handles invented words — *Hatstall*, *Squib*.
- 🔁 **Base forms and repeats.** *fled* is saved as *flee*. Underline it again and you get "met 2×" instead of a duplicate — a hint that this one is worth remembering.
- 📱 **Installable PWA.** Add it to your home screen and it opens full screen, camera one tap away.

Currently supports English and Spanish books with Polish or English translations.

## Tech

TypeScript monorepo built on [fullstack-starter](https://github.com/cieslarmichal/fullstack-starter).

- **Backend:** Fastify, PostgreSQL + Drizzle, S3, Sharp
- **AI:** any vision model through [OpenRouter](https://openrouter.ai) with strict JSON-schema output (Claude Sonnet 5.5 by default, switch with one config value)
- **Frontend:** React 19, Tailwind, Radix, Vite PWA

## Run locally

```bash
npm install
docker compose up -d            # PostgreSQL + LocalStack (S3)
docker exec underlined-localstack awslocal s3 mb s3://underlined-bucket

export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
npm run db:migrate --workspace=@apps/backend

export OPENROUTER_API_KEY=...   # required
export RESEND_API_KEY=...       # required for verification emails
npm run dev --workspace=@apps/backend
npm run dev --workspace=@apps/frontend
```

Open <http://localhost:5173>. Tests: `npm test`.

## Docs

The product idea, data model and AI contract live in [`docs/MVP.md`](docs/MVP.md) (in Polish).
