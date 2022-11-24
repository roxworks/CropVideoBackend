// Exclude keys from user
export function exclude<T, Key extends keyof T>(list: T, ...keys: Key[]): Omit<T, Key> {
  for (let key of keys) {
    delete list[key];
  }
  return list;
}
