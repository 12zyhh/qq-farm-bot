/**
 * 分析24小时内能获得的最大经验
 * 
 * 配置:
 * - 普通肥料加速 30 秒
 * - 肥料总量: 900 小时
 * - 土地数量: 15 块
 * - 时间限制: 24 小时
 * - 等级限制: 可配置
 */

const fs = require('fs');
const path = require('path');

// 配置
const FERTILIZER_SPEED_SECONDS = 30;  // 普通肥料加速30秒
const TOTAL_FERTILIZER_HOURS = 900;   // 900小时肥料
const TOTAL_FERTILIZER_SECONDS = TOTAL_FERTILIZER_HOURS * 3600;
const LAND_COUNT = 15;  // 15块地
const TIME_LIMIT_HOURS = 24;  // 24小时限制
const TIME_LIMIT_SECONDS = TIME_LIMIT_HOURS * 3600;
const OPERATION_TIME = 15;  // 每轮操作时间（收获+铲除+购买+种植+施肥）
const USER_LEVEL = 24;  // 用户等级

// 种子等级要求映射 (根据商店配置，seed_id -> 等级要求)
// 基于游戏常见设定，等级越高的作物经验越多
const SEED_LEVEL_MAP = {
    20001: 1,   // 白萝卜
    20002: 1,   // 胡萝卜
    20003: 5,   // 大白菜
    20004: 8,   // 玉米
    20005: 10,  // 土豆
    20006: 12,  // 茄子
    20007: 14,  // 番茄
    20008: 16,  // 辣椒
    20009: 18,  // 南瓜
    20010: 20,  // 西瓜
    20011: 22,  // 草莓
    20012: 24,  // 葡萄
    20013: 26,  // 樱桃
    20014: 28,  // 苹果
    20015: 30,  // 香蕉
    20016: 32,  // 菠萝蜜
    // 更多作物...
};

// 读取植物配置
const plantPath = path.join(__dirname, '..', 'gameConfig', 'Plant.json');
const plants = JSON.parse(fs.readFileSync(plantPath, 'utf8'));

// 解析生长阶段时间
function parseGrowTime(growPhases) {
    if (!growPhases) return 0;
    const phases = growPhases.split(';').filter(p => p.length > 0);
    let totalTime = 0;
    for (const phase of phases) {
        const match = phase.match(/:(\d+)$/);
        if (match) {
            totalTime += parseInt(match[1]);
        }
    }
    return totalTime;
}

