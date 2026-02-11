/**
 * 种植策略计算模块
 * 根据用户等级和植物配置，计算最优种植方案
 */

const fs = require('fs');
const path = require('path');

const FERTILIZER_SPEED_SECONDS = 30;
const OPERATION_TIME = 15;

let plantConfig = null;

function loadPlantConfig() {
  if (plantConfig) return plantConfig;
  const configPath = path.join(__dirname, '..', 'gameConfig', 'Plant.json');
  plantConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return plantConfig;
}

function parseGrowTime(growPhases) {
  if (!growPhases) return 0;
  const phases = growPhases.split(';').filter(p => p.length > 0);
  let total = 0;
  for (const phase of phases) {
    const match = phase.match(/:(\d+)$/);
    if (match) total += parseInt(match[1]);
  }
  return total;
}

/**
 * 计算所有可购买作物的种植效率
 * @param {number} userLevel - 用户当前等级
 * @param {Array} shopGoodsList - 商店种子列表（可选，来自实时商店API缓存）
 * @param {string} strategy - 策略: 'fast'(exp/hour) | 'advanced'(单次经验)
 * @returns {object} { currentLevel, recommended, options, strategy }
 */
function calculatePlantPlan(userLevel, shopGoodsList, strategy = 'fast') {
  const plants = loadPlantConfig();

  // 筛选正常植物（id 以 102 开头的是正常版本）
  const normalPlants = plants.filter(p => String(p.id).startsWith('102'));

  const options = [];

  for (const plant of normalPlants) {
    const growTime = parseGrowTime(plant.grow_phases);
    if (growTime <= 0) continue;

    // 如果有商店数据，检查是否可购买
    if (shopGoodsList && shopGoodsList.length > 0) {
      const inShop = shopGoodsList.find(g => g.seedId === plant.seed_id);
      if (!inShop) continue;
    } else {
      // 没有商店数据时，根据 land_level_need 粗略过滤
      if (plant.land_level_need > userLevel) continue;
    }

    const expPerHarvest = (plant.exp || 0) + 1; // 收获经验 + 铲除经验
    const growTimeWithFert = Math.max(growTime - FERTILIZER_SPEED_SECONDS, 1);
    const cycleTime = growTimeWithFert + OPERATION_TIME;
    const expPerHour = Math.round((expPerHarvest / cycleTime) * 3600 * 100) / 100;

    options.push({
      seedId: plant.seed_id,
      name: plant.name,
      growTime,
      growTimeWithFert,
      expPerHarvest,
      expPerHour,
      rank: 0,
    });
  }

  // 根据策略排序
  if (strategy === 'advanced') {
    options.sort((a, b) => {
      if (a.expPerHarvest !== b.expPerHarvest) return b.expPerHarvest - a.expPerHarvest;
      return b.expPerHour - a.expPerHour;
    });
  } else {
    options.sort((a, b) => b.expPerHour - a.expPerHour);
  }

  // 设置排名
  options.forEach((opt, i) => { opt.rank = i + 1; });

  return {
    currentLevel: userLevel,
    recommended: options.length > 0 ? options[0] : null,
    options,
    strategy,
  };
}

module.exports = { calculatePlantPlan, loadPlantConfig };
