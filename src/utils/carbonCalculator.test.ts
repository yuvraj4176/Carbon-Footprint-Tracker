/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { calculateAnnualFootprint, DEFAULT_CARBON_PROFILE } from "./carbonCalculator";
import { CarbonProfile } from "../types";

describe("Carbon Footprint Analysis Engine Tests", () => {
  it("should calculate correct baseline figures for DEFAULT_CARBON_PROFILE", () => {
    const baseline = calculateAnnualFootprint(DEFAULT_CARBON_PROFILE);
    
    expect(baseline).toBeDefined();
    expect(baseline.total).toBeGreaterThan(0);
    expect(baseline.transport).toBeGreaterThan(0);
    expect(baseline.home).toBeGreaterThan(0);
    expect(baseline.food).toBeGreaterThan(0);
    expect(baseline.shopping).toBeGreaterThan(0);
    expect(baseline.total).toEqual(
      baseline.transport + baseline.home + baseline.food + baseline.shopping
    );
  });

  describe("Transport Emissions Calculations", () => {
    const baseProfile: CarbonProfile = {
      carMilesPerWeek: 100,
      carType: "petrol",
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      publicTransitHoursPerWeek: 0,
      electricityKwhPerMonth: 0,
      cleanEnergyPercentage: 0,
      heatingType: "none",
      householdSize: 1,
      dietType: "vegan",
      localFoodRatio: 0,
      foodWasteLevel: "low",
      shoppingFrequency: "minimal",
      recyclingHabit: "none",
    };

    it("should calculate emissions accurately for different car engines", () => {
      const petrolEmissions = calculateAnnualFootprint({ ...baseProfile, carType: "petrol" });
      const dieselEmissions = calculateAnnualFootprint({ ...baseProfile, carType: "diesel" });
      const hybridEmissions = calculateAnnualFootprint({ ...baseProfile, carType: "hybrid" });
      const electricEmissions = calculateAnnualFootprint({ ...baseProfile, carType: "electric" });
      const noCarEmissions = calculateAnnualFootprint({ ...baseProfile, carType: "none" });

      // Petrol should have highest factors (0.40 kg/mi)
      // Diesel: 0.38
      // Hybrid: 0.22
      // Electric: 0.08
      expect(petrolEmissions.transport).toBeGreaterThan(dieselEmissions.transport);
      expect(dieselEmissions.transport).toBeGreaterThan(hybridEmissions.transport);
      expect(hybridEmissions.transport).toBeGreaterThan(electricEmissions.transport);
      expect(noCarEmissions.transport).toBe(0);
    });

    it("should calculate flight emissions on short-haul vs long-haul factors", () => {
      const shortFlightsOnly = calculateAnnualFootprint({
        ...baseProfile,
        carMilesPerWeek: 0,
        flightsShortPerYear: 2,
        flightsLongPerYear: 0,
      });

      const longFlightsOnly = calculateAnnualFootprint({
        ...baseProfile,
        carMilesPerWeek: 0,
        flightsShortPerYear: 0,
        flightsLongPerYear: 1,
      });

      expect(shortFlightsOnly.transport).toBe(2 * 280);
      expect(longFlightsOnly.transport).toBe(1150);
    });
  });

  describe("Home Energy Emissions Calculations", () => {
    const baseProfile: CarbonProfile = {
      carMilesPerWeek: 0,
      carType: "none",
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      publicTransitHoursPerWeek: 0,
      electricityKwhPerMonth: 300,
      cleanEnergyPercentage: 0,
      heatingType: "none",
      householdSize: 1,
      dietType: "vegan",
      localFoodRatio: 0,
      foodWasteLevel: "low",
      shoppingFrequency: "minimal",
      recyclingHabit: "none",
    };

    it("should apply green energy offsets to lower the electricity baseline", () => {
      const standardUtility = calculateAnnualFootprint({
        ...baseProfile,
        cleanEnergyPercentage: 0,
      });

      const halfGreenUtility = calculateAnnualFootprint({
        ...baseProfile,
        cleanEnergyPercentage: 50,
      });

      const solarUtility = calculateAnnualFootprint({
        ...baseProfile,
        cleanEnergyPercentage: 100,
      });

      expect(standardUtility.home).toBeGreaterThan(halfGreenUtility.home);
      expect(solarUtility.home).toBe(0);
    });

    it("should divide common home footprint proportionally across larger household size", () => {
      const livingAlone = calculateAnnualFootprint({
        ...baseProfile,
        householdSize: 1,
      });

      const roomiesThree = calculateAnnualFootprint({
        ...baseProfile,
        householdSize: 3,
      });

      expect(livingAlone.home).toBe(roomiesThree.home * 3);
    });
  });

  describe("Dietary Actions Emissions Calculations", () => {
    const baseProfile: CarbonProfile = {
      carMilesPerWeek: 0,
      carType: "none",
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      publicTransitHoursPerWeek: 0,
      electricityKwhPerMonth: 0,
      cleanEnergyPercentage: 0,
      heatingType: "none",
      householdSize: 1,
      dietType: "balanced",
      localFoodRatio: 0,
      foodWasteLevel: "low",
      shoppingFrequency: "minimal",
      recyclingHabit: "none",
    };

    it("should correctly sort diet footprints from highest beef-consumption down to pure plant", () => {
      const heavyMeat = calculateAnnualFootprint({ ...baseProfile, dietType: "meat-heavy" });
      const balanced = calculateAnnualFootprint({ ...baseProfile, dietType: "balanced" });
      const lowMeat = calculateAnnualFootprint({ ...baseProfile, dietType: "low-meat" });
      const vegetarian = calculateAnnualFootprint({ ...baseProfile, dietType: "vegetarian" });
      const vegan = calculateAnnualFootprint({ ...baseProfile, dietType: "vegan" });

      expect(heavyMeat.food).toBeGreaterThan(balanced.food);
      expect(balanced.food).toBeGreaterThan(lowMeat.food);
      expect(lowMeat.food).toBeGreaterThan(vegetarian.food);
      expect(vegetarian.food).toBeGreaterThan(vegan.food);
    });

    it("should award local ratio discounts up to 15% reduction maximum", () => {
      const globalFood = calculateAnnualFootprint({ ...baseProfile, dietType: "balanced", localFoodRatio: 0 });
      const allLocalFood = calculateAnnualFootprint({ ...baseProfile, dietType: "balanced", localFoodRatio: 100 });

      // Sourcing food 100% locally reduces dietary factors by exactly 15%
      const difference = Math.abs(allLocalFood.food - (globalFood.food * 0.85));
      expect(difference).toBeLessThanOrEqual(2);
    });
  });

  describe("Shopping & Consumption Baseline Variations", () => {
    const baseProfile: CarbonProfile = {
      carMilesPerWeek: 0,
      carType: "none",
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      publicTransitHoursPerWeek: 0,
      electricityKwhPerMonth: 0,
      cleanEnergyPercentage: 0,
      heatingType: "none",
      householdSize: 1,
      dietType: "vegan",
      localFoodRatio: 0,
      foodWasteLevel: "low",
      shoppingFrequency: "average",
      recyclingHabit: "none",
    };

    it("should measure shopping volume footprint changes correctly", () => {
      const shoppingFrequent = calculateAnnualFootprint({ ...baseProfile, shoppingFrequency: "frequent" });
      const shoppingAvg = calculateAnnualFootprint({ ...baseProfile, shoppingFrequency: "average" });
      const shoppingMinimal = calculateAnnualFootprint({ ...baseProfile, shoppingFrequency: "minimal" });

      expect(shoppingFrequent.shopping).toBeGreaterThan(shoppingAvg.shopping);
      expect(shoppingAvg.shopping).toBeGreaterThan(shoppingMinimal.shopping);
    });

    it("should offer diligent recycling discount offsets over standard", () => {
      const nonRecycler = calculateAnnualFootprint({ ...baseProfile, recyclingHabit: "none" });
      const partialRecycler = calculateAnnualFootprint({ ...baseProfile, recyclingHabit: "partial" });
      const diligentRecycler = calculateAnnualFootprint({ ...baseProfile, recyclingHabit: "diligent" });

      expect(nonRecycler.shopping).toBeGreaterThan(partialRecycler.shopping);
      expect(partialRecycler.shopping).toBeGreaterThan(diligentRecycler.shopping);
    });
  });
});
