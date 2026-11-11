-- ==============================================================================
-- V8__seed_sentence_and_twister_drill_phrases.sql
-- Cadence Speech Runner drills: hand-written short sentences (L2) and tongue
-- twisters (L3) for 17 onsets plus the th_sound and v_w_mix buckets.
-- DECISIONS.md D29: generator/validator pipeline deferred; content seeded by hand.
--
-- Rules followed by every phrase below:
--   * L2 sentences: 5-7 words.  L3 tongue twisters: 8-14 words.
--   * Words are alphabetic only (no digits, hyphens, apostrophes).
--   * Onset rows avoid 'sh' words under onset 's' (OnsetResolver maps sh -> s),
--     avoid silent-h words under 'h', and avoid soft-g words under hard 'g'.
--   * Twisters avoid words Whisper may split or merge (e.g. sea shells/seashells).
-- word_count is computed in SQL, so it always matches the text.
-- Requires V5 (drill_phrases). Works with or without V7 (review_status defaults to approved).
-- ==============================================================================

INSERT INTO public.drill_phrases (onset, bucket, level, phrase_text, word_count, source, active)
SELECT
    v.onset::text,
    v.bucket::text,
    v.level::smallint,
    btrim(v.phrase)::text,
    array_length(regexp_split_to_array(btrim(v.phrase), '\s+'), 1),
    'curated',
    true
