// 测试本地存储中的任务数据
console.log('=== 测试本地存储 ===');

// 检查本地存储中的任务
const savedTasks = localStorage.getItem('tasks');
console.log('本地存储中的任务:', savedTasks);

// 解析任务数据
if (savedTasks) {
  try {
    const parsed = JSON.parse(savedTasks);
    console.log('解析后的任务:', parsed);
    console.log('任务数量:', parsed.length);
  } catch (e) {
    console.error('解析失败:', e);
  }
} else {
  console.log('本地存储中没有任务数据');
}

// 测试添加任务
console.log('\n=== 测试添加任务 ===');
const testTask = {
  id: Date.now(),
  title: '测试任务',
  completed: false,
  dueDate: '2026-04-25',
  priority: 'medium'
};

// 模拟保存任务
const currentTasks = savedTasks ? JSON.parse(savedTasks) : [];
currentTasks.push(testTask);
localStorage.setItem('tasks', JSON.stringify(currentTasks));
console.log('添加测试任务后:', localStorage.getItem('tasks'));