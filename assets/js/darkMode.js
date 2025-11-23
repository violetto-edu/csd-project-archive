import { getLocalStorage, setLocalStorage } from "./utils.js";

const DARK_MODE_KEY = "darkMode";

export function initDarkMode() {
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const html = document.documentElement;

  if (!darkModeToggle) {
    return;
  }

  // Check for saved preference or system preference
  const savedMode = getLocalStorage(DARK_MODE_KEY, null);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedMode !== null ? savedMode : prefersDark;

  // Apply initial theme (only if not already set by inline script)
  const currentlyDark = html.classList.contains("dark");
  if (isDark && !currentlyDark) {
    html.classList.add("dark");
  } else if (!isDark && currentlyDark) {
    html.classList.remove("dark");
  }

  // Update toggle icon
  updateDarkModeIcon(darkModeToggle, isDark);

  // Toggle dark mode on button click
  darkModeToggle.addEventListener("click", function () {
    const isDarkMode = html.classList.contains("dark");

    if (isDarkMode) {
      html.classList.remove("dark");
      setLocalStorage(DARK_MODE_KEY, false);
      updateDarkModeIcon(darkModeToggle, false);
    } else {
      html.classList.add("dark");
      setLocalStorage(DARK_MODE_KEY, true);
      updateDarkModeIcon(darkModeToggle, true);
    }
  });

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      // Only apply system preference if user hasn't set a preference
      if (savedMode === null) {
        if (e.matches) {
          html.classList.add("dark");
          updateDarkModeIcon(darkModeToggle, true);
        } else {
          html.classList.remove("dark");
          updateDarkModeIcon(darkModeToggle, false);
        }
      }
    });
}

function updateDarkModeIcon(toggle, isDark) {
  const icon = toggle.querySelector("span");
  if (icon) {
    icon.textContent = isDark ? "light_mode" : "dark_mode";
  }
}
