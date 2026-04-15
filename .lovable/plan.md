

## Fix: Toggle dark mode icon (Moon → Sun)

The dark mode toggle in `ProjectHome.tsx` always shows a `Moon` icon. It should show a `Sun` icon when dark mode is active.

### Change

In `src/components/ProjectHome.tsx`:
- Import `Sun` from `lucide-react`
- Replace the static `<Moon>` with a conditional: show `Sun` in dark mode, `Moon` in light mode

### Fix build error

In `src/components/theme-provider.tsx`:
- The `ThemeProviderProps` type no longer exists in the installed version of `next-themes`. Replace it with `React.ComponentProps<typeof NextThemesProvider>`.

