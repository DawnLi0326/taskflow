/**
 * 日期工具函数
 */

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 * @returns {string}
 */
export function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {string|Date} date - 日期对象或日期字符串
 * @returns {string}
 */
export function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 格式化日期为 MM月DD日 格式
 * @param {string|Date} date - 日期对象或日期字符串
 * @returns {string}
 */
export function formatDateShort(date) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}月${day}日`
}

/**
 * 获取星期几
 * @param {string|Date} date - 日期对象或日期字符串
 * @returns {string}
 */
export function getDayOfWeek(date) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[new Date(date).getDay()]
}

/**
 * 获取格式化的完整日期字符串（含星期）
 * @returns {string}
 */
export function getFullTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${getDayOfWeek(d)}`
}

/**
 * 计算两个日期之间相差的天数
 * @param {string|Date} date1 - 第一个日期
 * @param {string|Date} date2 - 第二个日期
 * @returns {number}
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000)
}
