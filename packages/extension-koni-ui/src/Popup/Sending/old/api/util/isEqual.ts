// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

function flatten (key: string | null, value?: unknown): unknown {
  return !value
    ? value
    : (value as Record<string, unknown>).$$typeof
      ? ''
      : Array.isArray(value)
        ? value.map((item) => flatten(null, item))
        : value;
}

export default function isEqual <T> (a?: T, b?: T): boolean {
  return JSON.stringify({ test: a }, flatten) === JSON.stringify({ test: b }, flatten);
}
