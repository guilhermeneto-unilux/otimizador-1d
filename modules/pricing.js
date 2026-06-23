/* ===== PRECIFICAÇÃO DE PERFIS E INDICADORES FINANCEIROS ===== */

function _pricingNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function _pricingCode(value) {
  return String(value || '').trim().toLowerCase();
}

function _pricingSettingsForSku(code) {
  const skus = appState.comprasConfig && appState.comprasConfig.skus;
  if (!skus || typeof skus !== 'object') return null;
  if (skus[code]) return skus[code];
  const normalized = _pricingCode(code);
  const key = Object.keys(skus).find(candidate => _pricingCode(candidate) === normalized);
  return key ? skus[key] : null;
}

function _pricingSnapshotValue(snapshot, code) {
  if (!snapshot || typeof snapshot !== 'object') return 0;
  const normalized = _pricingCode(code);
  const key = Object.keys(snapshot).find(candidate => _pricingCode(candidate) === normalized);
  const raw = key ? snapshot[key] : null;
  return Math.max(0, _pricingNumber(raw && typeof raw === 'object' ? raw.pricePerMeter : raw, 0));
}

function _pricingSnapshotHasCode(snapshot, code) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const normalized = _pricingCode(code);
  return Object.keys(snapshot).some(candidate => _pricingCode(candidate) === normalized);
}

function _pricingSnapshotMinScrap(snapshot, code) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const normalized = _pricingCode(code);
  const key = Object.keys(snapshot).find(candidate => _pricingCode(candidate) === normalized);
  const raw = key ? snapshot[key] : null;
  if (!raw || typeof raw !== 'object' || raw.minScrap === undefined) return null;
  return Math.max(0, _pricingNumber(raw.minScrap, 0));
}

function skuPricePerMeter(code, snapshot = null) {
  if (_pricingSnapshotHasCode(snapshot, code)) return _pricingSnapshotValue(snapshot, code);
  const settings = _pricingSettingsForSku(code);
  return Math.max(0, _pricingNumber(settings?.pricePerMeter, 0));
}

function _setSkuPricePerMeter(code, price, source = null) {
  if (!appState.comprasConfig || typeof appState.comprasConfig !== 'object') {
    appState.comprasConfig = { global: {}, skus: {} };
  }
  if (!appState.comprasConfig.skus || typeof appState.comprasConfig.skus !== 'object') {
    appState.comprasConfig.skus = {};
  }
  const current = _pricingSettingsForSku(code) || {};
  const normalized = _pricingCode(code);
  const targetKey = Object.keys(appState.comprasConfig.skus).find(candidate => _pricingCode(candidate) === normalized) || code;
  appState.comprasConfig.skus[targetKey] = {
    ...current,
    pricePerMeter: Math.max(0, _pricingNumber(price, 0)),
    ...(source ? { priceSource: source } : {})
  };
}

function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.max(0, _pricingNumber(value, 0)));
}

function fmtBRLCompact(value) {
  const safe = Math.max(0, _pricingNumber(value, 0));
  if (safe >= 1000000) return `R$ ${(safe / 1000000).toFixed(2).replace('.', ',')} mi`;
  if (safe >= 1000) return `R$ ${(safe / 1000).toFixed(1).replace('.', ',')} mil`;
  return fmtBRL(safe);
}

function _priceForLength(code, millimeters, snapshot = null) {
  return Math.max(0, _pricingNumber(millimeters, 0)) / 1000 * skuPricePerMeter(code, snapshot);
}

function _pricingMinScrap(code) {
  const sku = (appState.skus || []).find(item => _pricingCode(item.code) === _pricingCode(code));
  return sku && sku.min_sobra !== undefined ? Math.max(0, _pricingNumber(sku.min_sobra, 1000)) : 1000;
}

function _capturePriceSnapshot(codes) {
  const capturedAt = new Date().toISOString();
  const snapshot = {};
  [...new Set((codes || []).filter(Boolean))].forEach(code => {
    const pricePerMeter = skuPricePerMeter(code);
    snapshot[code] = { pricePerMeter, minScrap: _pricingMinScrap(code), capturedAt };
  });
  return snapshot;
}

