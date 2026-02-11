/**
 * 分析作物经验效率
 * 
 * 经验来源：
 * 1. 收获经验 (exp)
 * 2. 铲除枯萎作物 (+1 经验)
 * 
 * 计算公式：
 * - 总经验 = 收获经验 + 1 (铲除)
 * - 生长时间 = 各阶段时间之和 (秒)
 * - 经验效率 = 总经验 / 生长时间 (经验/秒)
 * - 每小时经验 = 经验效率 * 3600
 */

const fs = require('fs');
const path = require('path');

// 读取植物配置
const plantPath = path.join(__dirname, '..', 'gameConfig', 'Plant.json');
const plants = JSON.parse(fs.readFileSync(plantPath, 'utf8'));

// 解析生长阶段时间
function parseGrowTime(growPhases) {
    if (!growPhases) return 0;
    // 格式: "种子:30;发芽:30;成熟:0;"
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
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours < 24) return `${hours}小时${mins}分`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}天${remainHours}小时`;
}

// 筛选普通作物 (id 以 102 开头，排除变异等特殊作物)
const normalPlants = plants.filter(p => {
    const idStr = String(p.id);
    // 普通作物 id 格式: 102xxxx
    return idStr.startsWith('102') && p.seed_id && p.seed_id >= 20000 && p.seed_id < 30000;
});

// 计算经验效率
const results = [];
for (const plant of normalPlants) {
    const growTime = parseGrowTime(plant.grow_phases);
    if (growTime <= 0) continue;
    
    const harvestExp = plant.exp || 0;
    const removeExp = 1;  // 铲除枯萎作物经验
    const totalExp = harvestExp + removeExp;
    
    const expPerSecond = totalExp / growTime;
    const expPerHour = expPerSecond * 3600;
    
    results.push({
        id: plant.id,
        seedId: plant.seed_id,
        name: plant.name,
        growTime,
        growTimeStr: formatTime(growTime),
        harvestExp,
        totalExp,
        expPerHour: expPerHour.toFixed(2),
        expPerSecond: expPerSecond.toFixed(6),
        landLevel: plant.land_level_need || 1,
    });
}

// 按经验效率排序 (从高到低)
results.sort((a, b) => parseFloat(b.expPerHour) - parseFloat(a.expPerHour));

// 输出结果
console.log('========================================');
console.log('       作物经验效率分析 (按每小时经验排序)');
console.log('========================================');
console.log('');
console.log('计算说明:');
console.log('  - 总经验 = 收获经验 + 1 (铲除枯萎)');
console.log('  - 每小时经验 = 总经验 / 生长时间 * 3600');
console.log('');
console.log('========================================');
console.log('');

// 输出 Top 20
console.log('【Top 20 经验效率最高的作物】');
console.log('');
console.log('排名 | 作物名称 | 生长时间 | 收获经验 | 总经验 | 每小时经验');
console.log('-----|----------|----------|----------|--------|----------');

for (let i = 0; i < Math.min(20, results.length); i++) {
    const r = results[i];
    console.log(
        `${String(i + 1).padStart(4)} | ${r.name.padEnd(8)} | ${r.growTimeStr.padEnd(8)} | ${String(r.harvestExp).padStart(8)} | ${String(r.totalExp).padStart(6)} | ${r.expPerHour.padStart(10)}`
    );
}

console.log('');
console.log('========================================');
console.log('');

// 按时间段分组分析
console.log('【按生长时间分组的最佳选择】');
console.log('');

const timeGroups = [
    { name: '1分钟内', max: 60 },
    { name: '5分钟内', max: 300 },
    { name: '10分钟内', max: 600 },
    { name: '30分钟内', max: 1800 },
    { name: '1小时内', max: 3600 },
    { name: '2小时内', max: 7200 },
    { name: '4小时内', max: 14400 },
    { name: '8小时内', max: 28800 },
    { name: '12小时内', max: 43200 },
    { name: '24小时内', max: 86400 },
];

for (const group of timeGroups) {
    const inGroup = results.filter(r => r.growTime <= group.max);
    if (inGroup.length > 0) {
        const best = inGroup[0];  // 已按效率排序
        console.log(`${group.name.padEnd(10)}: ${best.name} (${best.growTimeStr}, ${best.expPerHour}经验/小时)`);
    }
}

console.log('');
console.log('========================================');
console.log('');

// 特别分析：考虑在线时间
console.log('【挂机建议】');
console.log('');
console.log('如果你能持续在线挂机，最佳选择是生长时间最短的作物:');
const fastest = results.filter(r => r.growTime <= 120).slice(0, 3);
for (const r of fastest) {
    console.log(`  - ${r.name}: ${r.growTimeStr}, 每小时 ${r.expPerHour} 经验`);
}

console.log('');
console.log('如果你只能定时查看 (如每小时一次)，选择接近查看间隔的作物:');
const hourly = results.filter(r => r.growTime >= 3000 && r.growTime <= 4000).slice(0, 3);
for (const r of hourly) {
    console.log(`  - ${r.name}: ${r.growTimeStr}, 每小时 ${r.expPerHour} 经验`);
}

console.log('');
console.log('如果你睡觉/工作 8 小时不在线，选择:');
const overnight = results.filter(r => r.growTime >= 25000 && r.growTime <= 32000).slice(0, 3);
for (const r of overnight) {
    console.log(`  - ${r.name}: ${r.growTimeStr}, 每小时 ${r.expPerHour} 经验`);
}

console.log('');
console.log('========================================');

// 输出完整列表到文件
const outputPath = path.join(__dirname, 'exp-analysis-result.txt');
let output = '作物经验效率完整列表\n';
output += '='.repeat(80) + '\n\n';
output += '排名 | seed_id | 作物名称 | 生长时间 | 收获经验 | 总经验 | 每小时经验\n';
output += '-'.repeat(80) + '\n';

for (let i = 0; i < results.length; i++) {
    const r = results[i];
    output += `${String(i + 1).padStart(4)} | ${String(r.seedId).padStart(7)} | ${r.name.padEnd(8)} | ${r.growTimeStr.padEnd(10)} | ${String(r.harvestExp).padStart(8)} | ${String(r.totalExp).padStart(6)} | ${r.expPerHour.padStart(10)}\n`;
}

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`\n完整列表已保存到: ${outputPath}`);
