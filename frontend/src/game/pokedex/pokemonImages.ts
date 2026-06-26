import { getSpecies } from "./data";

export function getPokemonSprite(speciesId: string): string {
  return `/pokemon/sprite/${getSpecies(speciesId).dexId}.png`;
}

export function getPokemonArtwork(speciesId: string): string {
  return `/pokemon/artwork/${getSpecies(speciesId).dexId}.png`;
}
