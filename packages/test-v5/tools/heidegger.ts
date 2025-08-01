import { z } from 'zod'
import { tool } from 'ai'

const heideggerQuotes = [
  "The most thought-provoking thing in our thought-provoking time is that we are still not thinking.",
  "Why are there beings at all, instead of Nothing?",
  "The aim of the following treatise is to work out the question of the meaning of 'being' and to do so concretely.",
  "Do we in our time have an answer to the question of what we really mean by the word 'being'? Not at all. So it is fitting that we should raise anew the question of the meaning of being.",
  "Dasein is a being that does not simply occur among other beings. Rather it is ontically distinguished by the fact that in its being this being is concerned about its very being.",
  "Thinking begins only when we have come to know that reason, glorified for centuries, is the stiff-necked adversary of thought.",
  "Language is the house of Being. In its home man dwells. Those who think and those who create with words are the guardians of this home.",
  "Man is not the lord of beings. Man is the shepherd of Being.",
  "Man acts as though he were the shaper and master of language, while in fact language remains the master of man.",
  "If I take death into my life, acknowledge it, and face it squarely, I will free myself from the anxiety of death and the pettiness of life - and only then will I be free to become myself.",
  "We do not say: Being is, time is, but rather: there is Being and there is time.",
  "Thinking the most difficult thought of philosophy means thinking being as time.",
  "Every man is born as many men and dies as a single one.",
  "The possible ranks higher than the actual.",
  "Being and Time: what is at stake here is the possibility of understanding and articulating the being of beings.",
  "Anxiety makes manifest in Dasein its Being towards its ownmost potentiality-for-Being.",
  "The Nothing itself nihilates.",
  "Being-toward-death is essentially anxiety.",
  "Temporality is the primordial outside-of-itself in and for itself.",
  "The authentic self is the self that has explicitly seized upon its own existence."
];

export const heideggerTool = tool({
  description: "Get a random philosophical quote from Martin Heidegger, the German philosopher known for his work on ontology, phenomenology, and existentialism.",
  inputSchema: z.object({
    category: z.enum(["being", "time", "anxiety", "dasein", "thinking", "language", "random"])
      .optional()
      .describe("Optional category filter for the quote")
  }).strict(),
  execute: async ({ category = "random" }: { category?: string }) => {
    let filteredQuotes = heideggerQuotes;
    
    if (category !== "random") {
      const categoryFilters: Record<string, string[]> = {
        being: ["being", "Being", "beings"],
        time: ["time", "Time", "temporal"],
        anxiety: ["anxiety", "death", "anxiety"],
        dasein: ["Dasein", "existence", "authentic"],
        thinking: ["thinking", "thought", "reason"],
        language: ["language", "Language", "words"]
      };
      
      const keywords = categoryFilters[category] || [];
      filteredQuotes = heideggerQuotes.filter(quote => 
        keywords.some(keyword => quote.includes(keyword))
      );
      
      if (filteredQuotes.length === 0) {
        filteredQuotes = heideggerQuotes;
      }
    }
    
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const selectedQuote = filteredQuotes[randomIndex];
    
    return {
      quote: selectedQuote,
      author: "Martin Heidegger",
      category: category,
      totalQuotes: filteredQuotes.length
    };
  }
});