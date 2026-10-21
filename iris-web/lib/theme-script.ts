// Shared by the server layout (inline script) and the client theme hook, so it must not be a client module.
export const THEME_KEY = "iris-theme";

/** Runs in <head> before the first paint. Keep in sync with applyTheme() in lib/theme.ts. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
