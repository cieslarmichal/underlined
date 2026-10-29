# Underlined — MVP

## Idea

Czytasz papierową książkę w obcym języku i podkreślasz ołówkiem słowa, których nie znasz. Robisz zdjęcie strony, a aplikacja:

1. znajduje podkreślone słowa,
2. wyciąga zdanie z książki, w którym każde z nich występuje,
3. tłumaczy słowo na twój język ojczysty w znaczeniu, w jakim jest użyte w tym zdaniu,
4. od razu pokazuje wynik, żebyś zrozumiał tekst i czytał dalej,
5. po akceptacji zapisuje słowa na stronie książki.

Wszystkie słowa ze wszystkich książek przegląda się na **Boardzie**.

## Co wyróżnia aplikację

- **Papierowa książka.** Kindle ma Vocabulary Builder, a dla papieru nie ma nic. Ołówek zostaje, aplikacja tylko go wspiera.
- **Prawdziwy kontekst.** Każde słowo ma zdanie z książki, którą czytasz, a nie wymyślony przykład ze słownika.
- **Znaczenie w kontekście.** AI zna tytuł książki i zdanie, więc tłumaczy słowo tak, jak jest użyte w tym miejscu, a nie podaje pierwszego znaczenia ze słownika.
- **Forma podstawowa i powtórzenia.** *fled* zapisuje się jako *flee*. Jeśli podkreślisz to samo słowo drugi raz, nie powstaje duplikat. Słowo dostaje kolejne zdanie i licznik „spotkane 2×”, który pokazuje, że to słowo warto zapamiętać.

## Zasady UX

- **Minimum informacji w trakcie czytania.** Przy zdjęciu nie podajesz nic: ani książki, ani strony, ani języka.
- **Wynik od razu.** Tłumaczenie jest potrzebne teraz, żeby zrozumieć tekst, a nie później.
- **W trakcie czytania tylko słowo i znaczenie.** Zdanie właśnie masz przed oczami, więc podgląd i strona książki go nie pokazują. Zdanie zapisujemy i pokazujemy dopiero na Boardzie, do nauki.
- **Bez poprawiania w telefonie.** Podgląd ma tylko dwie akcje: „Przyjmij wszystkie” albo „Odrzuć”. Pojedyncze złe słowo usuwasz później ze strony książki albo z Boardu.

## Języki

- **Język ojczysty** (język tłumaczeń) podajesz przy rejestracji i zmieniasz w ustawieniach profilu. Na start: `pl` albo `en`.
- **Język książki** wybierasz przy dodawaniu książki. Na start: `en` albo `es`.
- Język książki nie może być taki sam jak język ojczysty (walidacja w formularzu i na backendzie).
- Zmiana języka ojczystego działa tylko na nowe zdjęcia. Stare słowa zostają z tłumaczeniem w poprzednim języku.
- **Interfejs aplikacji jest po angielsku**, niezależnie od języka ojczystego (aplikacja ma być globalna). Tłumaczone są tylko słowa z książek, nie UI.
- Główne przypadki użycia: `en → pl` i `es → pl`. Pozostałe kombinacje dozwolonych języków (np. `es → en`) też działają, ale nie są priorytetem przy testach promptu.

## Zakres MVP

### W MVP

1. **Konto.** Rejestracja i logowanie ze startera. Przy rejestracji dodatkowo język ojczysty. Ustawienia profilu ze zmianą języka ojczystego.
2. **Książki.** Dodawanie, lista, edycja i usuwanie. Pola:
   - tytuł (wymagany; AI używa go jako kontekstu),
   - autor (opcjonalny),
   - język książki (`en` / `es`).

   Książki nie da się usunąć, dopóki ma zapisane słowa. Najpierw usuwasz słowa, potem książkę.
3. **Strona książki.** Główny ekran w trakcie czytania.
   - Lista słów z tej książki („słowo → znaczenie”) i duży przycisk 📷.
   - Aplikacja po uruchomieniu otwiera ostatnio otwartą książkę.
   - Baner „N zdjęć czeka na akceptację”, jeśli zamknąłeś podgląd bez decyzji.
4. **Dodanie zdjęcia strony.**
   - Na stronie książki klikasz 📷 i od razu otwiera się tylny aparat. Obok jest mały link „z galerii”. Nic więcej nie podajesz.
   - Zdjęcie jest zmniejszane w przeglądarce (dłuższy bok około 2000 px) i wysyłane na serwer.
   - Backend zapisuje zdjęcie w S3, wywołuje model synchronicznie i zwraca wynik (schemat poniżej).
   - Dzienny limit zdjęć na użytkownika (domyślnie 10, zmienialny w bazie per użytkownik).
