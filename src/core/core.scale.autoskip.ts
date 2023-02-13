/* eslint-disable @typescript-eslint/no-use-before-define */
import type {Scale, Tick} from '../types/index.js';
import {isNullOrUndef, valueOrDefault} from '../helpers/helpers.core.js';
import {_factorize} from '../helpers/helpers.math.js';

/**
 * Returns a subset of ticks to be plotted to avoid overlapping labels.
 * @param scale
 * @param ticks
 * @private
 */
export function autoSkip(scale: Scale, ticks: Tick[]) {
  const tickOpts = scale.options.ticks;
  const determinedMaxTicks = determineMaxTicks(scale);
  const ticksLimit = Math.min(tickOpts.maxTicksLimit || determinedMaxTicks, determinedMaxTicks);
  const majorIndices = tickOpts.major.enabled ? getMajorIndices(ticks) : [];
  const numMajorIndices = majorIndices.length;
  const first = majorIndices[0];
  const last = majorIndices[numMajorIndices - 1];
  const newTicks = [];

  // If there are too many major ticks to display them all
  if (numMajorIndices > ticksLimit) {
    skipMajors(ticks, newTicks, majorIndices, numMajorIndices / ticksLimit);
    return newTicks;
  }

  const spacing = calculateSpacing(majorIndices, ticks, ticksLimit);

  if (numMajorIndices > 0) {
    let i: number, ilen: number;
    const avgMajorSpacing = numMajorIndices > 1 ? Math.round((last - first) / (numMajorIndices - 1)) : null;
    skip(ticks, newTicks, spacing, isNullOrUndef(avgMajorSpacing) ? 0 : first - avgMajorSpacing, first);
    for (i = 0, ilen = numMajorIndices - 1; i < ilen; i++) {
      skip(ticks, newTicks, spacing, majorIndices[i], majorIndices[i + 1]);
    }
    skip(ticks, newTicks, spacing, last, isNullOrUndef(avgMajorSpacing) ? ticks.length : last + avgMajorSpacing);
    return newTicks;
  }
  skip(ticks, newTicks, spacing);
  return newTicks;
}

function determineMaxTicks(scale: Scale) {
  const offset = scale.options.offset;
  const tickLength = scale._tickSize();
  const maxScale = scale._length / tickLength + (offset ? 0 : 1);
  const maxChart = scale._maxLength / tickLength;
  return Math.floor(Math.min(maxScale, maxChart));
}

/**
 * @param majorIndices
 * @param ticks
 * @param ticksLimit
 */
function calculateSpacing(majorIndices: number[], ticks: Tick[], ticksLimit: number) {
  const evenMajorSpacing = getEvenSpacing(majorIndices);
  const spacing = ticks.length / ticksLimit;

  // If the major ticks are evenly spaced apart, place the minor ticks
  // so that they divide the major ticks into even chunks
  if (!evenMajorSpacing) {
    return Math.max(spacing, 1);
  }

  const factors = _factorize(evenMajorSpacing);
  for (let i = 0, ilen = factors.length - 1; i < ilen; i++) {
    const factor = factors[i];
    if (factor > spacing) {
      return factor;
    }
  }
  return Math.max(spacing, 1);
}

/**
 * @param {Tick[]} ticks
 */
function getMajorIndices(ticks: Tick[]) {
  const result = [];
  let i: number, ilen: number;
  for (i = 0, ilen = ticks.length; i < ilen; i++) {
    if (ticks[i].major) {
      result.push(i);
    }
  }
  return result;
}

/**
 * @param ticks
 * @param newTicks
 * @param majorIndices
 * @param spacing
 */
function skipMajors(ticks: Tick[], newTicks: Tick[], majorIndices: number[], spacing: number) {
  let count = 0;
  let next = majorIndices[0];
  let i: number;

  spacing = Math.ceil(spacing);
  for (i = 0; i < ticks.length; i++) {
    if (i === next) {
      newTicks.push(ticks[i]);
      count++;
      next = majorIndices[count * spacing];
    }
  }
}

/**
 * @param ticks
 * @param newTicks
 * @param spacing
 * @param [majorStart]
 * @param [majorEnd]
 */
function skip(ticks: Tick[], newTicks: Tick[], spacing: number, majorStart?: number, majorEnd?: number) {
  const start = valueOrDefault(majorStart, 0);
  const end = Math.min(valueOrDefault(majorEnd, ticks.length), ticks.length);
  let count = 0;
  let length: number, i: number, next: number;

  spacing = Math.ceil(spacing);
  if (majorEnd) {
    length = majorEnd - majorStart;
    spacing = length / Math.floor(length / spacing);
  }

  next = start;

  while (next < 0) {
    count++;
    next = Math.round(start + count * spacing);
  }

  for (i = Math.max(start, 0); i < end; i++) {
    if (i === next) {
      newTicks.push(ticks[i]);
      count++;
      next = Math.round(start + count * spacing);
    }
  }
}


/**
 * @param arr
 */
function getEvenSpacing(arr: number[]) {
  const len = arr.length;
  let i: number, diff: number;

  if (len < 2) {
    return false;
  }

  for (diff = arr[0], i = 1; i < len; ++i) {
    if (arr[i] - arr[i - 1] !== diff) {
      return false;
    }
  }
  return diff;
}
