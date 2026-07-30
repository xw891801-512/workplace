"use client";

import { useMemo, useState } from "react";

const navItems = [
  { icon: "⌂", label: "今天" },
  { icon: "▦", label: "日历" },
  { icon: "☑", label: "计划" },
  { icon: "✿", label: "记录" },
  { icon: "⌁", label: "统计" }
];

const starterTasks = [
  { id: 1, text: "整理工作台首页的功能清单", group: "工作", done: true },
  { id: 2, text: "完成本周计划的第一版", group: "工作", done: false },
  { id: 3, text: "傍晚散步或运动 30 分钟", group: "生活", done: false },
  { id: 4, text: "看一集喜欢的综艺", group: "娱乐", done: false }
];

const meals = [
  { key: "breakfast", icon: "☀", label: "早餐" },
  { key: "lunch", icon: "◐", label: "午餐" },
  { key: "dinner", icon: "☾", label: "晚餐" }
];

export default function TodayPage() {
  const [activeNav, setActiveNav] = useState("今天");
  const [tasks, setTasks] = useState(starterTasks);
  const [newTask, setNewTask] = useState("");
  const [activeGroup, setActiveGroup] = useState("全部");
  const [checkins, setCheckins] = useState({
    exercise: false,
    weight: "52.6",
    sleep: "7h 20m"
  });
  const [mealState, setMealState] = useState({
    breakfast: true,
    lunch: false,
    dinner: false
  });

  const completed = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const filteredTasks = useMemo(
    () => tasks.filter((task) => activeGroup === "全部" || task.group === activeGroup),
    [tasks, activeGroup]
  );

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  }

  function addTask(event) {
    event.preventDefault();
    const value = newTask.trim();
    if (!value) return;
    setTasks((current) => [
      ...current,
      { id: Date.now(), text: value, group: activeGroup === "全部" ? "生活" : activeGroup, done: false }
    ]);
    setNewTask("");
  }

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="主要导航">
        <button className="brand" aria-label="工作台首页">W</button>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={activeNav === item.label ? "nav-button active" : "nav-button"}
              onClick={() => setActiveNav(item.label)}
              aria-label={item.label}
              title={item.label}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
        <button className="avatar" aria-label="个人设置">温</button>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">THURSDAY · JUL 30</p>
            <h1>早上好，Winnie <span>☁</span></h1>
            <p className="hero-copy">慢慢来，也是在好好生活。</p>
          </div>
          <button className="more-button" aria-label="更多选项">•••</button>
          <div className="cloud cloud-one" />
          <div className="cloud cloud-two" />
        </header>

        <section className="progress-card">
          <div className="progress-top">
            <div>
              <span className="section-kicker">TODAY</span>
              <h2>今天已经完成 {completed} 件事</h2>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress < 50 ? "还有一点点，先做最重要的那一件吧。" : "今天的节奏很好，继续保持。"}</p>
        </section>

        <section className="card task-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">MY LIST</span>
              <h2>今日清单</h2>
            </div>
            <span className="count-pill">{completed}/{tasks.length}</span>
          </div>

          <div className="tabs" role="tablist" aria-label="任务分类">
            {["全部", "工作", "生活", "娱乐"].map((group) => (
              <button
                key={group}
                className={activeGroup === group ? "active" : ""}
                onClick={() => setActiveGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>

          <div className="task-list">
            {filteredTasks.map((task) => (
              <button className={task.done ? "task-row done" : "task-row"} key={task.id} onClick={() => toggleTask(task.id)}>
                <span className="checkmark">{task.done ? "✓" : ""}</span>
                <span className="task-copy">
                  <b>{task.text}</b>
                  <small>{task.group}</small>
                </span>
                <span className="task-spark">✦</span>
              </button>
            ))}
          </div>

          <form className="add-task" onSubmit={addTask}>
            <span>＋</span>
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="添加一件今天想做的事…"
              aria-label="新任务"
            />
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">LITTLE STEPS</span>
              <h2>今日记录</h2>
            </div>
            <span className="tiny-flower">✿</span>
          </div>

          <div className="checkin-grid">
            <button
              className={checkins.exercise ? "checkin active" : "checkin"}
              onClick={() => setCheckins((state) => ({ ...state, exercise: !state.exercise }))}
            >
              <span className="checkin-icon coral">♥</span>
              <small>运动</small>
              <b>{checkins.exercise ? "已完成" : "去打卡"}</b>
            </button>
            <label className="checkin">
              <span className="checkin-icon lilac">♢</span>
              <small>体重</small>
              <span className="inline-value">
                <input
                  value={checkins.weight}
                  inputMode="decimal"
                  onChange={(event) => setCheckins((state) => ({ ...state, weight: event.target.value }))}
                  aria-label="今日体重"
                />
                kg
              </span>
            </label>
            <label className="checkin">
              <span className="checkin-icon blue">☾</span>
              <small>睡眠</small>
              <input
                className="sleep-input"
                value={checkins.sleep}
                onChange={(event) => setCheckins((state) => ({ ...state, sleep: event.target.value }))}
                aria-label="今日睡眠"
              />
            </label>
          </div>
        </section>

        <section className="card meal-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">MEAL DIARY</span>
              <h2>今天吃了什么</h2>
            </div>
            <span className="meal-count">{Object.values(mealState).filter(Boolean).length}/3</span>
          </div>
          <div className="meal-list">
            {meals.map((meal) => (
              <button
                key={meal.key}
                className={mealState[meal.key] ? "meal done" : "meal"}
                onClick={() => setMealState((state) => ({ ...state, [meal.key]: !state[meal.key] }))}
              >
                <span className="meal-icon">{meal.icon}</span>
                <span><b>{meal.label}</b><small>{mealState[meal.key] ? "已经记录啦" : "添加文字或照片"}</small></span>
                <span className="meal-action">{mealState[meal.key] ? "✓" : "＋"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="quote-card">
          <span>“</span>
          <p>把普通的一天，也收进喜欢的生活里。</p>
          <small>— 今日的小纸条</small>
        </section>
      </section>
    </main>
  );
}
