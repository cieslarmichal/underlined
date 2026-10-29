# Underlined — MVP

## Idea

Czytasz papierową książkę w obcym języku i podkreślasz ołówkiem słowa, których nie znasz. Robisz zdjęcie strony, a aplikacja:

1. znajduje podkreślone słowa,
2. wyciąga zdanie z książki, w którym każde z nich występuje,
3. tłumaczy słowo i całe zdanie,
4. zapisuje to w twoim słowniku przypisanym do książki.

Słowa przegląda się na **Boardzie**, czyli liście wszystkich zapisanych słów ze zdaniami, tłumaczeniami i książką, z której pochodzą.

## Co wyróżnia aplikację

- **Papierowa książka.** Kindle ma Vocabulary Builder, a dla papieru nie ma nic. Ołówek zostaje, aplikacja tylko go wspiera.
- **Prawdziwy kontekst.** Każde słowo ma zdanie z książki, którą czytasz, a nie wymyślony przykład ze słownika.
- **Znaczenie w kontekście.** AI zna tytuł książki i zdanie, więc tłumaczy słowo tak, jak jest użyte w tym miejscu, a nie podaje pierwszego znaczenia ze słownika.
- **Forma podstawowa i powtórzenia.** *fled* zapisuje się jako *flee*. Jeśli podkreślisz to samo słowo drugi raz, nie powstaje duplikat. Słowo dostaje kolejne zdanie i licznik „spotkane 2×”, który pokazuje, że to słowo warto zapamiętać.

## Zakres MVP

### W MVP

1. **Konto.** Rejestracja i logowanie ze startera.
2. **Książki.** Dodawanie, lista i usuwanie. Pola:
   - tytuł (wymagany; AI używa go jako kontekstu),
   - autor (opcjonalny),
   - język książki (np. `en`),
   - język tłumaczenia (np. `pl`).
3. **Dodanie zdjęcia strony.**
   - Wybierasz książkę, robisz zdjęcie albo bierzesz je z galerii, opcjonalnie podajesz numer strony.
   - Zdjęcie jest zmniejszane w przeglądarce (dłuższy bok około 2000 px) i wysyłane na serwer.
   - Backend zapisuje zdjęcie w S3 i wywołuje model, który zwraca listę słów (schemat poniżej).
4. **Podgląd wyniku przed zapisem.**
   - Lista rozpoznanych słów z checkboxami, domyślnie zaznaczonymi.
   - Możesz odznaczyć błędnie rozpoznane słowo i poprawić tłumaczenie.
   - Przycisk „Zapisz” zapisuje zaznaczone słowa.
   - Ten krok jest potrzebny, bo AI będzie się czasem mylić, a śmieci w bazie zniechęcają do nauki.
5. **Board.**
   - Karty słów: forma podstawowa, tłumaczenie, krótka definicja, a pod spodem zdania z książki (oryginał + tłumaczenie, tytuł książki, strona).
   - Filtr po książce (zakładki albo select z opcją „Wszystkie”).
   - Wyszukiwarka po słowie i tłumaczeniu.
   - Sortowanie: najnowsze albo najczęściej spotykane.
   - Edycja tłumaczenia i usunięcie słowa.

### Poza MVP (później)

- Fiszki i powtórki w odstępach (FSRS)
- Wymowa (TTS)
- Eksport do Anki/CSV
- Wiele zdjęć naraz i przetwarzanie w tle (pg-boss)
- PWA: instalacja na ekranie głównym, powiadomienia
- Natywna aplikacja (Expo)
- Okładki i wyszukiwanie książek w zewnętrznej bazie

## Przepływ użytkownika

```
[Książki] → + Dodaj książkę (tytuł, język, język docelowy)
    ↓
[Książka] → 📷 Dodaj stronę → (zdjęcie, nr strony)
    ↓  ~10–20 s, ekran ładowania
[Podgląd] → ☑ fled → uciekać — "Harry fled the room…" / "Harry uciekł z pokoju…"
           ☑ reluctant → niechętny — …
           ☐ (błędnie rozpoznane)
    ↓ Zapisz
[Board] ← filtr: Wszystkie | Harry Potter 1 | …
```

