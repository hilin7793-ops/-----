function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
}

export function randomNormal({ average, standardDeviation, rng = Math.random }) {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = rng();
  }

  while (v === 0) {
    v = rng();
  }

  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return average + z * standardDeviation;
}

export function snapToStep(value, step, minValue = 0) {
  if (!step || step <= 0) {
    return value;
  }

  const steps = Math.round((value - minValue) / step);
  return minValue + steps * step;
}

export function randomSteppedNormal({
  average,
  standardDeviation,
  step,
  minValue,
  maxValue,
  rng = Math.random,
}) {
  const rawValue = randomNormal({ average, standardDeviation, rng });
  const clampedValue = clamp(rawValue, minValue, maxValue);
  const steppedValue = snapToStep(clampedValue, step, minValue);
  return clamp(steppedValue, minValue, maxValue);
}

export function pickWeightedItem(weightEntries, rng = Math.random) {
  const positiveEntries = weightEntries.filter(([, weight]) => weight > 0);
  const totalWeight = positiveEntries.reduce((sum, [, weight]) => sum + weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const threshold = rng() * totalWeight;
  let current = 0;

  for (const [item, weight] of positiveEntries) {
    current += weight;
    if (threshold <= current) {
      return item;
    }
  }

  return positiveEntries.at(-1)?.[0] ?? null;
}
