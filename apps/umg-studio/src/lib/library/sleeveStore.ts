export interface SleeveTemplate {
  id: string;
  name: string;
  createdAt: number;
  sleeveJson: string;
  notes?: string;
}

const STORAGE_KEY = "umg_studio_sleeve_library";

function generateId(): string {
  return `sleeve_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listSleeves(): SleeveTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const templates = JSON.parse(raw);
    if (!Array.isArray(templates)) return [];
    return templates;
  } catch {
    return [];
  }
}

export function saveSleeveTemplate(template: Omit<SleeveTemplate, "id" | "createdAt">): SleeveTemplate {
  const templates = listSleeves();
  
  const newTemplate: SleeveTemplate = {
    id: generateId(),
    name: template.name,
    createdAt: Date.now(),
    sleeveJson: template.sleeveJson,
    notes: template.notes
  };

  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function loadSleeveTemplate(id: string): SleeveTemplate | null {
  const templates = listSleeves();
  return templates.find(t => t.id === id) ?? null;
}

export function deleteSleeveTemplate(id: string): boolean {
  const templates = listSleeves();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
