'use strict';

const SOLVER_EPSILON = 1e-9;
const SOLVER_MEMO_LIMIT = 250000;

self.onmessage = event => {
  const message = event.data || {};
  if (message.type !== 'solve') return;

  try {
    const result = solveOptimization(message.payload || {});
    self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error && error.message ? error.message : String(error || 'SOLVER_ERROR')
    });
  }
};

function solveOptimization(payload) {
  const startedAt = Date.now();
  const timeoutMs = Math.max(1000, Number(payload.timeoutMs) || 30000);
  const hardDeadline = startedAt + timeoutMs;
  const searchDeadline = Math.max(startedAt, hardDeadline - 750);
  const cfgTrim = Math.max(0, Number(payload.cfgTrim) || 0);
  const skus = Array.isArray(payload.skus) ? payload.skus.filter(sku => sku && sku.code) : [];
  const fallbackPlans = Array.isArray(payload.fallbackPlans) ? payload.fallbackPlans : [];
  const minSobraBySku = Object.fromEntries(skus.map(sku => [sku.code, Number(sku.minSobra) || 1000]));
  const stats = { explored: 0, lastProgressAt: 0, startedAt, completedSkus: 0, totalSkus: skus.length };
  const skuSolutions = [];
  let allSkuSearchesComplete = true;

  skus.forEach((sku, skuIndex) => {
    const remainingSkus = Math.max(1, skus.length - skuIndex);
    const remainingTime = Math.max(0, searchDeadline - Date.now());
    const skuBudget = Math.max(100, Math.floor(remainingTime / remainingSkus));
    const skuDeadline = Math.min(searchDeadline, Date.now() + skuBudget);
    const skuFallbacks = fallbackPlans
      .map(plans => (plans || []).filter(plan => plan.sku === sku.code))
      .filter(plans => plans.length > 0);

    const solution = solveSkuExact(sku, cfgTrim, skuDeadline, skuFallbacks, stats);
    skuSolutions.push(solution);
    allSkuSearchesComplete = allSkuSearchesComplete && solution.complete;
    stats.completedSkus++;
    postSolverProgress(stats, sku.code, solution.frontier.length, true);
  });

  const validFallbackCandidates = fallbackPlans
    .filter(plans => validateFullPlanResources(plans, skus))
    .map(plans => candidateFromPlans(plans, minSobraBySku, cfgTrim));

  let combinedCandidates = [];
  let combinationComplete = allSkuSearchesComplete && skuSolutions.length === skus.length;

  if (combinationComplete) {
    let combinedFrontier = [emptyCandidate()];
    for (const solution of skuSolutions) {
      if (Date.now() >= hardDeadline) {
        combinationComplete = false;
        break;
      }

      const nextFrontier = [];
      for (const baseCandidate of combinedFrontier) {
        for (const skuCandidate of solution.frontier) {
          addParetoCandidate(nextFrontier, combineCandidates(baseCandidate, skuCandidate));
        }
      }
      combinedFrontier = nextFrontier;
      if (!combinedFrontier.length) {
        combinationComplete = false;
        break;
      }
    }
    if (combinationComplete) combinedCandidates = combinedFrontier;
  }

  const candidates = [];
  const candidatePool = combinationComplete
    ? combinedCandidates
    : [...validFallbackCandidates, ...combinedCandidates];
  candidatePool.forEach(candidate => addParetoCandidate(candidates, candidate));
  if (!candidates.length) {
    throw new Error('SOLVER_SEM_PLANO_VIAVEL');
  }

  const bestGlobal = candidates.reduce((best, candidate) => (
    !best || compareGlobalCandidates(candidate, best) < 0 ? candidate : best
  ), null);
  const bestForced = candidates.reduce((best, candidate) => (
    !best || compareForcedCandidates(candidate, best) < 0 ? candidate : best
  ), null);
  const optimal = allSkuSearchesComplete && combinationComplete;

  return {
    global: exportCandidate(bestGlobal),
    forced: exportCandidate(bestForced),
    optimal,
    timedOut: !optimal,
    explored: stats.explored,
    elapsedMs: Date.now() - startedAt,
    candidateCount: candidates.length,
    skuFrontiers: skuSolutions.map(solution => ({
      sku: solution.sku,
      complete: solution.complete,
      candidates: solution.frontier.length,
      explored: solution.explored
    }))
  };
}

