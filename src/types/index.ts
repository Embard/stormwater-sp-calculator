export type NormativeBasis = 'normative-fixed' | 'normative-range' | 'calculated' | 'manual';

export type NormativeValue = {
  value: number;
  min?: number;
  max?: number;
  default?: number;
  unit: string;
  sourceId: string;
  basis: NormativeBasis;
  justification?: string;
};

export type SourceRef = {
  id: string;
  title: string;
  revision: string;
  checkedAt: string;
  url?: string;
  note?: string;
};

export type PlaceMatch = {
  id: string;
  name: string;
  region: string;
  district?: string;
  lat: number;
  lon: number;
  confidence: number;
  source: 'local' | 'geocoder' | 'manual-map';
};

export type ClimateParameters = {
  placeId: string;
  stationName: string;
  stationDistanceKm?: number;
  hdWarmPeriodMm: NormativeValue;
  htColdPeriodMm: NormativeValue;
  q20: NormativeValue;
  n: NormativeValue;
  mr: NormativeValue;
  gamma: NormativeValue;
  haRainTreatmentMm: NormativeValue;
  hcMeltTenHourMm: NormativeValue;
};

export type SurfaceKind = 'driveway' | 'lawn' | 'roof' | 'structure' | 'custom';

export type SurfaceItem = {
  id: string;
  templateId?: string;
  name: string;
  kind: SurfaceKind;
  areaHa: number;
  annualRainCoeff: NormativeValue;
  designRainCoeff: NormativeValue;
  isHardSurface: boolean;
  isWashed: boolean;
  isCleanedFromSnow: boolean;
  routedToTreatment: boolean;
};

export type RainFlowInput = {
  areaHa: number;
  zMid: NormativeValue;
  q20: NormativeValue;
  p: NormativeValue;
  n: NormativeValue;
  mr: NormativeValue;
  gamma: NormativeValue;
  tConMin: NormativeValue;
  tCanMin: NormativeValue;
  pipeLengthM: number;
  pipeVelocityMS: number;
};

export type TreatmentInput = {
  rainTreatmentAreaHa: number;
  rainTreatmentCoeff: NormativeValue;
  rainTreatmentCoeffScopeAreaHa: number;
  pollutedRainFraction: NormativeValue;
  rainProcessingHours: number;
  meltProcessingHours: number;
  settlingHours: number;
  technicalBreakHours: number;
  reservoirWorkingVolumeM3: number;
  reservoirReservePercent: NormativeValue;
  reservoirMode: 'regulation-only' | 'regulation-and-settling';
};

export type ProjectInput = {
  objectName: string;
  place: PlaceMatch;
  climate: ClimateParameters;
  totalAreaHa: number;
  surfaces: SurfaceItem[];
  snowMeltCoeff: NormativeValue;
  snowCleanedAreaHa: number;
  washingAreaHa: number;
  washingRateLPerM2: NormativeValue;
  washingCountPerYear: number;
  washingRunoffCoeff: NormativeValue;
  meltUnevennessCoeff: NormativeValue;
  rainFlow: RainFlowInput;
  treatment: TreatmentInput;
};

export type AnnualRunoffResult = {
  totalAreaHa: number;
  weightedAnnualRainCoeff: number;
  annualRainVolumeM3: number;
  snowRemovalCoeffKy: number;
  annualMeltVolumeM3: number;
  washingVolumeM3: number;
  totalAnnualVolumeM3: number;
};

export type RainFlowResult = {
  tpMin: number;
  trMin: number;
  parameterA: number;
  qrLS: number;
};

export type TreatmentResult = {
  rainTreatmentVolumeM3: number;
  dailyMeltVolumeM3: number;
  rainTreatmentCapacityM3PerH: number;
  meltTreatmentCapacityM3PerH: number;
  selectedTreatmentCapacityM3PerH: number;
  requiredReservoirFullVolumeM3: number;
  reservoirIsEnoughForRain: boolean;
  reservoirIsEnoughForMelt: boolean;
};

export type CalculationResults = {
  annual: AnnualRunoffResult;
  rainFlow: RainFlowResult;
  treatment: TreatmentResult;
};

export type ValidationSeverity = 'info' | 'warning' | 'error';

export type ValidationIssue = {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  field?: string;
};
