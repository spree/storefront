# Ways To Improve This Store

This is a working online store. You can browse the live version at
<https://demo.spreecommerce.org> — no login needed.

Below are four real gaps in this codebase. Each one is a genuine problem, not a
made-up exercise. Pick one, copy the Mission prompt into Droid, and watch it
work through the job milestone by milestone.

You do not need to run the store on your laptop to do any of these.

---

## 1. Shoppers see a blank screen while pages load

**What's wrong:** This store has 27 pages. Not one of them shows a loading
message while it waits for data, and not one shows an error message if
something goes wrong. A shopper on a slow connection sees a blank white screen
and has no idea whether the site is broken.

**Why a retailer cares:** Blank screens make people leave. A shopper who thinks
the site is down doesn't come back and try again, they buy somewhere else.

**Mission prompt:**

> Add a loading screen and an error message to every page in this store. Right
> now shoppers see a blank screen while pages load, and nothing at all when
> something breaks. Make each one match the look of the page it belongs to.

**How you'll know it worked:** There will be new `loading.tsx` and `error.tsx`
files next to the pages. The test suite should still pass.

---

## 2. Prices are calculated in a way that can be off by a cent

**What's wrong:** Prices are added up using regular decimal math in 14
different files. Computers are famously bad at decimal math: `0.1 + 0.2` does
not equal `0.3`. On a single item nobody notices. Across thousands of orders,
totals drift.

The heaviest spots are the cart page, the order totals, the checkout summary,
and the cart drawer.

**Why a retailer cares:** This is the money. Totals that don't match what the
customer expected cause refunds, chargebacks, support tickets, and in some
countries a compliance problem.

**Mission prompt:**

> Prices in this store are added up using regular decimal math, which can round
> wrong and produce totals that are off by a cent. Find every place prices are
> calculated, replace it with one shared helper that handles money safely, and
> write tests proving the totals are correct.

**How you'll know it worked:** New tests covering the money helper, and the
existing test suite still passes.

---

## 3. Fourteen parts of the store have no tests

**What's wrong:** The folder that talks to the store's backend has 20 modules.
Only 6 of them have tests. These have none:

`addresses`, `cached`, `categories`, `cookies`, `countries`, `credit-cards`,
`express-checkout-flow`, `gift-cards`, `index`, `markets`, `orders`,
`products`, `utils`, `wholesale`

That includes credit cards, gift cards, and orders.

**Why a retailer cares:** Untested code is code nobody can safely change. Every
release becomes a gamble, so teams slow down or stop touching it at all.

**Mission prompt:**

> Fourteen modules in this project have no tests: addresses, cached, categories,
> cookies, countries, credit-cards, express-checkout-flow, gift-cards, index,
> markets, orders, products, utils, and wholesale. Write tests for each one.
> Start with credit-cards, gift-cards, and orders, because those handle money.

**How you'll know it worked:** New test files for each module, and the whole
suite passes.

---

## 4. The store only speaks five languages

**What's wrong:** The store ships German, English, Spanish, French, and Polish.
Any other market needs a new translation file, and every piece of text has to
be found and translated.

**Why a retailer cares:** Entering a new country is a board-level decision, and
"how long until the site speaks the language" is usually the answer that holds
it up.

**Mission prompt:**

> This store speaks German, English, Spanish, French, and Polish. Add Italian.
> Find every piece of text a shopper sees, make sure it's translatable, and fill
> in the Italian translations.

**How you'll know it worked:** A new `it.json` in the `messages` folder, and the
store's language switcher offers Italian.

---

## Before You Start

Ask Droid to explain how Missions work. Then pick one item above, paste its
prompt, and follow along as it breaks the job into milestones.

As you watch, keep one question in mind: **what would this have cost a
customer's engineering team to do by hand?** That comparison, not the code, is
the thing worth talking about afterwards.