5. **Podgląd wyniku.**
   - Lista słów: forma podstawowa → znaczenie w kontekście. Bez zdania, bo właśnie je czytasz.
   - Dwa przyciski: „Przyjmij wszystkie” i „Odrzuć”. Bez checkboxów i bez edycji.
   - Słowo, które już masz, jest oznaczone „już masz (N×)”. Po akceptacji dostaje nowe wystąpienie ze swoim zdaniem i znaczeniem.
   - Pusta lista: komunikat i wskazówka, jak zrobić lepsze zdjęcie.
   - Błąd modelu: przycisk „Spróbuj ponownie”, który przetwarza to samo zdjęcie bez ponownego uploadu.
6. **Board.** Wszystkie słowa ze wszystkich książek.
   - Karty słów: forma podstawowa i znaczenia ze wszystkich wystąpień bez powtórzeń (np. *bank* — brzeg, bank).
   - Zdania z książki są domyślnie zwinięte pod „Pokaż zdania (N)”. Po rozwinięciu: oryginał z wyróżnionym słowem, znaczenie w tym zdaniu i tytuł książki.
   - Filtr po książce (select z opcją „Wszystkie”).
   - Wyszukiwarka po słowie i tłumaczeniu.
   - Sortowanie: najnowsze albo najczęściej spotykane.
7. **Edycja i usuwanie słów** (na stronie książki i na Boardzie, czyli w domu, a nie w trakcie czytania).
   - Edycja znaczenia przy konkretnym zdaniu.
   - Usunięcie na stronie książki usuwa wystąpienia słowa w tej książce. Jeśli słowo nie ma już żadnych wystąpień, usuwamy je całe.
   - Usunięcie na Boardzie usuwa całe słowo ze wszystkimi wystąpieniami.
8. **PWA.** Instalacja na ekranie głównym i działanie na pełnym ekranie jak natywna aplikacja (szczegóły w sekcji „Aplikacja w telefonie”).

### Poza MVP (później)

- Fiszki i powtórki w odstępach (FSRS)
- Wymowa (TTS)
- Eksport do Anki/CSV
- Wiele zdjęć naraz i przetwarzanie w tle (pg-boss)
- Wybór pojedynczych słów i poprawki w podglądzie
- Tłumaczenie całego zdania na żądanie
- Więcej języków (ojczystych i książek)
- Powiadomienia push
- Tryb offline
- Natywna aplikacja (Expo)
- Okładki i wyszukiwanie książek w zewnętrznej bazie

## Przepływ użytkownika

```text
[Rejestracja] → email, hasło, język ojczysty (pl/en)
    ↓
[Książki] → + Dodaj książkę (tytuł, autor?, język książki)
    ↓
[Strona książki] ← start aplikacji = ostatnio otwarta książka
    ↓ 📷 (zdjęcie, nic więcej)
    ↓ ~10–20 s, ekran ładowania
[Podgląd] → flee → uciekać
            reluctant → niechętny  (już masz, 2×)
            Hatstall → sytuacja, gdy Tiara długo nie może przydzielić ucznia do domu
    ↓ Przyjmij wszystkie / Odrzuć
[Strona książki] ← nowe słowa na liście, czytasz dalej
```

## Model danych

```text
users                          -- ze startera, plus:
  native_language,             -- 'pl' | 'en'
  daily_capture_limit          -- domyślnie 10

books
  id, user_id, title, author?, language, created_at
                               -- language: 'en' | 'es', różny od native_language

captures                       -- jedno zdjęcie strony
  id, user_id, book_id, image_key (S3),
  target_language,             -- język ojczysty w chwili zdjęcia
  status,                      -- pending_review | accepted | rejected | failed
  ai_result (jsonb),           -- surowy wynik modelu, z niego zapisujemy słowa
  created_at

words                          -- unikalne per (user_id, source_language, target_language, lemma)
  id, user_id, lemma, source_language, target_language, created_at

word_occurrences               -- konkretne użycie w książce
  id, word_id, book_id, capture_id,
  surface_form,                -- forma w tekście, np. "fled"
  sentence,                    -- zdanie z książki w oryginale
  translation,                 -- znaczenie w tym zdaniu, forma podstawowa
  created_at
```

### Słowo a wystąpienie

`words` to hasło w twoim słowniku: jedno na dany lemat, niezależnie od tego, ile razy i w ilu książkach je podkreśliłeś. `word_occurrences` to każde konkretne miejsce, w którym je spotkałeś. Liczba wystąpień to licznik „spotkane N×”.

