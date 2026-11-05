// ============================================================
// KPI CALCULATION ENGINE
// PT. ALBANNA DIGITAL SULAIMAN YOGYAKARTA
// ============================================================

const KPICalc = {

  /**
   * ABSENSI
   * threshold = 5 hari
   * Above threshold: -(achieve - threshold) * pointPerUnit
   * Below/equal threshold: pointTotal - (achieve * pointPerUnit)
   */
  calcAbsensi(achieve, pointTotal, pointPerUnit, threshold = 5) {
    achieve = Number(achieve) || 0;
    pointTotal = Number(pointTotal) || 0;
    pointPerUnit = Number(pointPerUnit) || 0;

    if (achieve > threshold) {
      return -((achieve - threshold) * pointPerUnit);
    } else {
      return pointTotal - (achieve * pointPerUnit);
    }
  },

  /**
   * KETERLAMBATAN
   * threshold = 5 jam
   * pointPerUnit = pointTotal / 178
   */
  calcKeterlambatan(achieve, pointTotal) {
    achieve = Number(achieve) || 0;
    pointTotal = Number(pointTotal) || 0;
    const ppu = pointTotal / 178;
    return this.calcAbsensi(achieve, pointTotal, ppu, 5);
  },

  /**
   * CAQ (Customer Acquisition Quality)
   * achieve = jumlah komplain/CAQ (angka aktual)
   * tracehold = batas atas CAQ
   * targetMinimal = target minimal CAQ
   * pointTotal = total poin untuk indikator ini
   * handleProduk = jumlah produk yang di-handle
   *
   * Formula (D=pointTotal, E=tracehold, F=targetMinimal, G=handleProduk, H=achieve):
   * Case 1: achieve = 0 → 0
   * Case 2: achieve < targetMinimal → bonus: (D/G) + ((targetMinimal - achieve) * D/G)
   * Case 3: targetMinimal ≤ achieve ≤ tracehold → linear: D/G - (D/(E-F) * (H-F)) / G
   * Case 4: achieve = tracehold → 0
   * Case 5: achieve > tracehold → penalty: -(D * achieve) / G
   */
  calcCAQ(achieve, tracehold, targetMinimal, pointTotal, handleProduk) {
    achieve = Number(achieve) || 0;
    tracehold = Number(tracehold) || 0;
    targetMinimal = Number(targetMinimal) || 0;
    pointTotal = Number(pointTotal) || 0;
    handleProduk = Number(handleProduk) || 1;

    const D = pointTotal;
    const E = tracehold;
    const F = targetMinimal;
    const G = handleProduk;
    const H = achieve;

    if (H === 0) {
      return 0;
    } else if (H < F) {
      // Bonus: below target minimal is actually good (less CAQ = fewer complaints)
      return (D / G) + ((F - H) * (D / G));
    } else if (H <= E) {
      // Linear degradation from targetMinimal to tracehold
      if (E === F) return D / G;
      return (D / G) - ((D / (E - F)) * (H - F)) / G;
    } else if (H === E) {
      return 0;
    } else {
      // Above tracehold: penalty
      return -((D * H) / G);
    }
  },

  /**
   * BOTOL (Volume sales in units/bottles)
   * achieve / target * pointTotal
   */
  calcBotol(achieve, target, pointTotal) {
    achieve = Number(achieve) || 0;
    target = Number(target) || 1;
    pointTotal = Number(pointTotal) || 0;
    if (target === 0) return 0;
    return (achieve / target) * pointTotal;
  },

  /**
   * CLOSING (Paket terjual)
   * achieve * (pointTotal / target)
   */
  calcClosing(achieve, target, pointTotal) {
    achieve = Number(achieve) || 0;
    target = Number(target) || 1;
    pointTotal = Number(pointTotal) || 0;
    if (target === 0) return 0;
    return achieve * (pointTotal / target);
  },

  /**
   * LINEAR (Agenda kegiatan, Karakter atasan)
   * (achieve / target) * pointTotal
   */
  calcLinear(achieve, target, pointTotal) {
    achieve = Number(achieve) || 0;
    target = Number(target) || 1;
    pointTotal = Number(pointTotal) || 0;
    if (target === 0) return 0;
    return (achieve / target) * pointTotal;
  },

  /**
   * CHALLENGE (tiered)
   * 0 → 0
   * 1 → pointTotal
   * 2 → pointTotal * 1.5
   * 3+ → pointTotal * 1.8
   */
  calcChallenge(count, pointTotal) {
    count = Number(count) || 0;
    pointTotal = Number(pointTotal) || 0;
    if (count <= 0) return 0;
    if (count === 1) return pointTotal;
    if (count === 2) return pointTotal * 1.5;
    return pointTotal * 1.8;
  },

  /**
   * SOP (Standard Operating Procedure)
   * achieve > threshold (default 0.70) → achieve * pointTotal
   * else → 0
   * achieve is 0-1 decimal (percentage as decimal)
   */
  calcSOP(achieve, pointTotal, threshold = 0.70) {
    achieve = Number(achieve) || 0;
    pointTotal = Number(pointTotal) || 0;
    threshold = Number(threshold) || 0.70;
    if (achieve > threshold) {
      return achieve * pointTotal;
    }
    return 0;
  },

  /**
   * COPYRIGHT (Pelanggaran hak cipta)
   * count * penaltyPerUnit (penalty is negative number)
   */
  calcCopyright(count, penaltyPerUnit) {
    count = Number(count) || 0;
    penaltyPerUnit = Number(penaltyPerUnit) || 0;
    // penaltyPerUnit should be negative, stored as positive in config
    return count * (-Math.abs(penaltyPerUnit));
  },

  /**
   * RETUR per product
   * threshold = min(salesTarget, salesAchieve) * 0.05
   * pointPerUnit (E) = -(pointPool / threshold)
   * retur = 0 → 0
   * retur ≤ threshold → (pointPool + retur * E) / numProducts
   * retur > threshold → (retur - threshold) * E
   */
  calcRetur(achieve, salesAchieve, salesTarget, pointPool, numProducts) {
    achieve = Number(achieve) || 0;
    salesAchieve = Number(salesAchieve) || 0;
    salesTarget = Number(salesTarget) || 0;
    pointPool = Number(pointPool) || 0;
    numProducts = Number(numProducts) || 1;

    if (achieve === 0) return 0;

    const threshold = Math.min(salesTarget, salesAchieve) * 0.05;
    if (threshold === 0) return -(achieve * pointPool);

    const E = -(pointPool / threshold); // negative per unit

    if (achieve <= threshold) {
      return (pointPool + achieve * E) / numProducts;
    } else {
      return (achieve - threshold) * E;
    }
  },

  /**
   * BONUS RETUR
   * If total retur semua produk = 0, bonus = bobot * totalMax
   */
  calcReturBonus(totalRetur, bobot, totalPointMax) {
    totalRetur = Number(totalRetur) || 0;
    bobot = Number(bobot) || 0;
    totalPointMax = Number(totalPointMax) || 0;
    if (totalRetur === 0) {
      return bobot * totalPointMax;
    }
    return 0;
  },

  /**
   * MAIN CALCULATE: calculate poin for an indicator given its type and input
   * @param {Object} indicator - from kpi_indicators
   * @param {*} achieve - input value
   * @param {Object} context - extra data (products, sales achieve, etc.)
   * @returns {number} poin
   */
  calculate(indicator, achieve, context = {}) {
    const type = indicator.type;
    const cfg = indicator.config || {};
    const pt = Number(indicator.point_total) || 0;

    switch (type) {
      case 'absensi': {
        const ppu = Number(cfg.point_per_unit) || (pt / 30);
        return this.calcAbsensi(achieve, pt, ppu, 5);
      }
      case 'keterlambatan': {
        return this.calcKeterlambatan(achieve, pt);
      }
      case 'caq': {
        const { tracehold, targetMinimal, handleProduk } = context;
        return this.calcCAQ(achieve, tracehold, targetMinimal, pt, handleProduk || 1);
      }
      case 'botol': {
        const target = Number(context.target) || Number(cfg.target) || 1;
        return this.calcBotol(achieve, target, pt);
      }
      case 'closing': {
        const target = Number(context.target) || Number(cfg.target) || 1;
        return this.calcClosing(achieve, target, pt);
      }
      case 'linear': {
        const target = Number(context.target) || Number(cfg.target) || 100;
        return this.calcLinear(achieve, target, pt);
      }
      case 'challenge': {
        return this.calcChallenge(achieve, pt);
      }
      case 'sop': {
        const threshold = Number(cfg.threshold) || 0.70;
        return this.calcSOP(achieve, pt, threshold);
      }
      case 'copyright_video':
      case 'copyright_lp':
      case 'copyright_gambar': {
        const ppu = Number(cfg.penalty_per_unit) || 0;
        return this.calcCopyright(achieve, ppu);
      }
      case 'retur': {
        const { salesAchieve, salesTarget, numProducts, pointPool } = context;
        return this.calcRetur(achieve, salesAchieve, salesTarget, pointPool || pt, numProducts || 1);
      }
      case 'retur_bonus': {
        const { totalRetur, bobot, totalPointMax } = context;
        return this.calcReturBonus(totalRetur, bobot || indicator.bobot, totalPointMax);
      }
      default:
        return 0;
    }
  },

  /**
   * Get pengkali (multiplier) based on total poin
   */
  async getPengkali(totalPoin) {
    try {
      const data = await sbGet('pengkali_rules', `?select=*&min_poin=lte.${totalPoin}&max_poin=gte.${totalPoin}&limit=1`, getToken());
      if (!data || data.length === 0) return { multiplier: 1, label: 'Tidak Ada' };
      return data[0];
    } catch {
      return { multiplier: 1, label: 'Tidak Ada' };
    }
  },

  /**
   * Get grade label based on total poin
   */
  getGrade(totalPoin, pengkaliRules) {
    if (!pengkaliRules) return 'N/A';
    const rule = pengkaliRules.find(r =>
      totalPoin >= r.min_poin && totalPoin <= r.max_poin
    );
    return rule ? rule.label : 'N/A';
  }
};
