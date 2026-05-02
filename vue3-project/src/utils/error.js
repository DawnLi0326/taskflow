/**
 * 错误处理工具函数
 */
import { ElMessage } from 'element-plus'

/**
 * 统一处理错误
 * @param {Error} error - 错误对象
 * @param {string} message - 用户友好的错误消息
 */
export function handleError(error, message = '操作失败') {
  console.error('[Error]', error)
  ElMessage.error(message)
}

/**
 * 异步函数错误捕获包装器
 * @param {Function} fn - 异步函数
 * @param {string} errorMessage - 错误消息
 * @returns {Function} 包装后的函数
 */
export function catchAsync(fn, errorMessage = '操作失败') {
  return async function (...args) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      handleError(error, errorMessage)
    }
  }
}

/**
 * 同步函数错误捕获包装器
 * @param {Function} fn - 函数
 * @param {string} errorMessage - 错误消息
 * @returns {Function} 包装后的函数
 */
export function catchSync(fn, errorMessage = '操作失败') {
  return function (...args) {
    try {
      return fn.apply(this, args)
    } catch (error) {
      handleError(error, errorMessage)
    }
  }
}
