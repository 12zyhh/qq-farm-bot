/**
 * 游戏配置数据模块
 * 从 gameConfig 目录加载配置数据
 */

const fs = require('fs');
const path = require('path');

// ============ 等级经验表 ============
let roleLevelConfig = null;
let levelExpTable = null;  // 累计经验表，索引为等级

// ============ 植物配置 ============
let plantConfig = null;
let plantMap = new Map();  // id -> plant
let seedToPlant = new Map();  // seed_id -> plant
let fruitToPlant = new Map();  // fruit_id -> plant (果实ID -> 植物)

/**
 * 加载配置文件
 */
function loadConfigs() {
    const configDir = path.join(__dirname, '..', 'gameConfig');
    
    // 加载等级经验配置
    try {
        const roleLevelPath = path.join(configDir, 'RoleLevel.json');
        if (fs.existsSync(roleLevelPath)) {
            roleLevelConfig = JSON.parse(fs.readFileSync(roleLevelPath, 'utf8'));
            // 构建累计经验表
            levelExpTable = [];
            for (const item of roleLevelConfig) {
                levelExpTable[item.level] = item.exp;
            }
            console.log(`[配置] 已加载等级经验表 (${roleLevelConfig.length} 级)`);
        }
    } catch (e) {
        console.warn('[配置] 加载 RoleLevel.json 失败:', e.message);
    }
    
    // 加载植物配置
    try {
        const plantPath = path.join(configDir, 'Plant.json');
        if (fs.existsSync(plantPath)) {
            plantConfig = JSON.parse(fs.readFileSync(plantPath, 'utf8'));
            plantMap.clear();
            seedToPlant.clear();
            fruitToPlant.clear();
            for (const plant of plantConfig) {
                plantMap.set(plant.id, plant);
                if (plant.seed_id) {
                    seedToPlant.set(plant.seed_id, plant);
                }
                if (plant.fruit && plant.fruit.id) {
                    fruitToPlant.set(plant.fruit.id, plant);
                }
            }
            console.log(`[配置] 已加载植物配置 (${plantConfig.length} 种)`);
        }
    } catch (e) {
        console.warn('[配置] 加载 Plant.json 失败:', e.message);
    }
}

// ============ 等级经验相关 ============

/**
 * 获取等级经验表
 */
function getLevelExpTable() {
    return levelExpTable;
}

/**
 * 计算当前等级的经验进度
 * @param {number} level - 当前等级
 * @param {number} totalExp - 累计总经验
 * @returns {{ current: number, needed: number }} 当前等级经验进度
 */
function getLevelExpProgress(level, totalExp) {
    if (!levelExpTable || level <= 0) return { current: 0, needed: 0 };
    
    // 根据总经验值自动计算当前等级（避免等级更新延迟导致显示错误）
    let actualLevel = level;
    for (let i = 1; i < levelExpTable.length; i++) {
        if (levelExpTable[i] && totalExp >= levelExpTable[i]) {
            actualLevel = i;
        } else {
            break;
        }
    }
    
    const currentLevelStart = levelExpTable[actualLevel] || 0;
    const nextLevelStart = levelExpTable[actualLevel + 1] || (currentLevelStart + 100000);
    
    const currentExp = Math.max(0, totalExp - currentLevelStart);
    const neededExp = nextLevelStart - currentLevelStart;
    
    return { current: currentExp, needed: neededExp, level: actualLevel };
}

// ============ 植物配置相关 ============

/**
 * 根据植物ID获取植物信息
 * @param {number} plantId - 植物ID
 */
function getPlantById(plantId) {
    return plantMap.get(plantId);
}

/**
 * 根据种子ID获取植物信息
 * @param {number} seedId - 种子ID
 */
function getPlantBySeedId(seedId) {
    return seedToPlant.get(seedId);
}

/**
 * 获取植物名称
 * @param {number} plantId - 植物ID
 */
function getPlantName(plantId) {
    const plant = plantMap.get(plantId);
    return plant ? plant.name : `植物${plantId}`;
}

/**
 * 根据种子ID获取植物名称
 * @param {number} seedId - 种子ID
 */
function getPlantNameBySeedId(seedId) {
    const plant = seedToPlant.get(seedId);
    return plant ? plant.name : `种子${seedId}`;
}

/**
 * 获取植物的果实信息
 * @param {number} plantId - 植物ID
 * @returns {{ id: number, count: number, name: string } | null}
 */
function getPlantFruit(plantId) {
    const plant = plantMap.get(plantId);
    if (!plant || !plant.fruit) return null;
    return {
        id: plant.fruit.id,
        count: plant.fruit.count,
        name: plant.name,
    };
}

/**
 * 获取植物的生长时间（秒）
 * @param {number} plantId - 植物ID
 */
function getPlantGrowTime(plantId) {
    const plant = plantMap.get(plantId);
    if (!plant || !plant.grow_phases) return 0;
    
    // 解析 "种子:30;发芽:30;成熟:0;" 格式
    const phases = plant.grow_phases.split(';').filter(p => p);
    let totalSeconds = 0;
    for (const phase of phases) {
        const match = phase.match(/:(\d+)/);
        if (match) {
            totalSeconds += parseInt(match[1]);
        }
    }
    return totalSeconds;
}

/**
 * 格式化时间
 * @param {number} seconds - 秒数
 */
function formatGrowTime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

/**
 * 获取植物的收获经验
 * @param {number} plantId - 植物ID
 */
function getPlantExp(plantId) {
    const plant = plantMap.get(plantId);
    return plant ? plant.exp : 0;
}

/**
 * 根据果实ID获取植物名称
 * @param {number} fruitId - 果实ID
 */
function getFruitName(fruitId) {
    const plant = fruitToPlant.get(fruitId);
    return plant ? plant.name : `果实${fruitId}`;
}

/**
 * 根据果实ID获取植物信息
 * @param {number} fruitId - 果实ID
 */
function getPlantByFruitId(fruitId) {
    return fruitToPlant.get(fruitId);
}

// 启动时加载配置
loadConfigs();

module.exports = {
    loadConfigs,
    // 等级经验
    getLevelExpTable,
    getLevelExpProgress,
    // 植物配置
    getPlantById,
    getPlantBySeedId,
    getPlantName,
    getPlantNameBySeedId,
    getPlantFruit,
    getPlantGrowTime,
    getPlantExp,
    formatGrowTime,
    // 果实配置
    getFruitName,
    getPlantByFruitId,
};
