import type { TreatmentInput, TreatmentResult } from '../types';
import { mmHaToM3 } from '../utils/units';
import { dailyMeltVolumeM3 } from './meltedWater';

export function rainTreatmentVolumeM3(args: {
  haRainTreatmentMm: number;
  areaHa: number;
  runoffCoeff: number;
  pollutedRainFraction: number;
}): number {
  return mmHaToM3(args.haRainTreatmentMm, args.areaHa) * args.runoffCoeff * args.pollutedRainFraction;
}

function processingCapacity(volumeM3: number, periodHours: number, settlingHours: number, technicalBreakHours: number): number {
  const activeHours = periodHours - settlingHours - technicalBreakHours;
  if (activeHours <= 0) return Number.POSITIVE_INFINITY;
  return volumeM3 / activeHours;
}

function meltResidualPerDay(dailyMeltVolumeM3: number, meltProcessingHours: number): number {
  if (meltProcessingHours <= 24) return 0;
  return Math.max(0, dailyMeltVolumeM3 * (1 - 24 / meltProcessingHours));
}

export function calculateTreatment(args: {
  treatment: TreatmentInput;
  haRainTreatmentMm: number;
  hcMeltTenHourMm: number;
  totalAreaHa: number;
  meltRunoffCoeff: number;
  meltUnevennessCoeff: number;
  snowRemovalCoeffKy: number;
}): TreatmentResult {
  const rainVolume = rainTreatmentVolumeM3({
    haRainTreatmentMm: args.haRainTreatmentMm,
    areaHa: args.treatment.rainTreatmentAreaHa,
    runoffCoeff: args.treatment.rainTreatmentCoeff.value,
    pollutedRainFraction: args.treatment.pollutedRainFraction.value
  });

  const meltDailyVolume = dailyMeltVolumeM3({
    hcMeltTenHourMm: args.hcMeltTenHourMm,
    areaHa: args.totalAreaHa,
    meltRunoffCoeff: args.meltRunoffCoeff,
    meltUnevennessCoeff: args.meltUnevennessCoeff,
    snowRemovalCoeffKy: args.snowRemovalCoeffKy
  });

  const residual = meltResidualPerDay(meltDailyVolume, args.treatment.meltProcessingHours);
  const consecutiveDays = Math.max(1, args.treatment.meltConsecutiveDays || 1);
  const requiredMeltWorkingVolume = meltDailyVolume + (consecutiveDays - 1) * residual;
  const requiredReservoirWorkingVolume = Math.max(rainVolume, requiredMeltWorkingVolume);
  const reservoirControlCase = requiredMeltWorkingVolume > rainVolume ? 'melt' : 'rain';
  const reserveFactor = 1 + args.treatment.reservoirReservePercent.value / 100;
  const requiredReservoirFullVolume = requiredReservoirWorkingVolume * reserveFactor;

  const rainCapacity = processingCapacity(
    rainVolume,
    args.treatment.rainProcessingHours,
    args.treatment.settlingHours,
    args.treatment.technicalBreakHours
  );
  const meltCapacity = processingCapacity(
    meltDailyVolume,
    args.treatment.meltProcessingHours,
    args.treatment.settlingHours,
    args.treatment.technicalBreakHours
  );

  return {
    rainTreatmentVolumeM3: rainVolume,
    dailyMeltVolumeM3: meltDailyVolume,
    rainTreatmentCapacityM3PerH: rainCapacity,
    meltTreatmentCapacityM3PerH: meltCapacity,
    selectedTreatmentCapacityM3PerH: Math.max(rainCapacity, meltCapacity),
    meltResidualPerDayM3: residual,
    requiredMeltWorkingVolumeM3: requiredMeltWorkingVolume,
    requiredReservoirWorkingVolumeM3: requiredReservoirWorkingVolume,
    reservoirControlCase,
    requiredReservoirFullVolumeM3: requiredReservoirFullVolume,
    reservoirIsEnoughForRain: args.treatment.reservoirWorkingVolumeM3 >= rainVolume,
    reservoirIsEnoughForMelt: args.treatment.reservoirWorkingVolumeM3 >= requiredMeltWorkingVolume
  };
}
