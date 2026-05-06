import type { NormativeValue, SurfaceItem, SurfaceKind } from '../types';

const sourceId = 'sp32-2018-izm1-5';

export type SurfaceTemplate = {
  id: string;
  label: string;
  kind: SurfaceKind;
  annual: NormativeValue;
  cover: NormativeValue;
  design: NormativeValue;
  isHardSurface: boolean;
  defaultWashed: boolean;
  defaultTreatment: boolean;
};

function norm(value: number, min: number | undefined, max: number | undefined, unit = '-'): NormativeValue {
  if (min === undefined || max === undefined || min === max) {
    return { value, min, max, default: value, unit, sourceId, basis: 'normative-fixed' };
  }
  return { value, min, max, default: value, unit, sourceId, basis: 'normative-range' };
}

export const SURFACE_TEMPLATES: SurfaceTemplate[] = [
  {
    id: 'asphalt',
    label: 'Асфальтобетонные покрытия',
    kind: 'driveway',
    annual: norm(0.65, 0.6, 0.7),
    cover: norm(0.23, 0.23, 0.33),
    design: norm(0.95, 0.95, 0.95),
    isHardSurface: true,
    defaultWashed: true,
    defaultTreatment: true
  },
  {
    id: 'roof',
    label: 'Кровли',
    kind: 'roof',
    annual: norm(0.65, 0.6, 0.7),
    cover: norm(0.23, 0.23, 0.33),
    design: norm(0.95, 0.95, 0.95),
    isHardSurface: true,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'block_paving',
    label: 'Брусчатые мостовые и щебеночные покрытия',
    kind: 'driveway',
    annual: norm(0.45, 0.4, 0.5),
    cover: norm(0.224, 0.224, 0.224),
    design: norm(0.6, 0.6, 0.6),
    isHardSurface: true,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'cobblestone',
    label: 'Булыжные мостовые',
    kind: 'driveway',
    annual: norm(0.45, 0.4, 0.5),
    cover: norm(0.145, 0.145, 0.145),
    design: norm(0.45, 0.45, 0.45),
    isHardSurface: true,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'gravel_unbound',
    label: 'Щебеночные покрытия без обработки вяжущими',
    kind: 'driveway',
    annual: norm(0.45, 0.4, 0.5),
    cover: norm(0.125, 0.125, 0.125),
    design: norm(0.4, 0.4, 0.4),
    isHardSurface: true,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'gravel_paths',
    label: 'Гравийные садово-парковые дорожки',
    kind: 'custom',
    annual: norm(0.25, 0.2, 0.3),
    cover: norm(0.09, 0.09, 0.09),
    design: norm(0.3, 0.3, 0.3),
    isHardSurface: false,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'soil',
    label: 'Грунтовые поверхности',
    kind: 'custom',
    annual: norm(0.25, 0.2, 0.3),
    cover: norm(0.064, 0.064, 0.064),
    design: norm(0.2, 0.2, 0.2),
    isHardSurface: false,
    defaultWashed: false,
    defaultTreatment: false
  },
  {
    id: 'lawn',
    label: 'Газоны',
    kind: 'lawn',
    annual: norm(0.1, 0.1, 0.1),
    cover: norm(0.038, 0.038, 0.038),
    design: norm(0.1, 0.1, 0.1),
    isHardSurface: false,
    defaultWashed: false,
    defaultTreatment: false
  }
];

export function getSurfaceTemplate(templateId?: string): SurfaceTemplate {
  return SURFACE_TEMPLATES.find((item) => item.id === templateId) ?? SURFACE_TEMPLATES[0];
}

export function buildSurfaceFromTemplate(id: string, templateId: string, areaHa = 0): SurfaceItem {
  const template = getSurfaceTemplate(templateId);
  return {
    id,
    templateId: template.id,
    name: template.label,
    kind: template.kind,
    areaHa,
    annualRainCoeff: { ...template.annual },
    coverCoeff: { ...template.cover },
    designRainCoeff: { ...template.design },
    isHardSurface: template.isHardSurface,
    isWashed: template.defaultWashed,
    isCleanedFromSnow: template.isHardSurface,
    routedToTreatment: template.defaultTreatment
  };
}

export function applySurfaceTemplate(surface: SurfaceItem, templateId: string): SurfaceItem {
  const template = getSurfaceTemplate(templateId);
  return {
    ...surface,
    templateId: template.id,
    name: template.label,
    kind: template.kind,
    annualRainCoeff: { ...template.annual },
    coverCoeff: { ...template.cover },
    designRainCoeff: { ...template.design },
    isHardSurface: template.isHardSurface,
    isWashed: surface.isWashed && template.isHardSurface ? surface.isWashed : template.defaultWashed,
    isCleanedFromSnow: template.isHardSurface ? surface.isCleanedFromSnow : false,
    routedToTreatment: surface.routedToTreatment
  };
}
