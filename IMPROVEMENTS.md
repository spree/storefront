# Ways To Improve This Store

This is a working online store. You can browse the live version at
<https://demo.spreecommerce.org> — no login needed.

Below are three real gaps in this codebase. Each one was checked against the
actual code, and each one has a command that proves whether it worked. Pick
one, paste the prompt into Droid, and follow along as it works through the job.

**Before you start,** get the project running once so you can tell green from
red:

```
pnpm install
pnpm run test          # should say 34 files, 247 tests, all passing
```

You do not need the store itself running on your laptop for any of these.

---

## 1. The store only speaks five languages

**What's wrong:** The store ships German, English, Spanish, French, and Polish.
There are 564 pieces of text a shopper can see, and every new market needs all
564 translated.

**Why a retailer cares:** Opening a new country is a board-level decision, and
"how long until the site speaks the language" is usually the thing that holds it
up. Ask a customer how long this takes them today. The answer is rarely days.

**Prompt:**

> This store speaks German, English, Spanish, French, and Polish. Add Italian.
> Translate all 564 pieces of text, and update anything else in the project that
> needs to know Italian is now supported.

**Why this one is a good first try:** it cannot break the storefront, and the
project already ships a checker for it.

**How you'll know it worked:**

```
pnpm run check:locales   # should list [it] OK — all keys match en.json
pnpm run test            # should still be all green
```

There is a catch worth watching for. One of the existing tests currently
asserts that Italian is *not* supported. A correct answer has to find that test
and update it. If Droid finds it without being told, that is the interesting
part, not the translation.

---

## 2. Eleven parts of the store have no tests

**What's wrong:** The folder that talks to the store's backend has 20 modules.
Eight are tested. These eleven are not, totalling about 620 lines:

`addresses`, `cached`, `categories`, `cookies`, `countries`, `credit-cards`,
`express-checkout-flow`, `gift-cards`, `orders`, `products`, `utils`

Four of them touch money: `credit-cards`, `gift-cards`, `orders`, and
`express-checkout-flow`.

**Why a retailer cares:** Untested code is code nobody will volunteer to
change. Teams route around it, and the work that should take a day takes a
sprint because nobody is sure what it will break.

**Prompt:**

> Eleven modules in src/lib/data have no tests: addresses, cached, categories,
> cookies, countries, credit-cards, express-checkout-flow, gift-cards, orders,
> products, and utils. Write tests for each one. Start with credit-cards,
> gift-cards, and orders, because those handle money. Match the style of the
> tests that already exist.

**How you'll know it worked:**

```
pnpm run test   # more than 34 files, still all passing
```

---

## 3. One broken section takes down the whole page

**What's wrong:** The store has a single catch-all error page. If any one part
of a page fails, say the reviews or the recommendations, the shopper loses the
entire page instead of just that section. There are 27 pages and only one error
boundary between all of them.

Loading is handled, but unevenly: 12 places show a skeleton while they wait,
and the rest just pop in.

**Why a retailer cares:** On a product page, "recommendations are down" should
cost you a sidebar, not the Add To Cart button. This is the difference between a
degraded page and a lost sale.

**Prompt:**

> This store has one catch-all error page, so when a single section of a page
> fails the shopper loses the whole page. Add error handling to each section
> that can fail on its own, so a broken part degrades on its own and the rest of
> the page still works. Keep the styling consistent with the existing pages.

**How you'll know it worked:**

```
pnpm run test    # still all green
pnpm run check   # linting and formatting still clean
```

---

## Before You Start

Ask Droid to explain how Missions work, then pick one item above and paste its
prompt.

As you watch, keep one question in mind: **what would this have cost a
customer's engineering team to do by hand?** That comparison, not the code, is
the thing worth talking about afterwards.