// 格式化时间
function formatTime(seconds) {
    if (seconds <= 0) return '瞬间';
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours < 24) return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}天${remainHours}小时`;
}

// 筛选普通作物
const normalPlants = plants.filter(p => {
    const idStr = String(p.id);
    return idStr.startsWith('102') && p.seed_id && p.seed_id >= 20000 && p.seed_id < 30000;
});

// 获取种子等级要求
function getSeedLevelReq(seedId) {
    if (SEED_LEVEL_MAP[seedId]) return SEED_LEVEL_MAP[seedId];
    // 默认按seed_id推算等级 (20001=1级, 20002=1级, 20003=5级...)
    const idx = seedId - 20001;
    if (idx <= 1) return 1;
    return Math.min(1 + Math.floor(idx * 2), 100);
}

// 计算每种作物在24小时内的经验
const results = [];

for (const plant of normalPlants) {
    const originalGrowTime = parseGrowTime(plant.grow_phases);
    if (originalGrowTime <= 0) continue;
    
    const levelReq = getSeedLevelReq(plant.seed_id);
    const canPlant = USER_LEVEL >= levelReq;
    
    const harvestExp = plant.exp || 0;
    const removeExp = 1;
    const totalExpPerHarvest = harvestExp + removeExp;
    
    // === 方案A: 施肥 ===
    const growTimeWithFert = Math.max(originalGrowTime - FERTILIZER_SPEED_SECONDS, 1);
    const cycleTimeWithFert = growTimeWithFert + OPERATION_TIME;
    const cyclesIn24hWithFert = Math.floor(TIME_LIMIT_SECONDS / cycleTimeWithFert);
    const totalExpWithFert = cyclesIn24hWithFert * totalExpPerHarvest * LAND_COUNT;
    const fertilizerUsedSeconds = cyclesIn24hWithFert * FERTILIZER_SPEED_SECONDS * LAND_COUNT;
    const fertilizerUsedHours = fertilizerUsedSeconds / 3600;
    const fertilizerEnough = fertilizerUsedSeconds <= TOTAL_FERTILIZER_SECONDS;
    
    // === 方案B: 不施肥 ===
    const cycleTimeNoFert = originalGrowTime + OPERATION_TIME;
    const cyclesIn24hNoFert = Math.floor(TIME_LIMIT_SECONDS / cycleTimeNoFert);
    const totalExpNoFert = cyclesIn24hNoFert * totalExpPerHarvest * LAND_COUNT;
    
    results.push({
        seedId: plant.seed_id,
        name: plant.name,
        levelReq,
        canPlant,
        originalGrowTime,
        growTimeWithFert,
        totalExpPerHarvest,
        // 施肥方案
        cycleTimeWithFert,
        cyclesIn24hWithFert,
        totalExpWithFert,
        fertilizerUsedHours,
        fertilizerEnough,
        // 不施肥方案
        cycleTimeNoFert,
        cyclesIn24hNoFert,
        totalExpNoFert,
    });
}

// 按施肥后24小时总经验排序
results.sort((a, b) => b.totalExpWithFert - a.totalExpWithFert);

console.log('=============================================');
console.log('   24小时内最大经验分析 (15块地)');
console.log('=============================================');
console.log('');
console.log('配置:');
console.log(`  - 用户等级: ${USER_LEVEL} 级`);
console.log(`  - 时间限制: ${TIME_LIMIT_HOURS} 小时`);
console.log(`  - 土地数量: ${LAND_COUNT} 块`);
console.log(`  - 普通肥料加速: ${FERTILIZER_SPEED_SECONDS} 秒`);
console.log(`  - 肥料总量: ${TOTAL_FERTILIZER_HOURS} 小时`);
console.log(`  - 每轮操作时间: ${OPERATION_TIME} 秒`);
console.log('');

// 只显示能种的作物
const availablePlants = results.filter(r => r.canPlant);
console.log(`可种植作物数量: ${availablePlants.length} 种 (等级限制过滤后)`);
console.log('');

// 按不施肥24小时总经验排序（因为对长周期作物，肥料效果微乎其微）
availablePlants.sort((a, b) => b.totalExpNoFert - a.totalExpNoFert);

// Top 15 不施肥方案（更实际）
console.log('【Top 15 不施肥方案 - 24小时总经验】');
console.log('（只显示你能种的作物）');
console.log('');
console.log('排名 | 作物     | 等级 | 成熟时间   | 每轮     | 24h轮数 | 24h总经验 | 每轮经验');
console.log('-----|----------|-----|----------|---------|--------|----------|--------');

for (let i = 0; i < Math.min(15, availablePlants.length); i++) {
    const r = availablePlants[i];
    console.log(
        `${String(i + 1).padStart(4)} | ${r.name.padEnd(8)} | ${String(r.levelReq).padStart(3)} | ${formatTime(r.originalGrowTime).padEnd(8)} | ${formatTime(r.cycleTimeNoFert).padEnd(7)} | ${String(r.cyclesIn24hNoFert).padStart(6)} | ${String(r.totalExpNoFert).padStart(8)} | ${String(r.totalExpPerHarvest * LAND_COUNT).padStart(6)}`
    );
}

console.log('');
console.log('=============================================');
console.log('');

// 短周期作物 + 肥料分析（肥料对短周期作物效果显著）
console.log('【短周期作物 + 肥料分析】');
console.log('（肥料加速30秒，对短周期作物效果显著）');
console.log('');

const shortCyclePlants = availablePlants.filter(r => r.originalGrowTime <= 300); // 5分钟以内
shortCyclePlants.sort((a, b) => b.totalExpWithFert - a.totalExpWithFert);

console.log('排名 | 作物     | 等级 | 原时间  | 施肥后  | 每轮   | 24h轮数 | 24h总经验 | 消耗肥料');
console.log('-----|----------|-----|--------|--------|-------|--------|----------|--------');

for (let i = 0; i < Math.min(10, shortCyclePlants.length); i++) {
    const r = shortCyclePlants[i];
    console.log(
        `${String(i + 1).padStart(4)} | ${r.name.padEnd(8)} | ${String(r.levelReq).padStart(3)} | ${formatTime(r.originalGrowTime).padEnd(6)} | ${formatTime(r.growTimeWithFert).padEnd(6)} | ${formatTime(r.cycleTimeWithFert).padEnd(5)} | ${String(r.cyclesIn24hWithFert).padStart(6)} | ${String(r.totalExpWithFert).padStart(8)} | ${r.fertilizerUsedHours.toFixed(0)}h`
    );
}

console.log('');
console.log('=============================================');
console.log('');

// 最优方案对比
console.log('【最优方案对比 - 24小时】');
console.log('');

const bestNoFert = availablePlants[0];  // 不施肥最佳（已按不施肥排序）
const bestShortWithFert = shortCyclePlants[0];  // 短周期+施肥最佳

console.log('方案A: 不施肥最佳 (适合挂机)');
console.log(`   作物: ${bestNoFert.name}`);
console.log(`   成熟时间: ${formatTime(bestNoFert.originalGrowTime)}`);
console.log(`   24小时轮数: ${bestNoFert.cyclesIn24hNoFert} 轮`);
console.log(`   24小时总经验: ${bestNoFert.totalExpNoFert}`);
console.log(`   消耗肥料: 0`);
console.log('');

if (bestShortWithFert) {
    console.log('方案B: 短周期+施肥 (需要频繁操作)');
    console.log(`   作物: ${bestShortWithFert.name}`);
    console.log(`   原成熟时间: ${formatTime(bestShortWithFert.originalGrowTime)} → 施肥后: ${formatTime(bestShortWithFert.growTimeWithFert)}`);
    console.log(`   24小时轮数: ${bestShortWithFert.cyclesIn24hWithFert} 轮`);
    console.log(`   24小时总经验: ${bestShortWithFert.totalExpWithFert}`);
    console.log(`   消耗肥料: ${bestShortWithFert.fertilizerUsedHours.toFixed(1)} 小时`);
    console.log('');
    
    const expDiff = bestShortWithFert.totalExpWithFert - bestNoFert.totalExpNoFert;
    if (expDiff > 0) {
        const expDiffPercent = (expDiff / bestNoFert.totalExpNoFert * 100).toFixed(1);
        console.log(`📊 方案B比方案A多 ${expDiff} 经验 (+${expDiffPercent}%)`);
    } else {
        console.log(`📊 方案A更优，多 ${-expDiff} 经验`);
    }
}

console.log('');
console.log('=============================================');
console.log('');
console.log('【结论】');
console.log('');
if (bestShortWithFert && bestShortWithFert.totalExpWithFert > bestNoFert.totalExpNoFert) {
    console.log(`🏆 24小时内最快升级: ${bestShortWithFert.name} + 施肥`);
    console.log(`   可获得 ${bestShortWithFert.totalExpWithFert} 经验`);
    console.log(`   消耗 ${bestShortWithFert.fertilizerUsedHours.toFixed(1)} 小时肥料`);
    console.log(`   需要每 ${formatTime(bestShortWithFert.cycleTimeWithFert)} 操作一次`);
} else {
    console.log(`🏆 24小时内最快升级: ${bestNoFert.name}`);
    console.log(`   可获得 ${bestNoFert.totalExpNoFert} 经验`);
    console.log(`   每 ${formatTime(bestNoFert.cycleTimeNoFert)} 操作一次`);
}
console.log('');
console.log('=============================================');
