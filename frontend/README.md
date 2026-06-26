# Pokemon Roguelike

Slay the Spire식 덱빌더. 전사/마법사/궁수 중 하나를 골라 포켓몬 기술 데이터를 카드로 재활용해 포켓몬과 싸운다.

## 실행

```
npm install
npm run dev
```

## 빌드 / 타입체크

```
npm run build
```

루트 `tsconfig.json`은 `references`만 있고 `files: []`라서 `npx tsc --noEmit`은 아무것도 검사하지 않는다. 항상 `npm run build`(`tsc -b && vite build`)로 확인할 것.

## 포켓몬 데이터 재생성

`src/data/species.json`, `src/data/moves.json`은 PokeAPI에서 받아온 캐시 데이터다. 갱신하려면:

```
node scripts/fetchPokemonData.mjs
```

## 폴더 구조 (`src/game/`)

- `combat.ts` — 전투 엔진(턴 루프, 카드 효과 적용, 상태이상)
- `random.ts` — 범용 RNG 유틸
- `pokedex/` — 포켓몬/기술 원본 데이터 조회, 타입 상성/색상, 상태이상 라벨
- `cards/` — 기술→카드 변환, 직업별 카드 풀, 직접 만든 카드(드로우/오브 등)
- `map/` — 런 맵 생성/탐색
- `run/` — 런 진행 상태, 캠프/상점/이벤트 로직