function solveSkuExact(sku, cfgTrim, deadline, fallbackPlans, stats) {
  const skuStartedExplored = stats.explored;
  const minSobra = Number(sku.minSobra) || 1000;
  const pieces = (sku.pieces || [])
    .map(piece => ({ ...piece, dim: Number(piece.dim) || 0 }))
    .filter(piece => piece.dim > 0)
    .sort((a, b) => b.dim - a.dim || String(a.pieceId).localeCompare(String(b.pieceId)));
  const expectedPieceIds = pieces.map(pieceIdentity).sort();
  const smallestPiece = pieces.length ? pieces[pieces.length - 1].dim : 0;

  const scraps = (sku.scraps || [])
    .map(scrap => ({
      id: scrap.id,
      address: scrap.endereco || '',
      len: Number(scrap.medida) || 0,
      available: (Number(scrap.medida) || 0) - cfgTrim
    }))
    .filter(scrap => scrap.id && scrap.available >= smallestPiece)
    .sort((a, b) => a.available - b.available || String(a.id).localeCompare(String(b.id)));

  const virginTypes = (sku.virginBars || [])
    .map(bar => ({
      dim: Number(bar.dim) || 0,
      qty: Math.max(0, Math.floor(Number(bar.qty) || 0)),
      len: (Number(bar.dim) || 0) - 50,
      available: (Number(bar.dim) || 0) - 50 - cfgTrim
    }))
    .filter(bar => bar.qty > 0 && bar.available >= smallestPiece)
    .sort((a, b) => a.available - b.available || a.dim - b.dim);

  const frontier = [];
  fallbackPlans.forEach(plans => {
    if (
      coversExpectedPieces(plans, expectedPieceIds)
      && validateSkuPlanResources(plans, scraps, virginTypes)
    ) {
      addParetoCandidate(frontier, candidateFromPlans(plans, { [sku.code]: minSobra }, cfgTrim));
    }
  });

  if (!pieces.length) {
    if (!frontier.length) frontier.push(emptyCandidate());
    return { sku: sku.code, frontier, complete: true, explored: 0 };
  }

  const bins = [];
  const scrapUsed = new Array(scraps.length).fill(false);
  const virginRemaining = virginTypes.map(bar => Math.min(bar.qty, pieces.length));
  const suffixLengths = new Array(pieces.length + 1).fill(0);
  for (let i = pieces.length - 1; i >= 0; i--) suffixLengths[i] = suffixLengths[i + 1] + pieces[i].dim;
  const memo = new Set();
  let stoppedByTime = false;

  function dfs(pieceIndex) {
    stats.explored++;
    if ((stats.explored & 255) === 0) {
      if (Date.now() >= deadline) {
        stoppedByTime = true;
        return;
      }
      postSolverProgress(stats, sku.code, frontier.length, false);
    }
    if (stoppedByTime) return;

    if (pieceIndex === pieces.length) {
      addParetoCandidate(frontier, candidateFromBins(bins, minSobra, cfgTrim));
      return;
    }

    const totalFreeCapacity = bins.reduce((sum, bin) => sum + bin.remaining, 0)
      + scraps.reduce((sum, scrap, index) => sum + (scrapUsed[index] ? 0 : scrap.available), 0)
      + virginTypes.reduce((sum, bar, index) => sum + bar.available * virginRemaining[index], 0);
    if (suffixLengths[pieceIndex] > totalFreeCapacity + SOLVER_EPSILON) return;

    const stateKey = buildStateKey(pieceIndex, bins, scraps, scrapUsed, virginTypes, virginRemaining);
    if (memo.has(stateKey)) return;
    if (memo.size < SOLVER_MEMO_LIMIT) memo.add(stateKey);

    const piece = pieces[pieceIndex];
    const existingIndexes = bins
      .map((bin, index) => ({ index, after: bin.remaining - piece.dim }))
      .filter(item => item.after >= -SOLVER_EPSILON)
      .sort((a, b) => a.after - b.after);
    const seenExisting = new Set();

    for (const item of existingIndexes) {
      const bin = bins[item.index];
      const symmetryKey = `${bin.type}|${bin.len}|${roundStateNumber(bin.remaining)}`;
      if (seenExisting.has(symmetryKey)) continue;
      seenExisting.add(symmetryKey);

      bin.remaining -= piece.dim;
      bin.pcs.push(piece);
      dfs(pieceIndex + 1);
      bin.pcs.pop();
      bin.remaining += piece.dim;
      if (stoppedByTime) return;
    }

    const seenNewScraps = new Set();
    for (let index = 0; index < scraps.length; index++) {
      if (scrapUsed[index] || scraps[index].available + SOLVER_EPSILON < piece.dim) continue;
      const scrap = scraps[index];
      const symmetryKey = `${scrap.len}|${scrap.available}`;
      if (seenNewScraps.has(symmetryKey)) continue;
      seenNewScraps.add(symmetryKey);

      scrapUsed[index] = true;
      bins.push({
        type: 'scrap',
        srcId: scrap.id,
        srcAddr: scrap.address,
        sourceDim: scrap.len,
        len: scrap.len,
        usable: scrap.available,
        remaining: scrap.available - piece.dim,
        pcs: [piece],
        sku: sku.code
      });
      dfs(pieceIndex + 1);
      bins.pop();
      scrapUsed[index] = false;
      if (stoppedByTime) return;
    }

    for (let index = 0; index < virginTypes.length; index++) {
      const bar = virginTypes[index];
      if (virginRemaining[index] <= 0 || bar.available + SOLVER_EPSILON < piece.dim) continue;

      virginRemaining[index]--;
      bins.push({
        type: 'virgin',
        srcId: `${sku.code}|${bar.dim}`,
        srcAddr: '',
        sourceDim: bar.dim,
        len: bar.len,
        usable: bar.available,
        remaining: bar.available - piece.dim,
        pcs: [piece],
        sku: sku.code
      });
      dfs(pieceIndex + 1);
      bins.pop();
      virginRemaining[index]++;
      if (stoppedByTime) return;
    }
  }

  if (Date.now() >= deadline) stoppedByTime = true;
  else dfs(0);

  return {
    sku: sku.code,
    frontier,
    complete: !stoppedByTime,
    explored: stats.explored - skuStartedExplored
  };
}