Przykład: podkreślasz *fled* w „Harrym Potterze”, a potem *flees* w „Hobbicie”. Powstaje jedno słowo `flee` i dwa wystąpienia.

**`words`**

| Kolumna | Znaczenie | Przykład |
| --- | --- | --- |
| `id` | identyfikator słowa | |
| `user_id` | właściciel; każdy użytkownik ma własny słownik | |
| `lemma` | forma podstawowa (słownikowa) słowa; po niej łączymy powtórzenia | `flee` |
| `source_language` | język słowa, czyli język książki | `en` |
| `target_language` | język tłumaczenia, czyli język ojczysty w chwili pierwszego zapisu | `pl` |
| `created_at` | kiedy słowo pierwszy raz trafiło do słownika (sortowanie „najnowsze”) | |

Klucz unikalności `(user_id, source_language, target_language, lemma)`: angielskie `flee` z tłumaczeniem na polski to jedno słowo, nawet z dziesięciu książek. Po zmianie języka ojczystego na `en` to samo `flee` staje się osobnym słowem, żeby nie mieszać tłumaczeń w dwóch językach.

**`word_occurrences`**

| Kolumna | Znaczenie | Przykład |
| --- | --- | --- |
| `id` | identyfikator wystąpienia | |
| `word_id` | którego słowa dotyczy | → `flee` |
| `book_id` | w której książce je spotkałeś (strona książki, filtr na Boardzie) | → Harry Potter |
| `capture_id` | z którego zdjęcia pochodzi | |
| `surface_form` | forma dokładnie taka, jak w tekście; po niej wyróżniamy słowo w zdaniu | `fled` |
| `sentence` | całe zdanie z książki w oryginale | `Harry fled the room before anyone could stop him.` |
| `translation` | znaczenie słowa w tym zdaniu, w formie podstawowej; dla słów bez odpowiednika krótkie wyjaśnienie | `uciekać` |
| `created_at` | kiedy wystąpienie zostało zapisane (kolejność zdań na karcie) | |

Tłumaczenie jest na wystąpieniu, a nie na słowie, bo to samo słowo w różnych zdaniach może znaczyć co innego: *bank* w zdaniu o pieniądzach to „bank”, a w zdaniu o rzece „brzeg”. Karta na Boardzie pokazuje wszystkie znaczenia bez powtórzeń.

Celowo nie przechowujemy:

- **ogólnego tłumaczenia słowa**, bo wynika ze znaczeń z wystąpień,
- **definicji**, bo w większości powtarza tłumaczenie, a wydłuża odpowiedź modelu i kartę na telefonie,
- **tłumaczenia całego zdania**, bo resztę zdania rozumiesz, a to najdłuższy fragment odpowiedzi modelu,
- **`updated_at` na słowie**, bo słowo nie ma już edytowalnych pól.

### Reguły

- Strona książki i filtr po książce: słowa, które mają przynajmniej jedno wystąpienie w danej książce.
- „Spotkane N×” to liczba wystąpień słowa.
- Akceptacja zdjęcia: dla każdego itemu z `ai_result`:
  - jeśli słowo z danym kluczem już istnieje, dodajemy tylko nowe wystąpienie. Lemat porównujemy bez rozróżniania wielkości liter (*Squib* i *squib* to jedno słowo);
  - jedno słowo z jednego zdjęcia daje jedno wystąpienie (duplikaty lematu w wyniku łączymy);
  - jeśli słowo ma już wystąpienie z tym samym zdaniem, pomijamy je (ponowne zdjęcie tej samej strony nie podbija licznika). Zdania porównujemy po normalizacji: małe litery, bez interpunkcji, cudzysłowów i nadmiarowych spacji, bo model może przepisać to samo zdanie minimalnie inaczej (`’` zamiast `'`, inny myślnik).
- Odrzucenie: status `rejected`, nic nie zapisujemy.
- Limit dzienny: liczba zdjęć użytkownika z bieżącego dnia (UTC) o statusie innym niż `failed`. Odrzucone też się liczą, bo koszt modelu już poszedł.
- Usunięcie książki: 409, jeśli ma jakiekolwiek wystąpienia słów. W przeciwnym razie usuwamy książkę razem z jej zdjęciami (rekordy i pliki w S3).

## Kontrakt AI

**Wejście:** zdjęcie strony, tytuł i autor książki, język książki i język ojczysty użytkownika.

