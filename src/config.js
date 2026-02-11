/**
 * 配置常量与枚举定义
 */

const CONFIG = {
    serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
    clientVersion: '1.6.0.5_20251224',
    platform: 'qq',              // 平台: qq 或 wx (可通过 --wx 切换为微信)
    os: 'iOS',
    heartbeatInterval: 25000,    // 心跳间隔 25秒
    farmCheckInterval: 1000,    // 自己农场巡查完成后等待间隔 (可通过 --interval 修改, 最低1秒)
    friendCheckInterval: 1000,   // 好友巡查完成后等待间隔 (可通过 --friend-interval 修改, 最低1秒)
};

// 生长阶段枚举
const PlantPhase = {
    UNKNOWN: 0,
    SEED: 1,
    GERMINATION: 2,
    SMALL_LEAVES: 3,
    LARGE_LEAVES: 4,
    BLOOMING: 5,
    MATURE: 6,
    DEAD: 7,
};

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

module.exports = { CONFIG, PlantPhase, PHASE_NAMES };
