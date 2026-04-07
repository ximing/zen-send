/**
 * @zen-send/logger
 * Node.js 服务端日志库
 * 支持日志分级、文件切割、多输出渠道
 */

export { Log } from './core';
export type { LoggerOptions, ResolvedConfig, LogMetadata } from './config';
export { LEVEL_MAP, resolveConfig } from './config';
export { createTransports, getConsoleFormat, getFileFormat } from './transports';
export { getEnvValue, getEnvBool } from './utils/env';

// 创建并导出默认 logger 实例
import { Log } from './core';

const defaultLogger = new Log({
  projectName: 'zen-send',
});

export const logger = defaultLogger;
