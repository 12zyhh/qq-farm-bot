/**
 * 游戏配置解密工具
 * 
 * 使用方法:
 * 1. 从游戏中抓取加密的配置数据 (base64 字符串)
 * 2. 运行: node tools/decrypt-config.js <base64数据>
 * 
 * 或者直接在代码中使用:
 * const { decryptConfig } = require('./tools/decrypt-config');
 * const data = decryptConfig(base64String);
 */

const DECRYPT_KEY = "NQF_SHANGXIANDAMAI_#2026_SECURE";

/**
 * Base64 解码
 */
function base64Decode(str) {
    return Buffer.from(str, 'base64');
}

/**
 * UTF-8 编码
 */
function utf8Encode(str) {
    return Buffer.from(str, 'utf8');
}

/**
 * 解密配置数据
 * @param {string} base64Data - Base64 编码的加密数据
 * @returns {any} 解密后的 JSON 数据
 */
function decryptConfig(base64Data) {
    // Base64 解码
    const encrypted = base64Decode(base64Data);
    
    // XOR 解密
    const keyBytes = utf8Encode(DECRYPT_KEY);
    const decrypted = Buffer.alloc(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // 转换为字符串并解析 JSON
    const jsonStr = decrypted.toString('utf8');
    return JSON.parse(jsonStr);
}

/**
 * 提取等级经验表
 * @param {Array} roleLevelData - RoleLevel 配置数组
 * @returns {number[]} 累计经验表，索引为等级
 */
function extractLevelExpTable(roleLevelData) {
    // 按等级排序
    const sorted = [...roleLevelData].sort((a, b) => a.level - b.level);
    
    // 创建累计经验表
    const table = [];
    for (const item of sorted) {
        table[item.level] = item.exp;
    }
    
    return table;
}

// 命令行使用
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('使用方法: node decrypt-config.js <base64数据>');
        console.log('');
        console.log('示例:');
        console.log('  node decrypt-config.js "SGVsbG8gV29ybGQ="');
        console.log('');
        console.log('解密密钥:', DECRYPT_KEY);
        process.exit(1);
    }
    
    try {
        const data = decryptConfig(args[0]);
        console.log('解密成功:');
        console.log(JSON.stringify(data, null, 2));
        
        // 如果是 RoleLevel 配置，提取经验表
        if (Array.isArray(data) && data.length > 0 && data[0].level !== undefined && data[0].exp !== undefined) {
            console.log('\n等级经验表:');
            const table = extractLevelExpTable(data);
            console.log('const levelExpTable = [');
            for (let i = 1; i < table.length; i++) {
                console.log(`    ${table[i]},  // Lv${i}`);
            }
            console.log('];');
        }
    } catch (e) {
        console.error('解密失败:', e.message);
        process.exit(1);
    }
}

module.exports = {
    decryptConfig,
    extractLevelExpTable,
    DECRYPT_KEY,
};
