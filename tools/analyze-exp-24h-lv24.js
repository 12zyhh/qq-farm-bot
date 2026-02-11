/**
 * 24级玩家24小时最大经验分析
 * 
 * 可购买种子：白萝卜 ~ 豌豆 (seed_id: 20001 ~ 20008)
 */

const fs = require('fs');
const path = require('path');

// 配置
const FERTILIZER_SPEED_SECONDS = 30;  // 普通肥料加速30秒
const LAND_COUNT = 15;  // 15块地
const TIME_LIMIT_HOURS = 24;
const TIME_LIMIT_SECONDS = TIME_LIMIT_HOURS * 3600;
const OPERATION_TIME = 15;  // 每轮操作时间

// 可购买的种子范围 (24级: 白萝卜到豌豆)
const MIN_SEED_ID = 20001;
const MAX_SEED_ID = 20008;

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
        if (match) totalTime += parseInt(match[1]);
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
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

// 筛选可购买的作物
const availablePlants = plants.filter(p => {
    const idStr = String(p.id);
    return idStr.startsWith('102') && 
           p.seed_id >= MIN_SEED_ID && 
           p.seed_id <= MAX_SEED_ID;
});

console.log('=============================================');
console.log('   24级玩家 - 24小时最大经验分析');
console.log('=============================================');
console.log('');
console.log('配置:');
console.log(`  - 可购买种子: 白萝卜(20001) ~ 豌豆(20008)`);
console.log(`  - 土地数量: ${LAND_COUNT} 块`);
console.log(`  - 时间限制: ${TIME_LIMIT_HOURS} 小时`);
console.log(`  - 肥料加速: ${FERTILIZER_SPEED_SECONDS} 秒`);
console.log(`  - 每轮操作: ${OPERATION_TIME} 秒`);
console.log('');

// 计算每种作物的数据
const results = [];

for (const plant of availablePlants) {
    const growTime = parseGrowTime(plant.grow_phases);
    if (growTime <= 0) continue;
    
    const expPerHarvest = (plant.exp || 0) + 1;  // 收获经验 + 铲除经验
    
    // 不施肥
    const cycleNoFert = growTime + OPERATION_TIME;
    const cyclesNoFert = Math.floor(TIME_LIMIT_SECONDS / cycleNoFert);
    const totalExpNoFert = cyclesNoFert * expPerHarvest * LAND_COUNT;
    
    // 施肥
    const growTimeFert = Math.max(growTime - FERTILIZER_SPEED_SECONDS, 1);
    const cycleFert = growTimeFert + OPERATION_TIME;
    const cyclesFert = Math.floor(TIME_LIMIT_SECONDS / cycleFert);
    const totalExpFert = cyclesFert * expPerHarvest * LAND_COUNT;
    const fertUsedHours = (cyclesFert * FERTILIZER_SPEED_SECONDS * LAND_COUNT) / 3600;
    
    results.push({
        seedId: plant.seed_id,
        name: plant.name,
        growTime,
        expPerHarvest,
        // 不施肥
        cycleNoFert,
        cyclesNoFert,
        totalExpNoFert,
        // 施肥
        growTimeFert,
        cycleFert,
        cyclesFert,
        totalExpFert,
        fertUsedHours,
    });
}

// 按施肥后24小时经验排序
results.sort((a, b) => b.totalExpFert - a.totalExpFert);

console.log('【完整作物列表 - 按24h经验排序】');
console.log('');
console.log('作物     | 成熟时间  | 单次经验 | 不施肥           | 施肥后');
console.log('         |          |         | 周期/轮数/24h经验 | 周期/轮数/24h经验/消耗肥料');
console.log('---------|----------|---------|------------------|-------------------------');

for (const r of results) {
    console.log(
        `${r.name.padEnd(8)} | ${formatTime(r.growTime).padEnd(8)} | ${String(r.expPerHarvest).padStart(7)} | ` +
        `${formatTime(r.cycleNoFert).padEnd(5)}/${String(r.cyclesNoFert).padStart(4)}轮/${String(r.totalExpNoFert).padStart(5)} | ` +
        `${formatTime(r.cycleFert).padEnd(5)}/${String(r.cyclesFert).padStart(4)}轮/${String(r.totalExpFert).padStart(5)}/${r.fertUsedHours.toFixed(0).padStart(3)}h`
    );
}

console.log('');
console.log('=============================================');
console.log('');

// 最优方案
const bestFert = results[0];
const bestNoFert = [...results].sort((a, b) => b.totalExpNoFert - a.totalExpNoFert)[0];

console.log('【最优方案】');
console.log('');
console.log(`🥇 施肥最佳: ${bestFert.name}`);
console.log(`   成熟时间: ${formatTime(bestFert.growTime)} → 施肥后 ${formatTime(bestFert.growTimeFert)}`);
console.log(`   每轮周期: ${formatTime(bestFert.cycleFert)}`);
console.log(`   24小时轮数: ${bestFert.cyclesFert} 轮`);
console.log(`   24小时经验: ${bestFert.totalExpFert}`);
console.log(`   消耗肥料: ${bestFert.fertUsedHours.toFixed(1)} 小时`);
console.log('');

console.log(`🥈 不施肥最佳: ${bestNoFert.name}`);
console.log(`   成熟时间: ${formatTime(bestNoFert.growTime)}`);
console.log(`   每轮周期: ${formatTime(bestNoFert.cycleNoFert)}`);
console.log(`   24小时轮数: ${bestNoFert.cyclesNoFert} 轮`);
console.log(`   24小时经验: ${bestNoFert.totalExpNoFert}`);
console.log('');

const diff = bestFert.totalExpFert - bestNoFert.totalExpNoFert;
const diffPercent = (diff / bestNoFert.totalExpNoFert * 100).toFixed(1);
console.log(`📊 施肥比不施肥多 ${diff} 经验 (+${diffPercent}%)`);
console.log('');
console.log('=============================================');
console.log('');
console.log('【结论】');
console.log('');
console.log(`24小时内最快升级选择: ${bestFert.name} + 施肥`);
console.log(`可获得 ${bestFert.totalExpFert} 经验，需要每 ${formatTime(bestFert.cycleFert)} 操作一次`);
console.log('');
