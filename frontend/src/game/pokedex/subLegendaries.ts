// PokeAPI flags is_legendary/is_mythical but doesn't distinguish "sub-legendary"
// (legendary trios/beasts/Ultra Beasts etc. that aren't the single box-art legendary
// of their generation). Curated by hand since there's no API field for this.
export const SUB_LEGENDARY_IDS = new Set([
  // gen 1-2 trios
  "articuno", "zapdos", "moltres",
  "raikou", "entei", "suicune",
  // gen 3
  "regirock", "regice", "registeel", "latias", "latios",
  // gen 4
  "uxie", "mesprit", "azelf", "heatran", "regigigas", "cresselia",
  // gen 5
  "cobalion", "terrakion", "virizion", "tornadus", "thundurus", "landorus",
  // gen 7 tapus + ultra beasts
  "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini",
  "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord",
  "stakataka", "blacephalon",
  // gen 8
  "kubfu", "urshifu", "regieleki", "regidrago", "glastrier", "spectrier", "enamorus",
  // gen 9 treasures of ruin + loyal three
  "wo-chien", "chien-pao", "ting-lu", "chi-yu",
  "okidogi", "munkidori", "fezandipiti",
]);
