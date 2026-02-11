/**
 * 分析作物经验效率 - 考虑肥料加速
 * 
 * 假设：
 * - 普通肥料加速 60 秒
 * - 你有 900 小时 = 54000 分钟 = 3240000 秒 的肥料
 * - 每块地种植后施一次肥料
 * 
 * 经验来源：
 * 1. 收获经验 (exp)
 * 2. 铲除枯萎作物 (+1 经验)
 * 
 * 计算公式：
 * - 实际生长时间 = max(原生长时间 - 60, 0)
 * - 总经验 = 收获经验 + 1 (铲除)
 * - 经验效率 = 总经验 / 实际生长时间
 */

const fs = require('fs');
const path = require('path');

// 配置
const FERTILIZER_SPEED_SECONDS = 30;  // 普通肥料加速30秒
const TOTAL_FERTILIZER_HOURS = 900;   // 900小时肥料
const TOTAL_FERTILIZER_SECONDS = TOTAL_FERTILIZER_HOURS * 3600;  // 3240000秒
const LAND_COUNT = 15;  // 假设15块地

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
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours < 24) return `${hours}小时${mins}分`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}天${remainHours}小时`;
}

// 筛选普通作物
const normalPlants = plants.filter(p => {
    const idStr = String(p.id);
    return idStr.startsWith('102') && p.seed_id && p.seed_id >= 20000 && p.seed_id < 30000;
});

// 计算经验效率
const results = [];
for (const plant of normalPlants) {
    const originalGrowTime = parseGrowTime(plant.grow_phases);
    if (originalGrowTime <= 0) continue;
    
    // 施肥后的实际生长时间
    const actualGrowTime = Math.max(originalGrowTime - FERTILIZER_SPEED_SECONDS, 1);  // 至少1秒
    
    const harvestExp = plant.exp || 0;
    const removeExp = 1;
    const totalExp = harvestExp + removeExp;
    
    // 无肥料效率
    const expPerHourNoFert = (totalExp / originalGrowTime) * 3600;
    
    // 有肥料效率
    const expPerHourWithFert = (totalExp / actualGrowTime) * 3600;
    
    // 效率提升百分比
    const improvement = ((expPerHourWithFert - expPerHourNoFert) / expPerHourNoFert * 100);
    
    results.push({
        id: plant.id,
        seedId: plant.seed_id,
        name: plant.name,
        originalGrowTime,
        actualGrowTime,
        originalGrowTimeStr: formatTime(originalGrowTime),
        actualGrowTimeStr: formatTime(actualGrowTime),
        harvestExp,
        totalExp,
        expPerHourNoFert: expPerHourNoFert.toFixed(2),
        expPerHourWithFert: expPerHourWithFert.toFixed(2),
        improvement: improvement.toFixed(1),
    });
}

// 按有肥料的经验效率排序
results.sort((a, b) => parseFloat(b.expPerHourWithFert) - parseFloat(a.expPerHourWithFert));

console.log('========================================');
console.log('   作物经验效率分析 (考虑普通肥料加速)');
console.log('========================================');
console.log('');
console.log('配置:');
console.log(`  - 普通肥料加速: ${FERTILIZER_SPEED_SECONDS} 秒`);
console.log(`  - 肥料总量: ${TOTAL_FERTILIZER_HOURS} 小时`);
console.log(`  - 土地数量: ${LAND_COUNT} 块`);
console.log('');
console.log('========================================');
console.log('');

// Top 20
console.log('【Top 20 经验效率 (施肥后)】');
console.log('');
console.log('排名 | 作物     | 原时间    | 施肥后    | 总经验 | 原效率    | 施肥效率   | 提升');
console.log('-----|----------|----------|----------|--------|----------|----------|------');

for (let i = 0; i < Math.min(20, results.length); i++) {
    const r = results[i];
    console.log(
        `${String(i + 1).padStart(4)} | ${r.name.padEnd(8)} | ${r.originalGrowTimeStr.padEnd(8)} | ${r.actualGrowTimeStr.padEnd(8)} | ${String(r.totalExp).padStart(6)} | ${r.expPerHourNoFert.padStart(8)} | ${r.expPerHourWithFert.padStart(8)} | ${r.improvement.padStart(5)}%`
    );
}

console.log('');
console.log('========================================');
console.log('');

// 特别分析：短时间作物的优势
console.log('【关键发现】');
console.log('');

// 找出施肥后瞬间成熟或接近瞬间的作物
const instantPlants = results.filter(r => r.actualGrowTime <= 1);
const nearInstantPlants = results.filter(r => r.actualGrowTime > 1 && r.actualGrowTime <= 60);

if (instantPlants.length > 0) {
    console.log('施肥后瞬间成熟的作物:');
    for (const r of instantPlants) {
        console.log(`  - ${r.name}: 原${r.originalGrowTimeStr} → 施肥后瞬间, ${r.totalExp}经验/次`);
    }
    console.log('');
}

if (nearInstantPlants.length > 0) {
    console.log('施肥后1分钟内成熟的作物 (Top 5):');
    for (const r of nearInstantPlants.slice(0, 5)) {
        console.log(`  - ${r.name}: 原${r.originalGrowTimeStr} → 施肥后${r.actualGrowTimeStr}, ${r.expPerHourWithFert}经验/小时`);
    }
    console.log('');
}

console.log('========================================');
console.log('');

// 计算肥料能支撑多久
console.log('【肥料使用规划】');
console.log('');

// 白萝卜场景
const radish = results.find(r => r.seedId === 20002);
if (radish) {
    // 白萝卜原本60秒，施肥后30秒成熟
    // 每轮: 等待30秒 + 操作时间约10秒
    const cycleTime = 30 + 10;  // 秒
    const cyclesPerHour = 3600 / cycleTime;
    const expPerHour = cyclesPerHour * radish.totalExp;
    const fertilizerPerHour = cyclesPerHour * FERTILIZER_SPEED_SECONDS;  // 消耗的肥料秒数
    const totalHours = TOTAL_FERTILIZER_SECONDS / fertilizerPerHour;
    
    console.log(`白萝卜 + 肥料 (施肥后30秒成熟，每轮${cycleTime}秒):`);
    console.log(`  - 每小时循环次数: ${cyclesPerHour.toFixed(0)} 次`);
    console.log(`  - 每小时经验: ${expPerHour.toFixed(0)} (${radish.totalExp}经验 x ${cyclesPerHour.toFixed(0)}次)`);
    console.log(`  - 每小时消耗肥料: ${(fertilizerPerHour/3600).toFixed(1)} 小时`);
    console.log(`  - ${TOTAL_FERTILIZER_HOURS}小时肥料可用: ${totalHours.toFixed(1)} 小时`);
    console.log(`  - 总经验: ${(expPerHour * totalHours).toFixed(0)}`);
    console.log('');
}

// 更实际的场景：15块地同时种植
console.log(`实际场景 (${LAND_COUNT}块地同时种植):`);
console.log('');

// 白萝卜
if (radish) {
    // 15块地，施肥后30秒成熟，加上操作时间约15秒
    const growTime = 30;  // 施肥后成熟时间
    const operationTime = 15;  // 收获+铲除+购买+种植+施肥
    const cycleTime = growTime + operationTime;
    const cyclesPerHour = 3600 / cycleTime;
    const expPerCycle = radish.totalExp * LAND_COUNT;
    const expPerHour = cyclesPerHour * expPerCycle;
    const fertilizerPerCycle = FERTILIZER_SPEED_SECONDS * LAND_COUNT;  // 每轮消耗肥料
    const fertilizerPerHour = cyclesPerHour * fertilizerPerCycle;
    const totalHours = TOTAL_FERTILIZER_SECONDS / fertilizerPerHour;
    
    console.log(`方案1: 白萝卜+肥料 (施肥后${growTime}秒成熟，每轮${cycleTime}秒)`);
    console.log(`  - 每小时经验: ${expPerHour.toFixed(0)}`);
    console.log(`  - 每小时消耗肥料: ${(fertilizerPerHour/3600).toFixed(1)} 小时`);
    console.log(`  - 肥料可用时间: ${totalHours.toFixed(1)} 小时`);
    console.log(`  - 总经验: ${(expPerHour * totalHours).toFixed(0)}`);
    console.log('');
}

// 胡萝卜
const carrot = results.find(r => r.seedId === 20003);
if (carrot) {
    // 胡萝卜原本120秒，施肥后90秒成熟
    const growTime = carrot.actualGrowTime;  // 施肥后成熟时间
    const operationTime = 15;
    const cycleTime = growTime + operationTime;
    const cyclesPerHour = 3600 / cycleTime;
    const expPerCycle = carrot.totalExp * LAND_COUNT;
    const expPerHour = cyclesPerHour * expPerCycle;
    const fertilizerPerCycle = FERTILIZER_SPEED_SECONDS * LAND_COUNT;
    const fertilizerPerHour = cyclesPerHour * fertilizerPerCycle;
    const totalHours = TOTAL_FERTILIZER_SECONDS / fertilizerPerHour;
    
    console.log(`方案2: 胡萝卜+肥料 (施肥后${growTime}秒成熟，每轮${cycleTime}秒)`);
    console.log(`  - 每小时经验: ${expPerHour.toFixed(0)}`);
    console.log(`  - 每小时消耗肥料: ${(fertilizerPerHour/3600).toFixed(1)} 小时`);
    console.log(`  - 肥料可用时间: ${totalHours.toFixed(1)} 小时`);
    console.log(`  - 总经验: ${(expPerHour * totalHours).toFixed(0)}`);
    console.log('');
}

// 白萝卜不施肥
console.log(`方案3: 白萝卜不施肥 (原本60秒成熟)`);
if (radish) {
    const growTime = radish.originalGrowTime;
    const operationTime = 15;
    const cycleTime = growTime + operationTime;
    const cyclesPerHour = 3600 / cycleTime;
    const expPerCycle = radish.totalExp * LAND_COUNT;
    const expPerHour = cyclesPerHour * expPerCycle;
    
    console.log(`  - 每小时经验: ${expPerHour.toFixed(0)}`);
    console.log(`  - 不消耗肥料`);
    console.log(`  - 可持续运行`);
    console.log('');
}

// 不用肥料的高效作物
const pineapple = results.find(r => r.seedId === 20016);  // 菠萝蜜
if (pineapple) {
    // 菠萝蜜4小时，不用肥料
    const cycleTime = pineapple.originalGrowTime + 30;  // 成熟时间 + 操作时间
    const cyclesPerHour = 3600 / cycleTime;
    const expPerCycle = pineapple.totalExp * LAND_COUNT;
    const expPerHour = cyclesPerHour * expPerCycle;
    
    console.log(`方案4: 菠萝蜜不施肥 (${formatTime(pineapple.originalGrowTime)}成熟)`);
    console.log(`  - 每小时经验: ${expPerHour.toFixed(0)}`);
    console.log(`  - 不消耗肥料`);
    console.log(`  - 可持续运行`);
    console.log('');
}

console.log('========================================');
console.log('');
console.log('【最优策略建议】');
console.log('');
console.log('1. 如果你能持续在线操作:');
console.log('   种白萝卜 + 施肥，每轮约30秒，经验最大化');
console.log('   但肥料会很快用完');
console.log('');
console.log('2. 如果你想平衡效率和肥料消耗:');
console.log('   种胡萝卜 + 施肥，每轮约75秒');
console.log('   经验稍低但肥料更持久');
console.log('');
console.log('3. 如果你想保存肥料:');
console.log('   种菠萝蜜，不施肥，4小时一轮');
console.log('   经验效率最高(217/小时)，肥料留给急用');
console.log('');
console.log('========================================');
