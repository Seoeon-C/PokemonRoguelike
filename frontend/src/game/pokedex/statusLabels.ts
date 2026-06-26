import type { StatusCondition } from "../../types/pokemon";

export const STATUS_LABELS: Record<StatusCondition, string> = {
  burn: "화상",
  poison: "독",
  paralysis: "마비",
  sleep: "잠듦",
  freeze: "빙결",
  confusion: "혼란",
};
