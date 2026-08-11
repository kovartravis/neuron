/**
 * Antagonistic (off-topic) query corpus — Pillar 13.
 *
 * Pillar 7's corpus builds *hard* negatives: distractors that share vocabulary
 * or topic with the gold answer so ranking has to work to win. This corpus is
 * the mirror case — queries engineered to share NOTHING with anything seeded
 * by `adversarial-corpus.ts` (fillers, hard negatives, superseded entries,
 * golds), so a correct system must return nothing at all.
 *
 * Every query here was checked, not assumed, against that seeded vocabulary:
 * each non-stopword token was verified to not be a prefix of any token that
 * appears anywhere in `adversarial-corpus.ts` (matching the FTS5 `"word"*`
 * prefix-match semantics `cleanFtsQuery` actually uses), so an accidental
 * lexical hit can't produce a false "abstains" result. See ticket 17's own
 * Comments for the verification script.
 *
 * Four families, all genuinely off-topic relative to a software engineering
 * memory store — not absent-gold variants of an existing topic:
 */

export type AntagonisticFamily = 'general-knowledge' | 'small-talk' | 'unrelated-codebase' | 'weather-nature';

export interface AntagonisticCase {
  family: AntagonisticFamily;
  id: string;
  query: string;
}

export const ANTAGONISTIC_CASES: AntagonisticCase[] = [
  { family: 'general-knowledge', id: 'ant-buttermilk', query: 'what is a good substitute for buttermilk in a pancake recipe' },
  { family: 'weather-nature', id: 'ant-cherry-blossoms', query: 'when do cherry blossoms bloom in Kyoto' },
  { family: 'general-knowledge', id: 'ant-bowline', query: 'how do you tie a bowline knot for sailing' },
  { family: 'weather-nature', id: 'ant-boiling-point', query: 'at what altitude does water boil at a lower temperature' },
  { family: 'general-knowledge', id: 'ant-tip-calc', query: 'how do you calculate a fair tip at a restaurant' },
  { family: 'general-knowledge', id: 'ant-mongolia', query: 'what is the capital city of Mongolia' },
  { family: 'general-knowledge', id: 'ant-moon-distance', query: 'how far is the moon from Earth on average' },
  { family: 'general-knowledge', id: 'ant-mariana', query: 'how deep is the Mariana Trench' },
  { family: 'weather-nature', id: 'ant-rainbow', query: 'what causes a rainbow to appear after rain' },
  { family: 'general-knowledge', id: 'ant-origami', query: 'how do you fold a paper crane origami style' },
  { family: 'general-knowledge', id: 'ant-tortoise', query: 'what is the average lifespan of a giant tortoise' },
  { family: 'general-knowledge', id: 'ant-moons', query: 'which planet has the most moons in our solar system' },
  { family: 'general-knowledge', id: 'ant-africa-peak', query: 'what is the tallest mountain in Africa' },
  { family: 'general-knowledge', id: 'ant-tagine', query: 'what is a traditional ingredient in Moroccan tagine' },
  { family: 'general-knowledge', id: 'ant-crocodile', query: 'what is the difference between a crocodile and an alligator snout' },
  { family: 'weather-nature', id: 'ant-bees', query: 'how do bees communicate the location of flowers to each other' },
  { family: 'small-talk', id: 'ant-week', query: 'how has your week been going so far' },
  { family: 'unrelated-codebase', id: 'ant-flexbox', query: 'how do you center a div using flexbox in CSS' },
  { family: 'small-talk', id: 'ant-thanks-portuguese', query: 'how do you say thank you in Portuguese' },
];
