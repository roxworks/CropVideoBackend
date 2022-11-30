// Exclude keys from clip
export function exclude<Clip, Key extends keyof Clip>(clip: Clip, ...keys: Key[]): Omit<Clip, Key> {
  for (const key of keys) {
    delete clip[key];
  }
  return clip;
}