FROM (VALUES
    -- ── p ────────────────────────────────────────────────────────────────────
    ('p', NULL, 2, 'Pat picked purple plums from the pantry'),
    ('p', NULL, 2, 'Pretty parrots perch on pink poles'),
    ('p', NULL, 2, 'Peter prepares perfect pepper pasta'),
    ('p', NULL, 3, 'Pretty Polly picked a pocket of purple plums for pickling'),
    ('p', NULL, 3, 'Peter Piper picked a peck of pickled peppers'),

    -- ── b ────────────────────────────────────────────────────────────────────
    ('b', NULL, 2, 'Big brown bears bake bread daily'),
    ('b', NULL, 2, 'Bobby bought a beautiful blue balloon'),
    ('b', NULL, 2, 'Bring both baskets before breakfast begins'),
    ('b', NULL, 3, 'Betty Botter bought some butter but she said the butter is bitter'),
    ('b', NULL, 3, 'Brave blue birds build big brown nests by bright beaches'),

    -- ── t ────────────────────────────────────────────────────────────────────
    ('t', NULL, 2, 'Tom takes tasty tomato toast today'),
    ('t', NULL, 2, 'Tiny turtles twirl toward the tulips'),
    ('t', NULL, 2, 'Terry tried tight tan trousers'),
    ('t', NULL, 3, 'Tom told Tina terrible tales about tiny tigers'),
    ('t', NULL, 3, 'Tall Tommy tossed tasty toffee to tired tourists'),

    -- ── d ────────────────────────────────────────────────────────────────────
    ('d', NULL, 2, 'Dad drives down dusty desert roads'),
    ('d', NULL, 2, 'Diana dipped dumplings in dark dressing'),
    ('d', NULL, 2, 'Daniel decided to dance daily'),
    ('d', NULL, 3, 'Dizzy ducks dived deep during dark December days'),
    ('d', NULL, 3, 'Dora dug deep ditches during daytime and dozed during dinner'),

    -- ── k (k, hard c, qu) ────────────────────────────────────────────────────
    ('k', NULL, 2, 'Kate carries kind customers cold coffee'),
    ('k', NULL, 2, 'Cool cats keep calm during cold weather'),
    ('k', NULL, 2, 'Keith quickly cooked crisp carrot cakes'),
    ('k', NULL, 3, 'Kind Kevin kicked colorful kites across cold Kansas fields'),
    ('k', NULL, 3, 'Clever Clara cooked quick curry because customers came craving'),

    -- ── g (hard g only) ──────────────────────────────────────────────────────
    ('g', NULL, 2, 'Gary grows green grapes in gardens'),
    ('g', NULL, 2, 'Grandma gave Gus golden gloves'),
    ('g', NULL, 2, 'Good goats graze green grass'),
    ('g', NULL, 3, 'Gus gobbled gooey granola gladly while grumbling about greasy gravy'),
    ('g', NULL, 3, 'Gray gloomy goats gulp gallons of green grass gradually'),

    -- ── f ────────────────────────────────────────────────────────────────────
    ('f', NULL, 2, 'Fred finds fresh fish for friends'),
    ('f', NULL, 2, 'Fiona flew fast flights frequently'),
    ('f', NULL, 2, 'Fifty fluffy ferrets frolic freely'),
    ('f', NULL, 3, 'Fancy Fanny fried five fluffy fritters for friends'),
    ('f', NULL, 3, 'Freddy found fancy feathers for fifty fluffy flamingos'),

    -- ── s (no sh words) ──────────────────────────────────────────────────────
    ('s', NULL, 2, 'Sam sings sweet songs sometimes'),
    ('s', NULL, 2, 'Seven sailors sailed south on Sunday'),
    ('s', NULL, 2, 'Sally sells sweet strawberries every summer'),
    ('s', NULL, 3, 'Six slippery snakes slid slowly across sandy slopes'),
    ('s', NULL, 3, 'Several sleepy sailors sang soft songs while sitting beside silent seas'),

    -- ── ch ───────────────────────────────────────────────────────────────────
    ('ch', NULL, 2, 'Charlie chose cheap cheese chips'),
    ('ch', NULL, 2, 'Children chat cheerfully during lunch'),
    ('ch', NULL, 2, 'Chilly chairs challenge cheerful children'),
    ('ch', NULL, 3, 'Chubby children chew chunky chocolate chips cheerfully each chilly day'),
    ('ch', NULL, 3, 'Charming Charlie chased cheeky chickens through chilly chestnut trees'),

    -- ── j (j and soft g) ─────────────────────────────────────────────────────
    ('j', NULL, 2, 'Jack jogs joyfully every June'),
    ('j', NULL, 2, 'Jenny juggled jars of jelly'),
    ('j', NULL, 2, 'Gentle giants join jolly gym classes'),
    ('j', NULL, 3, 'Jolly Jim juggled jumbo jars of juicy jam in July'),
    ('j', NULL, 3, 'Jasmine jokes about jittery jaguars jumping joyfully over jagged jungle rocks'),

    -- ── r (r and wr) ─────────────────────────────────────────────────────────
    ('r', NULL, 2, 'Rita rides red rocking horses'),
    ('r', NULL, 2, 'Ryan really remembers rainy road trips'),
    ('r', NULL, 2, 'Please write repeated reports regularly'),
    ('r', NULL, 3, 'Roberta rarely rides red rickshaws round rough rural roads'),
    ('r', NULL, 3, 'Rapid rabbits race through rows of ripe radishes rejoicing'),

    -- ── l ────────────────────────────────────────────────────────────────────
    ('l', NULL, 2, 'Lily likes lemon lollipops lately'),
    ('l', NULL, 2, 'Larry loaded large logs lazily'),
    ('l', NULL, 2, 'Little lambs leap lightly on hills'),
    ('l', NULL, 3, 'Lucky Lucy looked left while lifting lovely lilac lanterns'),
    ('l', NULL, 3, 'Lazy lions lounge lazily along long leafy lanes'),

    -- ── m ────────────────────────────────────────────────────────────────────
    ('m', NULL, 2, 'Mary makes many marvelous muffins'),
    ('m', NULL, 2, 'Mom might miss Monday morning meetings'),
    ('m', NULL, 2, 'Many mice munch moldy mushrooms'),
    ('m', NULL, 3, 'Mighty Mike moved mountains of mud on Monday mornings'),
    ('m', NULL, 3, 'Marvelous Maria mixed minty marmalade with mashed mangoes meticulously'),

    -- ── n (n, kn, gn) ────────────────────────────────────────────────────────
    ('n', NULL, 2, 'Nina needs nine new notebooks'),
    ('n', NULL, 2, 'Nick never noticed nasty noises'),
    ('n', NULL, 2, 'Knit neat navy knee socks'),
    ('n', NULL, 3, 'Nice neighbors never knock at night near noisy neighborhoods'),
    ('n', NULL, 3, 'Naughty Nancy nibbled nine nutty noodles nightly near Nepal'),

    -- ── w (w and wh) ─────────────────────────────────────────────────────────
    ('w', NULL, 2, 'Wendy washes white woolen waistcoats weekly'),
    ('w', NULL, 2, 'Wise walruses wander where waves whisper'),
    ('w', NULL, 2, 'We wanted warm water yesterday'),
    ('w', NULL, 3, 'Willy walked west with wet woolly wellies while whistling wild waltzes'),
    ('w', NULL, 3, 'Whenever Wanda whispers whales wave wildly while wandering without worries'),

    -- ── h (no silent-h words) ────────────────────────────────────────────────
    ('h', NULL, 2, 'Harry hates heavy hot hallways'),
    ('h', NULL, 2, 'Helen helped her happy husband'),
    ('h', NULL, 2, 'Hungry hamsters hide healthy hazelnuts'),
    ('h', NULL, 3, 'Happy Harold hurried home to help his hungry horse'),
    ('h', NULL, 3, 'Hardy hunters hiked high hills hoping to hear howling hounds'),

    -- ── v ────────────────────────────────────────────────────────────────────
    ('v', NULL, 2, 'Vera visited very vast valleys'),
    ('v', NULL, 2, 'Victor values vivid vintage vases'),
    ('v', NULL, 2, 'Vivian voted for various vegetables'),
    ('v', NULL, 3, 'Violet viewed vivid videos of volcanoes with vigorous vibrations'),
    ('v', NULL, 3, 'Very valuable velvet vests vanished from various vehicles overnight'),

    -- ── th_sound bucket (also serves th_voiced / th_voiceless onsets) ───────
    (NULL, 'th_sound', 2, 'These three thin thieves think thoroughly'),
    (NULL, 'th_sound', 2, 'Thankful mothers gather together with their brothers'),
    (NULL, 'th_sound', 2, 'Thirty thick threads thread through the thimble'),
    (NULL, 'th_sound', 3, 'The thirsty thief thought through the thirty thousand things thoroughly'),
    (NULL, 'th_sound', 3, 'This father thinks that three brothers throw thick thorny thistles'),

    -- ── v_w_mix bucket ───────────────────────────────────────────────────────
    (NULL, 'v_w_mix', 3, 'Vera will view wild waves while Victor wanders vast valleys'),
    (NULL, 'v_w_mix', 3, 'Wally and Vicky voted wisely for vivid white velvet vests'),
    (NULL, 'v_w_mix', 3, 'We value vast wells where wild vines wander and violets wave')
) AS v(onset, bucket, level, phrase)
ON CONFLICT (lower(phrase_text)) DO NOTHING;