function _calculatePlanFinancials(plans, trimMm = 0, snapshot = null) {
  const result = {
    sourceValue: 0,
    piecesValue: 0,
    generatedScrapValue: 0,
    discardValue: 0,
    sourceMm: 0,
    piecesMm: 0,
    generatedScrapMm: 0,
    discardMm: 0,
    unpricedMm: 0,
    pricedSkuCount: 0,
    unpricedSkuCount: 0
  };
  const pricedSkus = new Set();
  const unpricedSkus = new Set();

  (plans || []).forEach(plan => {
    const code = plan.sku || '';
    const price = skuPricePerMeter(code, snapshot);
    const len = Math.max(0, _pricingNumber(plan.len, 0));
    const piecesMm = (plan.pcs || []).reduce((sum, piece) => sum + Math.max(0, _pricingNumber(piece.dim, 0)), 0);
    const rem = Math.max(0, _pricingNumber(plan.rem, 0));
    const snapshotMinScrap = _pricingSnapshotMinScrap(snapshot, code);
    const generatedScrapMm = rem >= (snapshotMinScrap === null ? _pricingMinScrap(code) : snapshotMinScrap) ? rem : 0;
    const discardRemainderMm = generatedScrapMm ? 0 : rem;
    const physicalTrimMm = Math.min(
      Math.max(0, _pricingNumber(trimMm, 0)),
      Math.max(0, len - piecesMm - rem)
    );
    const discardMm = discardRemainderMm + physicalTrimMm;

    result.sourceMm += len;
    result.piecesMm += piecesMm;
    result.generatedScrapMm += generatedScrapMm;
    result.discardMm += discardMm;

    if (price > 0) {
      pricedSkus.add(code);
      result.sourceValue += len / 1000 * price;
      result.piecesValue += piecesMm / 1000 * price;
      result.generatedScrapValue += generatedScrapMm / 1000 * price;
      result.discardValue += discardMm / 1000 * price;
    } else {
      unpricedSkus.add(code);
      result.unpricedMm += len;
    }
  });

  result.pricedSkuCount = pricedSkus.size;
  result.unpricedSkuCount = unpricedSkus.size;
  return result;
}

function _financialsForStoredPlan(plan, skuFilter = '') {
  if (!skuFilter && plan?.financials && typeof plan.financials === 'object') {
    return { ..._calculatePlanFinancials([], 0, null), ...plan.financials };
  }
  const bins = (plan?.mapa || []).filter(bin => !skuFilter || _pricingCode(bin.sku) === _pricingCode(skuFilter));
  const snapshot = plan?.priceSnapshot || plan?.price_snapshot || null;
  return _calculatePlanFinancials(bins, plan?.trim_mm || 0, snapshot);
}

function _aggregatePlanFinancials(plans, skuFilter = '') {
  const aggregate = {
    sourceValue: 0,
    piecesValue: 0,
    generatedScrapValue: 0,
    discardValue: 0,
    sourceMm: 0,
    piecesMm: 0,
    generatedScrapMm: 0,
    discardMm: 0,
    unpricedMm: 0,
    pricedSkuCount: 0,
    unpricedSkuCount: 0
  };
  const priced = new Set();
  const unpriced = new Set();

  (plans || []).forEach(plan => {
    const metrics = _financialsForStoredPlan(plan, skuFilter);
    Object.keys(aggregate).forEach(key => {
      if (key.endsWith('Count')) return;
      aggregate[key] += metrics[key] || 0;
    });
    (plan.mapa || []).forEach(bin => {
      if (skuFilter && _pricingCode(bin.sku) !== _pricingCode(skuFilter)) return;
      if (skuPricePerMeter(bin.sku, plan.priceSnapshot || plan.price_snapshot)) priced.add(bin.sku);
      else unpriced.add(bin.sku);
    });
  });
  aggregate.pricedSkuCount = priced.size;
  aggregate.unpricedSkuCount = unpriced.size;
  return aggregate;
}

function _currentInventoryFinancials(skuFilter = '') {
  const result = {
    virginValue: 0,
    scrapValue: 0,
    virginMm: 0,
    scrapMm: 0,
    unpricedVirginMm: 0,
    unpricedScrapMm: 0,
    unpricedSkuCount: 0
  };
  const unpriced = new Set();

  (appState.skus || []).forEach(sku => {
    if (skuFilter && _pricingCode(sku.code) !== _pricingCode(skuFilter)) return;
    const millimeters = (sku.dims || []).reduce((sum, dim) => (
      sum + Math.max(0, _pricingNumber(dim.dim, 0)) * Math.max(0, _pricingNumber(dim.qty, 0))
    ), 0);
    const price = skuPricePerMeter(sku.code);
    result.virginMm += millimeters;
    if (price > 0) result.virginValue += millimeters / 1000 * price;
    else if (millimeters > 0) {
      result.unpricedVirginMm += millimeters;
      unpriced.add(sku.code);
    }
  });

  (appState.sobras || []).forEach(scrap => {
    if (skuFilter && _pricingCode(scrap.sku) !== _pricingCode(skuFilter)) return;
    const millimeters = Math.max(0, _pricingNumber(scrap.medida, 0));
    const price = skuPricePerMeter(scrap.sku);
    result.scrapMm += millimeters;
    if (price > 0) result.scrapValue += millimeters / 1000 * price;
    else if (millimeters > 0) {
      result.unpricedScrapMm += millimeters;
      unpriced.add(scrap.sku);
    }
  });

  result.unpricedSkuCount = unpriced.size;
  return result;
}