**Zadanie:** znaleźć słowa lub wyrażenia **podkreślone ręcznie** (ołówek, długopis, zakreślacz) i dla każdego zwrócić dane według schematu. Model ignoruje słowa, które nie są podkreślone. Wyrażenia wielowyrazowe (*give up*) traktuje jako jedną pozycję.

**Wyjście** (structured output / JSON schema):

```json
{
  "items": [
    {
      "surface_form": "fled",
      "lemma": "flee",
      "sentence": "Harry fled the room before anyone could stop him.",
      "translation": "uciekać"
    }
  ]
}
```

- Model: dowolny model z obsługą obrazów i wymuszonym schematem JSON, wołany przez OpenRouter (domyślnie `anthropic/claude-sonnet-5.5`, zmiana w `openRouter.model`). Wybór modelu rozstrzygają testy na prawdziwych zdjęciach.
- `translation` to znaczenie słowa w tym zdaniu, w języku ojczystym i w formie podstawowej (*staunchest* → „oddany”, a nie „najbardziej oddany”). Od jednego do trzech synonimów po przecinku, bez komentarzy.
- Terminy ze świata książki (wymyślone słowa, przedmioty, nazwy). Model korzysta z tytułu książki, żeby wiedzieć, z jakiego świata pochodzą.
  - Jeśli istnieje oficjalne tłumaczenie w języku ojczystym, model go używa i dopisuje krótkie wyjaśnienie w nawiasie: *Squib* → „charłak (osoba z rodziny czarodziejów bez zdolności magicznych)”.
  - Jeśli odpowiednika nie ma, `translation` to samo krótkie wyjaśnienie, jedno zdanie (*Hatstall*).
- `surface_form` i `lemma` to poprawny zapis słowa z tekstu, a nie błędne odczytanie (*Hatstall*, a nie *Hatsall*).
- `lemma` to hasło słownikowe (*staunchest* → *staunch*, ale *renowned* zostaje *renowned*). Małymi literami, poza nazwami własnymi i terminami ze świata książki (*Squib*, *Portable Swamp*). Wymyślone słowa nie mają odmiany, więc lemat jest równy formie z tekstu.

Przykład wymyślonego słowa:

```json
{
  "surface_form": "Hatstall",
  "lemma": "Hatstall",
  "sentence": "His Sorting almost turned into a Hatstall due to the lengthy argument he had with the Hat over whether he should be placed in Hufflepuff, which is what he wanted, or Gryffindor, which is what the Hat wanted.",
  "translation": "sytuacja, gdy Tiara Przydziału długo nie może zdecydować, do którego domu przydzielić ucznia"
}
```
- Pusta lista `items` oznacza, że nic nie jest podkreślone.
- Zdanie przecięte końcem strony: zwracamy fragment, który jest widoczny.

### Przypadki testowe promptu

Oczekiwany wynik dla podkreśleń z *Harry Potter* (język ojczysty `pl`):

| Podkreślone | `lemma` | `translation` | Co sprawdza |
| --- | --- | --- | --- |
| fled | flee | uciekać | lematyzacja czasownika nieregularnego |
| ingenuity | ingenuity | pomysłowość | zwykłe słowo, lemat równy formie z tekstu |
| staunchest | staunch | oddany, wierny, niezłomny | stopień najwyższy, znaczenie w formie podstawowej, synonimy |
| renowned | renowned | słynny, ceniony | przymiotnik zostaje przymiotnikiem (nie *renown*); drugie słowo z tego samego zdania co *Squib* |
| Portable Swamp | Portable Swamp | przenośne bagno | wyrażenie wielowyrazowe, oficjalne tłumaczenie terminu z książki |
| Squib | Squib | charłak (osoba z rodziny czarodziejów bez zdolności magicznych) | oficjalne tłumaczenie z wyjaśnieniem, wielka litera w lemacie |
| Hatstall | Hatstall | sytuacja, gdy Tiara Przydziału długo nie może zdecydować, do którego domu przydzielić ucznia | wymyślone słowo bez odpowiednika, poprawny zapis mimo trudnego odczytu |

## API

```text
GET    /me                          profil (język ojczysty, limit, wykorzystanie dzisiaj)
PATCH  /me                          zmiana języka ojczystego

POST   /books                       utworzenie książki
GET    /books                       lista książek
GET    /books/:id                   szczegóły książki
PATCH  /books/:id                   edycja tytułu/autora
DELETE /books/:id                   usunięcie (409, jeśli ma słowa)

POST   /books/:id/captures          upload zdjęcia → AI → zwraca capture z items (status pending_review albo failed)
GET    /books/:id/captures?status=pending_review   zdjęcia czekające na akceptację
POST   /captures/:id/accept         zapis wszystkich słów z ai_result
POST   /captures/:id/reject         odrzucenie
POST   /captures/:id/retry          ponowne przetworzenie zdjęcia ze statusem failed

GET    /words?bookId=&q=&sort=      strona książki i Board
PATCH  /occurrences/:id             edycja znaczenia w zdaniu
DELETE /words/:id                   usunięcie całego słowa (Board)
DELETE /books/:bookId/words/:wordId usunięcie wystąpień słowa w książce (strona książki)
```

