import winston from 'winston';

import { LoggerOptions, ResolvedConfig, resolveConfig, LogMetadata } from './config';
import { createTransports } from './transports';

/**
 * Log 类 - Node.js 日志记录器
 * 支持多级别日志，自动文件切割，灵活的配置
 *
 * API 风格兼容 pino:
 * - logger.info('message') - 只有消息
 * - logger.info({ key: value }, 'message') - 元数据 + 消息 (pino 风格)
 * - logger.info('message', { key: value }) - 消息 + 元数据 (winston 风格，也支持)
 */
export class Log {
  private logger: winston.Logger;
  private config: ResolvedConfig;

  /**
   * 构造函数
   * @param options 日志配置选项
   */
  constructor(options: LoggerOptions) {
    this.config = resolveConfig(options);
    this.logger = this.createWinstonLogger();
  }

  /**
   * 创建 Winston Logger 实例
   */
  private createWinstonLogger(): winston.Logger {
    const transports = createTransports(this.config);

    return winston.createLogger({
      level: this.config.level,
      // 添加默认元数据，确保每条日志都包含 projectName
      defaultMeta: { projectName: this.config.projectName },
      transports,
      // 处理未捕获的异常
      exceptionHandlers: transports,
    });
  }

  /**
   * 获取底层的 Winston Logger 实例
   * @returns Winston Logger 实例
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): ResolvedConfig {
    return { ...this.config };
  }

  /**
   * 解析参数，支持 pino 风格和 winston 风格
   * pino 风格: logger.info(meta, message)
   * winston 风格: logger.info(message, meta)
   */
  private parseArgs(
    ...args: LogMetadata[]
  ): { message: string; meta: Record<string, unknown> } {
    if (args.length === 0) {
      return { message: '', meta: {} };
    }

    // 只有一个参数
    if (args.length === 1) {
      const arg = args[0];
      if (typeof arg === 'string') {
        return { message: arg, meta: {} };
      }
      // 如果是对象（非 Error），作为元数据处理
      if (typeof arg === 'object' && arg !== null && !(arg instanceof Error)) {
        return { message: '', meta: arg as Record<string, unknown> };
      }
      // Error 或其他类型
      return { message: String(arg), meta: {} };
    }

    // 两个或更多参数
    const [first, second, ...rest] = args;

    // pino 风格: (meta, message)
    if (typeof first === 'object' && first !== null && !(first instanceof Error) && typeof second === 'string') {
      const restMeta = rest.reduce<Record<string, unknown>>((acc, r) => {
        if (typeof r === 'object' && r !== null) {
          return { ...acc, ...r as Record<string, unknown> };
        }
        return acc;
      }, {});
      return { message: second, meta: { ...first as Record<string, unknown>, ...restMeta } };
    }

    // winston 风格: (message, meta, ...)
    if (typeof first === 'string') {
      const metaArgs = [second, ...rest].filter((m): m is Record<string, unknown> =>
        typeof m === 'object' && m !== null && !(m instanceof Error)
      );
      const errorArgs = [second, ...rest].filter((m): m is Error => m instanceof Error);
      return {
        message: first,
        meta: {
          ...metaArgs.reduce((acc, m) => ({ ...acc, ...m }), {} as Record<string, unknown>),
          ...(errorArgs.length > 0 ? { err: errorArgs[0] } : {}),
        },
      };
    }

    // 回退：将所有参数转为字符串
    return { message: String(first), meta: {} };
  }

  /**
   * trace 级别日志
   * 支持 pino 风格: trace(meta, message)
   * 支持 winston 风格: trace(message, meta)
   */
  public trace(...args: LogMetadata[]): void {
    const { message, meta } = this.parseArgs(...args);
    this.logger.silly(message, meta);
  }

  /**
   * debug 级别日志
   * 支持 pino 风格: debug(meta, message)
   * 支持 winston 风格: debug(message, meta)
   */
  public debug(...args: LogMetadata[]): void {
    const { message, meta } = this.parseArgs(...args);
    this.logger.debug(message, meta);
  }

  /**
   * info 级别日志
   * 支持 pino 风格: info(meta, message)
   * 支持 winston 风格: info(message, meta)
   */
  public info(...args: LogMetadata[]): void {
    const { message, meta } = this.parseArgs(...args);
    this.logger.info(message, meta);
  }

  /**
   * warn 级别日志
   * 支持 pino 风格: warn(meta, message)
   * 支持 winston 风格: warn(message, meta)
   */
  public warn(...args: LogMetadata[]): void {
    const { message, meta } = this.parseArgs(...args);
    this.logger.warn(message, meta);
  }

  /**
   * error 级别日志
   * 支持 pino 风格: error(meta, message)
   * 支持 winston 风格: error(message, meta)
   */
  public error(...args: LogMetadata[]): void {
    const { message, meta } = this.parseArgs(...args);
    this.logger.error(message, meta);
  }

  /**
   * 等待所有待处理的日志被写入
   * 用于优雅关闭前确保日志完全输出
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      // Winston 在有待处理的写入时会触发 finish 事件
      let completed = 0;
      const totalTransports = this.logger.transports.length;

      if (totalTransports === 0) {
        resolve();
        return;
      }

      for (const transport of this.logger.transports) {
        if ('close' in transport && typeof transport.close === 'function') {
          transport.on('finish', () => {
            completed++;
            if (completed === totalTransports) {
              resolve();
            }
          });
        } else {
          completed++;
          if (completed === totalTransports) {
            resolve();
          }
        }
      }

      // 设置超时，防止无限等待
      setTimeout(resolve, 2000);
    });
  }

  /**
   * 关闭 Logger，释放资源
   */
  public close(): void {
    try {
      // 移除所有错误监听器，防止未捕获的错误
      for (const transport of this.logger.transports) {
        transport.removeAllListeners('error');
      }

      this.logger.close();
    } catch (error) {
      // 忽略关闭时的错误
      console.error('Error closing logger:', error);
    }
  }
}
