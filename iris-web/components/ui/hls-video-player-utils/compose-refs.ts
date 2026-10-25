import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

export function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => refs.forEach((ref) => setRef(ref, node));
}

export function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  const latest = React.useRef(refs);
  React.useLayoutEffect(() => {
    latest.current = refs;
  });
  return React.useCallback((node: T | null) => latest.current.forEach((ref) => setRef(ref, node)), []);
}
