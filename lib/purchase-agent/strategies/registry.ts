import { RetailerStrategy } from "./base";
import { AmazonStrategy } from "./amazon";
import { GenericStrategy } from "./generic";

const strategies: RetailerStrategy[] = [
  new AmazonStrategy(),
  new GenericStrategy(), // fallback — must be last
];

export function getStrategy(domain: string): RetailerStrategy {
  return strategies.find((s) => s.canHandle(domain)) || strategies[strategies.length - 1];
}