Rejestracja ze startera dostaje dodatkowe pole `nativeLanguage`.

## Ekrany

1. Logowanie / rejestracja (ze startera, plus wybór języka ojczystego)
2. Ustawienia profilu: język ojczysty
3. Lista książek z przyciskiem „Dodaj książkę”
4. Strona książki: słowa z książki, przycisk 📷, baner zdjęć czekających na akceptację. Ekran startowy = ostatnio otwarta książka (zapamiętana w `localStorage`).
5. Podgląd wyniku: lista słów, „Przyjmij wszystkie” / „Odrzuć”
6. Board: filtr, wyszukiwarka, sortowanie, karty słów

Interfejs projektujemy najpierw pod telefon. Desktop to tylko szersza wersja Boardu.

## Aplikacja w telefonie (PWA)

Strona instaluje się na ekranie głównym i otwiera bez interfejsu przeglądarki, jak natywna aplikacja.

**Instalacja**

- Manifest (`manifest.webmanifest`): `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `orientation: "portrait"`, `theme_color`, `background_color`, ikony 192 i 512 px oraz wersja `maskable`.
- Meta tagi dla iOS w `index.html`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `viewport` z `viewport-fit=cover`.
- Minimalny service worker, który cache'uje statyczne pliki (szybki start). Bez trybu offline, bo rozpoznawanie i tak wymaga sieci. Na Vite: `vite-plugin-pwa`.
- Android sam proponuje instalację. Na iOS trzeba to zrobić ręcznie („Udostępnij → Do ekranu początkowego”), więc aplikacja pokazuje jednorazową podpowiedź, jeśli nie działa w trybie standalone.

**Aparat**

- Główny przycisk 📷: `<input type="file" accept="image/*" capture="environment">`, czyli jeden tap do tylnego aparatu.
- Link „z galerii”: ten sam input bez `capture`.
- Bez API kamery i bez proszenia o uprawnienia.

**Wygląd i zachowanie jak w aplikacji**

- `100dvh` zamiast `100vh`, odstępy `env(safe-area-inset-*)` pod notch i pasek domowy.
- Inputy z czcionką co najmniej 16 px (iOS nie powiększa wtedy strony przy fokusie).
- `overscroll-behavior: none`, żeby nie było pull-to-refresh i odbijania strony.
- Dolny pasek nawigacji: Książka / Książki / Board. Przyciski co najmniej 44 px.
- `start_url: "/"` przekierowuje na ostatnio otwartą książkę z `localStorage`.

**Sesja**

- Zainstalowana PWA na iOS ma osobne ciasteczka i `localStorage` niż Safari, więc po instalacji trzeba zalogować się ponownie. Podpowiedź instalacji o tym uprzedza.
- Sesja trwa długo (refresh token na 30+ dni), żeby aplikacja nie wylogowywała w trakcie czytania.

## Ryzyka do sprawdzenia przed budową UI

1. **Jakość rozpoznawania.** Przetestować prompt na 20–30 prawdziwych zdjęciach: ołówek, długopis, zakreślacz, krzywe ujęcie, zagięcie przy grzbiecie, słowa wymyślone przez autora (*Hatstall*). Bez edycji w podglądzie jakość jest krytyczna, bo jeden błąd oznacza odrzucenie całego zdjęcia albo ręczne usuwanie później.
2. **Czas odpowiedzi.** Użytkownik czeka na wynik w trakcie czytania, więc każda sekunda się liczy. Porównać Sonnet i Haiku pod kątem czasu i jakości. Jeśli czas przekracza ~20 s, rozważyć streaming itemów albo przetwarzanie w tle.
3. **Koszt jednego zdjęcia.** Policzyć na podstawie testów (tokeny obrazu i odpowiedzi) i zweryfikować domyślny limit 10 dziennie.

## Stack

Na bazie `fullstack-starter`:

- Fastify, PostgreSQL + Drizzle, React 19, Tailwind, Radix
- S3 + Sharp (już w starterze)
- OpenRouter do wywołań modelu (jedna abstrakcja, łatwa zmiana modelu)
