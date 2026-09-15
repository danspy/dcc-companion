/* ---------------------------------------------------------------------------
   Suggestions for the "Surprise me" button.

   The hard part of this page is not the grant, it is the blank box: most
   people cannot think of a thing they did today on demand, and "burned the
   lasagna" is doing a lot of work as a placeholder.

   These are deliberately about the reader's own world and never about the
   crawl. That is what keeps them ungated — a suggestion is static copy shown
   to everyone, which is exactly the shape `scripts/check-pages.mjs` exists to
   police, and a line from the books would be a spoiler on a page that anyone
   can open at any position.

   Two rules when adding to this list:

   - **Specific beats general.** "Did some cleaning" gets a shrug back;
     "rearranged the dishwasher after someone else loaded it" gets a citation.
     The System needs a detail to be unpleasant about.
   - **Mind the gated vocabulary.** Milk, Rust, Ruby, Ping, Feral and Justice
     are all entity names, and `check-pages.mjs` matches case-insensitively, so
     "bought milk" in this file fails the build. Run `npm run content:check`
     after editing, which is the check that catches it.

   A handful mention feet on purpose, so the System's oldest running gag turns
   up on its own for a reader who has never thought to type "barefoot".
   --------------------------------------------------------------------------- */

export const SUGGESTIONS: string[] = [
  'rearranged the dishwasher after someone else loaded it',
  'ate a whole packet of biscuits standing up',
  'said "you too" when the waiter told me to enjoy my meal',
  'spent an hour picking a film and then went to bed',
  'walked to the corner shop barefoot',
  'replied to a message I had been avoiding since Tuesday',
  'took a photograph of my own dinner',
  'watched six minutes of a tutorial and then did it wrong anyway',
  'hid in the kitchen until the doorbell stopped',
  'bought a plant I am not qualified to keep alive',
  'wore the same socks two days running',
  'cancelled plans forty minutes before the plans',
  'reorganised the spice rack instead of doing my actual work',
  'ate cereal for dinner over the sink',
  'assembled a bookshelf and had four screws left over',
  'told a barber "that is great" while it was not great',
  'got cold feet about a haircut and left',
  'argued with a cat and lost',
  'carried every bag of shopping in one trip to avoid a second trip',
  'stood in front of the open fridge for four minutes',
  'laughed at a joke I did not understand',
  'finally threw away a pair of shoes I had not worn in six years',
  'read the terms and conditions in full',
  'ran for a bus and then let it go',
  'started a sourdough and gave up on day three',
  'went to the bakery on foot',
  'put a wash on and forgot about it until the next morning',
  'pretended to be on a call to avoid a neighbour',
  'stubbed my toe on the same table leg as yesterday',
  'ordered the second cheapest wine on the list',
  'watched an entire series in one sitting and told nobody',
  'sent a work email at eleven at night for no reason',
  'took the stairs once and mentioned it three times',
  'tried to fix something and made it worse',
  'kept a receipt for eleven months',
  'lay on the floor for a while with no particular plan',
  'said "just popping out" and was gone two hours',
  'bought special trainers for a hobby I did once',
  'apologised to a piece of furniture',
  'stayed up until three reading and regretted it at seven',
  'let the phone ring out and then texted instead',
  'made a list and then lost the list',
  'cleaned the whole flat because one person was visiting',
  'went barefoot in the garden and stood on something',
  'ate the emergency chocolate on a non-emergency',
  'drove somewhere I could easily have walked',
  'wore sandals with socks in public',
  'spent the afternoon watching a bird through the window',
  'put off a dentist appointment for the third time',
  'told everyone I was leaving the party and stayed ninety minutes',
];
