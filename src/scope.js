let namespace = '';

export function getNamespace() {
  return namespace;
}

export function setNamespace(value) {
  namespace = value == null ? '' : String(value);
  return namespace;
}

export function scopedKey(key) {
  return namespace ? `${namespace}::${key}` : key;
}
