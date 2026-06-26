import { useState } from "react";
import { getTypeColor } from "../game/pokedex/typeColors";
import { getPokemonSprite } from "../game/pokedex/pokemonImages";

export function PokemonPortrait({
  speciesId,
  name,
  types,
  size = 72,
  faded = false,
}: {
  speciesId: string;
  name: string;
  types: string[];
  size?: number;
  faded?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getTypeColor(types[0]),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        fontWeight: "bold",
        color: "white",
        opacity: faded ? 0.35 : 1,
        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {broken ? (
        name.charAt(0).toUpperCase()
      ) : (
        <img
          src={getPokemonSprite(speciesId)}
          alt={name}
          onError={() => setBroken(true)}
          style={{ width: "85%", height: "85%", objectFit: "contain", imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}