## Model danych

```
books
  id, user_id, title, author?, source_language, target_language, created_at

captures                       -- jedno zdjęcie strony
  id, user_id, book_id, image_key (S3), page_number?, created_at

words                          -- unikalne per (user_id, source_language, lemma)
  id, user_id, lemma, source_language, target_language,
  translation, definition, created_at, updated_at

word_occurrences               -- konkretne użycie w książce
  id, word_id, book_id, capture_id,
  surface_form,                -- forma w tekście, np. "fled"
  sentence, sentence_translation, contextual_translation,
  page_number?, created_at
```

- Filtr po książce: słowa, które mają przynajmniej jedno wystąpienie w danej książce.
- „Spotkane N×” to liczba wystąpień słowa.
- Przy zapisie: jeśli słowo z danym lematem już istnieje, dodajemy tylko nowe wystąpienie, a tłumaczenie zostaje stare.

## Kontrakt AI

**Wejście:** zdjęcie strony, tytuł i autor książki, język książki i język docelowy.

**Zadanie:** znaleźć słowa lub wyrażenia **podkreślone ręcznie** (ołówek, długopis, zakreślacz) i dla każdego zwrócić dane według schematu. Model ignoruje słowa, które nie są podkreślone. Wyrażenia wielowyrazowe (*give up*) traktuje jako jedną pozycję.

**Wyjście** (structured output / JSON schema):

```json
{
  "items": [
    {
      "surface_form": "fled",
      "lemma": "flee",
      "translation": "uciekać",
      "contextual_translation": "uciekł",
      "definition": "uciec szybko przed niebezpieczeństwem",
      "sentence": "Harry fled the room before anyone could stop him.",
      "sentence_translation": "Harry uciekł z pokoju, zanim ktokolwiek zdążył go zatrzymać."
    }
  ]
}
```

- Model: Claude (Sonnet) z obsługą obrazów i wymuszonym schematem JSON.
- Definicja jest w języku docelowym. Ma być krótka, bez zbędnego tekstu.
- Pusta lista `items` oznacza, że nic nie jest podkreślone. Frontend pokazuje wtedy komunikat i wskazówkę, jak zrobić lepsze zdjęcie.
- Zdanie przecięte końcem strony: zwracamy fragment, który jest widoczny.

## API

```
POST   /books                  utworzenie książki
GET    /books                  lista książek
DELETE /books/:id              usunięcie książki

POST   /books/:id/captures     upload zdjęcia + nr strony → zwraca rozpoznane items (bez zapisu słów)
POST   /captures/:id/words     zapis zaznaczonych (i ewentualnie poprawionych) items

GET    /words?bookId=&q=&sort=  Board
PATCH  /words/:id              edycja tłumaczenia/definicji
DELETE /words/:id              usunięcie słowa (z wystąpieniami)
```

## Ekrany

1. Logowanie / rejestracja (ze startera)
2. Lista książek z przyciskiem „Dodaj książkę”
3. Dodanie zdjęcia: wybór książki, aparat, numer strony
4. Podgląd wyniku z checkboxami i edycją
5. Board: filtr, wyszukiwarka, sortowanie, karty słów

Interfejs projektujemy najpierw pod telefon. Desktop to tylko szersza wersja Boardu.

## Ryzyka do sprawdzenia przed budową UI

1. **Jakość rozpoznawania.** Przetestować prompt na 20–30 prawdziwych zdjęciach: ołówek, długopis, zakreślacz, krzywe ujęcie, zagięcie przy grzbiecie.
2. **Koszt jednego zdjęcia.** Policzyć na podstawie testów (tokeny obrazu i odpowiedzi).
3. **Czas odpowiedzi.** Jeśli przekracza ~20 s, przenieść przetwarzanie do pg-boss wcześniej, niż zakłada plan.

## Stack

Na bazie `fullstack-starter`:

- Fastify, PostgreSQL + Drizzle, React 19, Tailwind, Radix
- S3 + Sharp (już w starterze)
- Anthropic SDK do wywołań modelu
