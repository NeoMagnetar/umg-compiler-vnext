const KEY = "umg_studio_sleeve_json_v1";

export function loadSleeveJson(fallback: string): string {
  const v = localStorage.getItem(KEY);
  return v ?? fallback;
}

export function saveSleeveJson(value: string) {
  localStorage.setItem(KEY, value);
}