function buildStateKey(pieceIndex, bins, scraps, scrapUsed, virginTypes, virginRemaining) {
  const binState = bins
    .map(bin => `${bin.type[0]}:${roundStateNumber(bin.len)}:${roundStateNumber(bin.remaining)}`)
    .sort()
    .join(',');
  const scrapCounts = new Map();
  scraps.forEach((scrap, index) => {
    if (scrapUsed[index]) return;
    const key = `${roundStateNumber(scrap.len)}:${roundStateNumber(scrap.available)}`;
    scrapCounts.set(key, (scrapCounts.get(key) || 0) + 1);
  });
  const scrapState = [...scrapCounts.entries()].sort().map(([key, count]) => `${key}x${count}`).join(',');
  const virginState = virginTypes.map((bar, index) => `${bar.dim}:${virginRemaining[index]}`).join(',');
  return `${pieceIndex}|${binState}|${scrapState}|${virginState}`;
}

function roundStateNumber(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function candidateFromBins(bins, minSobra, cfgTrim) {
  const plans = bins.map(bin => ({
    type: bin.type,
    srcId: bin.srcId,
    srcAddr: bin.srcAddr || '',
    len: bin.len,
    usable: bin.usable,
    sku: bin.sku,
    pcs: bin.pcs.map(piece => ({ ...piece })),
    rem: Math.max(0, bin.remaining)
  }));
  return candidateFromPlans(plans, { [bins[0]?.sku || '']: minSobra }, cfgTrim);
}

function candidateFromPlans(plans, minSobraBySku, cfgTrim) {
  const clonedPlans = (plans || []).map(plan => ({
    ...plan,
    len: Number(plan.len) || 0,
    rem: Math.max(0, Number(plan.rem) || 0),
    pcs: (plan.pcs || []).map(piece => ({ ...piece, dim: Number(piece.dim) || 0 }))
  }));
  let pieceLen = 0;
  let reusableRem = 0;
  let discard = 0;
  let sourceLen = 0;
  let virginBars = 0;
  let scrapBars = 0;

  clonedPlans.forEach(plan => {
    pieceLen += plan.pcs.reduce((sum, piece) => sum + piece.dim, 0);
    sourceLen += plan.len;
    if (plan.type === 'virgin') virginBars++;
    if (plan.type === 'scrap') scrapBars++;
    const minSobra = Number(minSobraBySku[plan.sku]) || 1000;
    if (plan.rem >= minSobra) reusableRem += plan.rem;
    else discard += plan.rem;
  });

  return {
    plans: clonedPlans,
    pieceLen,
    reusableRem,
    usefulLen: pieceLen + reusableRem,
    sourceLen,
    waste: discard + clonedPlans.length * cfgTrim,
    virginBars,
    scrapBars,
    totalBins: clonedPlans.length
  };
}

function emptyCandidate() {
  return {
    plans: [], pieceLen: 0, reusableRem: 0, usefulLen: 0,
    sourceLen: 0, waste: 0, virginBars: 0, scrapBars: 0, totalBins: 0
  };
}

function combineCandidates(left, right) {
  return {
    plans: [...left.plans, ...right.plans],
    pieceLen: left.pieceLen + right.pieceLen,
    reusableRem: left.reusableRem + right.reusableRem,
    usefulLen: left.usefulLen + right.usefulLen,
    sourceLen: left.sourceLen + right.sourceLen,
    waste: left.waste + right.waste,
    virginBars: left.virginBars + right.virginBars,
    scrapBars: left.scrapBars + right.scrapBars,
    totalBins: left.totalBins + right.totalBins
  };
}

function addParetoCandidate(frontier, candidate) {
  for (const existing of frontier) {
    if (candidateDominates(existing, candidate)) return false;
  }
  for (let index = frontier.length - 1; index >= 0; index--) {
    if (candidateDominates(candidate, frontier[index])) frontier.splice(index, 1);
  }
  frontier.push(candidate);
  return true;
}

function candidateDominates(left, right) {
  const noWorse = left.sourceLen <= right.sourceLen + SOLVER_EPSILON
    && left.usefulLen + SOLVER_EPSILON >= right.usefulLen
    && left.waste <= right.waste + SOLVER_EPSILON
    && left.virginBars <= right.virginBars
    && left.totalBins <= right.totalBins
    && left.scrapBars >= right.scrapBars;
  if (!noWorse) return false;

  return left.sourceLen < right.sourceLen - SOLVER_EPSILON
    || left.usefulLen > right.usefulLen + SOLVER_EPSILON
    || left.waste < right.waste - SOLVER_EPSILON
    || left.virginBars < right.virginBars
    || left.totalBins < right.totalBins
    || left.scrapBars > right.scrapBars
    || sameCandidateMetrics(left, right);
}

function sameCandidateMetrics(left, right) {
  return Math.abs(left.sourceLen - right.sourceLen) <= SOLVER_EPSILON
    && Math.abs(left.usefulLen - right.usefulLen) <= SOLVER_EPSILON
    && Math.abs(left.waste - right.waste) <= SOLVER_EPSILON
    && left.virginBars === right.virginBars
    && left.totalBins === right.totalBins
    && left.scrapBars === right.scrapBars;
}

function compareGlobalCandidates(left, right) {
  const efficiencyDiff = candidateEfficiency(right) - candidateEfficiency(left);
  if (Math.abs(efficiencyDiff) > SOLVER_EPSILON) return efficiencyDiff;
  if (left.waste !== right.waste) return left.waste - right.waste;
  if (left.virginBars !== right.virginBars) return left.virginBars - right.virginBars;
  if (left.totalBins !== right.totalBins) return left.totalBins - right.totalBins;
  if (left.sourceLen !== right.sourceLen) return left.sourceLen - right.sourceLen;
  return right.scrapBars - left.scrapBars;
}

function compareForcedCandidates(left, right) {
  if (left.scrapBars !== right.scrapBars) return right.scrapBars - left.scrapBars;
  return compareGlobalCandidates(left, right);
}

function candidateEfficiency(candidate) {
  return candidate.sourceLen > 0 ? candidate.usefulLen / candidate.sourceLen : 0;
}

function exportCandidate(candidate) {
  return {
    plans: candidate.plans,
    efficiency: candidateEfficiency(candidate),
    waste: candidate.waste,
    virginBars: candidate.virginBars,
    scrapBars: candidate.scrapBars,
    totalBins: candidate.totalBins
  };
}

function coversExpectedPieces(plans, expectedPieceIds) {
  const actual = (plans || [])
    .flatMap(plan => plan.pcs || [])
    .map(pieceIdentity)
    .sort();
  return actual.length === expectedPieceIds.length
    && actual.every((id, index) => id === expectedPieceIds[index]);
}

function pieceIdentity(piece) {
  return String(piece?.pieceId || `${piece?.op || ''}|${piece?.sku || ''}|${piece?.dim || 0}`);
}

function validateFullPlanResources(plans, skus) {
  return skus.every(sku => {
    const skuPlans = (plans || []).filter(plan => plan.sku === sku.code);
    const expectedIds = (sku.pieces || []).map(pieceIdentity).sort();
    const scraps = (sku.scraps || []).map(scrap => ({ id: scrap.id, len: Number(scrap.medida) || 0 }));
    const virginTypes = (sku.virginBars || []).map(bar => ({ dim: Number(bar.dim) || 0, qty: Math.max(0, Math.floor(Number(bar.qty) || 0)) }));
    return coversExpectedPieces(skuPlans, expectedIds)
      && validateSkuPlanResources(skuPlans, scraps, virginTypes);
  });
}

function validateSkuPlanResources(plans, scraps, virginTypes) {
  const validScrapIds = new Set(scraps.map(scrap => String(scrap.id)));
  const usedScraps = new Set();
  const virginUsage = new Map();

  for (const plan of plans || []) {
    if (plan.type === 'scrap') {
      const id = String(plan.srcId || '');
      if (!validScrapIds.has(id) || usedScraps.has(id)) return false;
      usedScraps.add(id);
    } else if (plan.type === 'virgin') {
      const dim = Number(String(plan.srcId || '').split('|').pop()) || Math.round(Number(plan.len || 0) + 50);
      virginUsage.set(dim, (virginUsage.get(dim) || 0) + 1);
    }
  }

  return [...virginUsage.entries()].every(([dim, count]) => {
    const type = virginTypes.find(bar => Number(bar.dim) === Number(dim));
    return !!type && count <= Number(type.qty || 0);
  });
}

function postSolverProgress(stats, sku, frontierSize, force) {
  const now = Date.now();
  if (!force && now - stats.lastProgressAt < 250) return;
  stats.lastProgressAt = now;
  self.postMessage({
    type: 'progress',
    progress: {
      sku,
      explored: stats.explored,
      frontierSize,
      elapsedMs: now - stats.startedAt,
      completedSkus: stats.completedSkus,
      totalSkus: stats.totalSkus
    }
  });
}
