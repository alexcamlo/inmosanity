export function requireProperty<T>(
  property: T | null,
  onMissing: () => never
): T {
  if (property === null) return onMissing()
  return property
}
