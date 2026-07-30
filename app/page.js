"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CloudSyncPage, { CloudAutoSync } from "./cloud-sync";

const navGroups = [
  {
    label: "计划",
    items: [
      { icon: "▦", label: "月日历" },
      { icon: "▤", label: "周计划" },
      { icon: "☑", label: "日计划" }
    ]
  },
  {
    label: "打卡",
    items: [
      { icon: "habit", label: "习惯" },
      { icon: "data", label: "数据" },
      { icon: "meal", label: "吃饭" }
    ]
  }
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

const localDateKey = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);
  const lastSaved = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch {
      localStorage.removeItem(key);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    if (lastSaved.current !== null && lastSaved.current !== serialized) {
      window.dispatchEvent(new Event("winnie:data-change"));
    }
    lastSaved.current = serialized;
  }, [key, ready, value]);

  return [value, setValue];
}

function NavIcon({ kind }) {
  const paths = {
    check: <><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.5 2.5L16 9"/></>,
    habit: <><path d="M12 20v-8"/><path d="M12 13c-4.8 0-7-2.6-7-6 4.2 0 7 1.8 7 6Z"/><path d="M12 11c.3-4.3 2.8-6.4 7-6.4 0 3.8-2.3 6.4-7 6.4Z"/></>,
    data: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3.5-4 3 2 4.5-6"/><circle cx="7" cy="15" r=".8"/><circle cx="10.5" cy="11" r=".8"/><circle cx="13.5" cy="13" r=".8"/><circle cx="18" cy="7" r=".8"/></>,
    meal: <><path d="M4 11h16c0 5-3.5 8-8 8s-8-3-8-8Z"/><path d="M7 8c0-1.2.7-1.9 1.5-2.7M12 8c0-1.2.7-1.9 1.5-2.7M17 8c0-1.2.7-1.9 1.5-2.7"/></>
  };
  return <svg className="nav-icon-svg" viewBox="0 0 24 24" aria-hidden="true">{paths[kind]}</svg>;
}

export default function TodayPage() {
  const [activeNav, setActiveNav] = useState("今天");
  const [openGroups, setOpenGroups] = useState({ 计划: false, 打卡: false });
  const [tasks, setTasks] = useState(starterTasks);
  const [taskDate, setTaskDate] = useState("2026-07-30");
  const [taskArchives, setTaskArchives] = useState({});
  const [habits, setHabits] = useState(habitSeed);
  const [health, setHealth] = useState({
    morning: "52.6",
    evening: "",
    sleep: "7.3",
    morningHistory: [...Array(23).fill(null), 52.9, 52.7, 52.8, 52.6, 52.5, 52.7, 52.6, null],
    eveningHistory: [...Array(23).fill(null), 53.2, 53.1, 53.0, 52.9, 52.8, 52.9, 52.8, null],
    sleepHistory: [...Array(23).fill(null), 7.1, 6.8, 7.5, 7.2, 8.0, 7.4, 7.3, null]
  });
  const [mealRecords, setMealRecords] = useState({
    breakfast: { done: true, photo: null },
    lunch: { done: false, photo: null },
    dinner: { done: false, photo: null }
  });
  const [newTask, setNewTask] = useState("");
  const [activeGroup, setActiveGroup] = useState("全部");
  const [storageReady, setStorageReady] = useState(false);
  const lastWorkbenchSave = useRef(null);
  const [greeting, setGreeting] = useState("你好");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("winnie-workbench") || "null");
      if (saved?.tasks) {
        const today = localDateKey();
        const savedDate = saved.taskDate || "2026-07-30";
        if (savedDate !== today) {
          const unfinished = saved.tasks.filter(task => !task.done);
          const shouldCarry = unfinished.length > 0 && window.confirm(`昨天的今日清单还有 ${unfinished.length} 项没有完成，是否同步到今天的任务中？`);
          setTaskArchives({ ...(saved.taskArchives || {}), [savedDate]: saved.tasks });
          setTasks(shouldCarry ? unfinished.map(task => ({ ...task, id: `${today}-${task.id}`, done: false })) : []);
          setTaskDate(today);
        } else {
          setTasks(saved.tasks);
          setTaskDate(savedDate);
          setTaskArchives(saved.taskArchives || {});
        }
      }
      if (saved?.habits) setHabits(saved.habits);
      if (saved?.health) setHealth(saved.health);
      if (saved?.mealRecords) {
        setMealRecords(Object.fromEntries(Object.entries(saved.mealRecords).map(([key, item]) => [key, { ...item, photo: null }])));
      }
    } catch {
      localStorage.removeItem("winnie-workbench");
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const safeMeals = Object.fromEntries(Object.entries(mealRecords).map(([key, item]) => [key, { done: item.done, photo: null }]));
    const serialized = JSON.stringify({ tasks, taskDate, taskArchives, habits, health, mealRecords: safeMeals });
    localStorage.setItem("winnie-workbench", serialized);
    if (lastWorkbenchSave.current !== null && lastWorkbenchSave.current !== serialized) {
      window.dispatchEvent(new Event("winnie:data-change"));
    }
    lastWorkbenchSave.current = serialized;
  }, [tasks, taskDate, taskArchives, habits, health, mealRecords, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    const checkDateRollover = () => {
      const today = localDateKey();
      if (today === taskDate) return;
      setTaskArchives(current => ({ ...current, [taskDate]: tasks }));
      const unfinished = tasks.filter(task => !task.done);
      const shouldCarry = unfinished.length > 0 && window.confirm(`今日清单还有 ${unfinished.length} 项没有完成，是否同步到今天的任务中？`);
      setTasks(shouldCarry ? unfinished.map(task => ({ ...task, id: `${today}-${task.id}`, done: false })) : []);
      setTaskDate(today);
    };
    const timer = window.setInterval(checkDateRollover, 60_000);
    return () => window.clearInterval(timer);
  }, [storageReady, taskDate, tasks]);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) setGreeting("早上好");
      else if (hour >= 11 && hour < 14) setGreeting("中午好");
      else if (hour >= 14 && hour < 18) setGreeting("下午好");
      else if (hour >= 18 && hour < 23) setGreeting("晚上好");
      else setGreeting("深夜了");
    };
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
      <CloudAutoSync />
      <aside className="side-rail" aria-label="主要导航">
        <button className="brand" aria-label="工作台首页" onClick={() => setActiveNav("今天")}>W</button>
        <nav>
          <button
            className={activeNav === "今天" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveNav("今天")}
            aria-label="今天"
          >
            <span>⌂</span><small>今天</small>
          </button>
          {navGroups.map((group) => (
            <div className={openGroups[group.label] ? "nav-group open" : "nav-group"} key={group.label}>
              <button
                className={group.items.some(item => item.label === activeNav) ? "nav-button nav-parent active" : "nav-button nav-parent"}
                onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !current[group.label] }))}
                aria-expanded={openGroups[group.label]}
                aria-label={`${group.label}菜单`}
              >
                <span>{group.label === "计划" ? "▤" : <NavIcon kind="check" />}</span>
                <small>{group.label}</small>
                <i>{openGroups[group.label] ? "−" : "+"}</i>
              </button>
              {openGroups[group.label] && <div className="nav-children">{group.items.map((item) => (
                <button
                  key={item.label}
                  className={activeNav === item.label ? "nav-child active" : "nav-child"}
                  onClick={() => setActiveNav(item.label)}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span>{group.label === "打卡" ? <NavIcon kind={item.icon} /> : item.icon}</span>
                  <small>{item.label}</small>
                </button>
              ))}</div>}
            </div>
          ))}
        </nav>
        <button
          className={activeNav === "云同步" ? "nav-button cloud-nav active" : "nav-button cloud-nav"}
          onClick={() => { setActiveNav("云同步"); setOpenGroup(null); }}
          aria-label="云同步"
        >
          <span>☁</span><small>同步</small>
        </button>
      </aside>

      {activeNav === "今天" ? <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">THURSDAY · JUL 30</p>
            <h1>{greeting}，Winnie <span>☁</span></h1>
            <p className="hero-copy">慢慢来，也是在好好生活。</p>
          </div>
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
                </span>
                <small className="task-tag">{task.group}</small>
                <span className="task-spark">✦</span>
              </button>
            ))}
          </div>

          <form className="add-task" onSubmit={addTask}>
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="添加一件今天想做的事…"
              aria-label="新任务"
            />
            <button type="submit">添加</button>
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
              className={habits.find(h => h.id === "sport")?.days.includes(30) ? "checkin active" : "checkin"}
              onClick={() => setHabits((current) => current.map(h => h.id === "sport" ? { ...h, days: h.days.includes(30) ? h.days.filter(d => d !== 30) : [...h.days, 30] } : h))}
            >
              <span className="checkin-icon coral">♥</span>
              <small>运动</small>
              <b>{habits.find(h => h.id === "sport")?.days.includes(30) ? "已完成" : "去打卡"}</b>
            </button>
            <label className="checkin">
              <span className="checkin-icon lilac">♢</span>
              <small>体重</small>
              <span className="inline-value">
                <input
                  value={health.morning}
                  inputMode="decimal"
                  onChange={(event) => setHealth((state) => ({ ...state, morning: event.target.value }))}
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
                value={health.sleep}
                onChange={(event) => setHealth((state) => ({ ...state, sleep: event.target.value }))}
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
            <span className="meal-count">{Object.values(mealRecords).filter(item => item.done).length}/3</span>
          </div>
          <div className="meal-list">
            {meals.map((meal) => (
              <button
                key={meal.key}
                className={mealRecords[meal.key].done ? "meal done" : "meal"}
                onClick={() => setMealRecords((state) => ({ ...state, [meal.key]: { ...state[meal.key], done: !state[meal.key].done } }))}
              >
                <span className="meal-icon">{meal.icon}</span>
                <span><b>{meal.label}</b><small>{mealRecords[meal.key].done ? "已经记录啦" : "点击完成记录"}</small></span>
                <span className="meal-action">{mealRecords[meal.key].done ? "✓" : "＋"}</span>
              </button>
            ))}
          </div>
        </section>

      </section> : <FeaturePage page={activeNav} tasks={tasks} setTasks={setTasks} taskDate={taskDate} taskArchives={taskArchives} habits={habits} setHabits={setHabits} health={health} setHealth={setHealth} mealRecords={mealRecords} setMealRecords={setMealRecords} />}
    </main>
  );
}

function FeaturePage({ page, tasks, setTasks, taskDate, taskArchives, habits, setHabits, health, setHealth, mealRecords, setMealRecords }) {
  const pageMap = {
    "月日历": <MonthPlan />,
    "周计划": <WeekPlan />,
    "日计划": <DayPlan items={tasks} setItems={setTasks} taskDate={taskDate} taskArchives={taskArchives} />,
    "提醒": <ReminderPage />,
    "习惯": <HabitPage habits={habits} setHabits={setHabits} />,
    "数据": <DataPage health={health} setHealth={setHealth} />,
    "吃饭": <MealPage mealRecords={mealRecords} setMealRecords={setMealRecords} />
    ,"云同步": <CloudSyncPage />
  };
  return <section className="content feature-content">{pageMap[page]}</section>;
}

function PageIntro({ eyebrow, title, copy, icon }) {
  return (
    <header className="feature-hero">
      <span className="feature-icon">{icon}</span>
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>
    </header>
  );
}

function MonthPlan() {
  const [selected, setSelected] = useState(30);
  const [viewMonth, setViewMonth] = useState("2026-07");
  const [showEventModal, setShowEventModal] = useState(false);
  const [plans, setPlans] = usePersistentState("winnie-month-plans", { 30: ["完成工作台页面规划"] });
  const [draft, setDraft] = useState("");
  const [events, setEvents] = usePersistentState("winnie-month-events", [
    { id: 1, title: "项目初稿", type: "deadline", start: 18, end: 18 },
    { id: 2, title: "旅行", type: "range", start: 24, end: 27 }
  ]);
  const [eventDraft, setEventDraft] = useState({ title: "", type: "deadline", start: 30, end: 30 });
  const [viewYear, viewMonthNumber] = viewMonth.split("-").map(Number);
  const daysInMonth = new Date(viewYear, viewMonthNumber, 0).getDate();
  const monthOffset = (new Date(viewYear, viewMonthNumber - 1, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const planKey = day => `${viewMonth}-${String(day).padStart(2, "0")}`;
  const plansForDay = day => plans[planKey(day)] || (viewMonth === "2026-07" ? plans[day] : []) || [];
  const addPlan = event => {
    event.preventDefault();
    if (!draft.trim()) return;
    setPlans(current => ({ ...current, [planKey(selected)]: [...plansForDay(selected), draft.trim()] }));
    setDraft("");
  };
  const addCalendarEvent = event => {
    event.preventDefault();
    if (!eventDraft.title.trim()) return;
    const start = Math.min(Number(eventDraft.start), Number(eventDraft.end));
    const end = Math.max(Number(eventDraft.start), Number(eventDraft.end));
    setEvents(current => [...current, { ...eventDraft, month: viewMonth, id: Date.now(), title: eventDraft.title.trim(), start, end }]);
    setEventDraft(current => ({ ...current, title: "" }));
    setShowEventModal(false);
  };
  const eventForDay = day => events.filter(item => (item.month || "2026-07") === viewMonth && day >= item.start && day <= item.end);
  const nearbyDays = Array.from({ length: 7 }, (_, index) => selected - 3 + index).filter(day => day >= 1 && day <= daysInMonth);
  return <>
    <PageIntro eyebrow="PLAN · JULY" icon="▦" title="月日历" copy="把重要安排和大的 deadline 放进这个月。" />
    <section className="card calendar-card">
      <div className="section-heading"><input className="month-picker" type="month" value={viewMonth} onChange={event => { setViewMonth(event.target.value); setSelected(1); }} /><div className="calendar-heading-actions"><span className="count-pill">{viewYear} 年 {viewMonthNumber} 月</span><button className="calendar-add" type="button" aria-label="添加重要时段" onClick={() => setShowEventModal(true)}>＋</button></div></div>
      <div className="week-labels">{["一","二","三","四","五","六","日"].map(d => <span key={d}>{d}</span>)}</div>
      <div className="month-grid">
        {Array.from({length:monthOffset},(_,index)=><span className="outside-day" key={`blank-${index}`} />)}
        {days.map(day => {
          const dayEvents = eventForDay(day);
          const visibleEvent = dayEvents[0];
          const calendarColumn = (monthOffset + day - 1) % 7;
          const startsRangeRow = visibleEvent?.type === "range" && (day === visibleEvent.start || calendarColumn === 0);
          const rangeSpan = startsRangeRow ? Math.min(visibleEvent.end - day + 1, 7 - calendarColumn) : 0;
          return <button key={day} className={`${selected === day ? "selected " : ""}${planKey(day) === localDateKey() ? "is-today " : ""}${(plansForDay(day).length || dayEvents.length) ? "has-plan " : ""}${dayEvents.some(item => item.type === "range") ? "in-range " : ""}${startsRangeRow ? "range-row-start" : ""}`} onClick={() => setSelected(day)}>
            <b>{day}</b>
            {visibleEvent && visibleEvent.type !== "range" && <small className={`calendar-event ${visibleEvent.type}`} title={visibleEvent.title}>{visibleEvent.type === "deadline" ? `⚠ ${visibleEvent.title}` : visibleEvent.title}</small>}
            {startsRangeRow && <small
              className="calendar-event range continuous"
              title={visibleEvent.title}
              style={{ width: `calc(${rangeSpan * 100}% + ${(rangeSpan - 1) * 5}px)` }}
            >▣ {visibleEvent.title}</small>}
          </button>;
        })}
      </div>
    </section>
    <section className="card agenda-card">
      <span className="section-kicker">DAILY OVERVIEW</span><h2>前后日期事项</h2>
      <div className="agenda-strip">
        {nearbyDays.map(day => <button type="button" className={day === selected ? "agenda-day-card active" : "agenda-day-card"} key={day} onClick={() => setSelected(day)}>
          <span>{viewMonthNumber} 月 {day} 日{planKey(day) === localDateKey() ? " · 今天" : ""}</span>
          {plansForDay(day).map((plan, index) => <div className="agenda-item" key={`${plan}-${index}`}><span className="agenda-dot work" /><div><b>{plan}</b><small>工作 · 全天</small></div></div>)}
          {eventForDay(day).map(item => <div className="agenda-item" key={item.id}><span className={`agenda-dot ${item.type}`} /><div><b>{item.type === "deadline" ? `⚠ ${item.title}` : item.title}</b><small>{item.type === "deadline" ? "Deadline" : item.type === "range" ? `${item.start}—${item.end} 日` : "月度安排"}</small></div></div>)}
          {!plansForDay(day).length && !eventForDay(day).length && <small className="empty-note">暂无安排</small>}
        </button>)}
      </div>
      <form className="inline-add-form" onSubmit={addPlan}>
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder={`添加 ${viewMonthNumber} 月 ${selected} 日的安排`} />
        <button type="submit">添加</button>
      </form>
    </section>
    {showEventModal && <div className="modal-backdrop" role="presentation" onClick={() => setShowEventModal(false)}>
      <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onClick={event => event.stopPropagation()}>
        <div className="section-heading"><div><span className="section-kicker">MONTH EVENT</span><h2 id="event-modal-title">添加重要时段</h2></div><button className="modal-close" type="button" aria-label="关闭" onClick={() => setShowEventModal(false)}>×</button></div>
        <form className="calendar-event-form" onSubmit={addCalendarEvent}>
          <div className="event-form-top"><input autoFocus value={eventDraft.title} onChange={event => setEventDraft(current => ({ ...current, title: event.target.value }))} placeholder="事件名称" /><select value={eventDraft.type} onChange={event => setEventDraft(current => ({ ...current, type: event.target.value }))}><option value="deadline">Deadline</option><option value="range">持续时段</option><option value="plan">普通安排</option></select></div>
          <div className="event-form-bottom"><label>开始<input type="number" min="1" max="31" value={eventDraft.start} onChange={event => setEventDraft(current => ({ ...current, start: event.target.value }))}/></label><label>结束<input type="number" min="1" max="31" value={eventDraft.end} onChange={event => setEventDraft(current => ({ ...current, end: event.target.value }))}/></label><button type="submit">添加到日历</button></div>
        </form>
      </section>
    </div>}
  </>;
}

function WeekPlan() {
  const [priorities, setPriorities] = usePersistentState("winnie-week-priorities", [
    { id: 1, text: "整理工作台需求", done: true },
    { id: 2, text: "完成周计划原型", done: false },
    { id: 3, text: "运动 30 分钟", done: false }
  ]);
  const [weekStart, setWeekStart] = useState("2026-07-27");
  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekdayNames = ["周一","周二","周三","周四","周五","周六","周日"];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + index);
    return { date: localDateKey(date), day: String(date.getDate()).padStart(2, "0"), label: `${String(date.getDate()).padStart(2, "0")} ${weekdayNames[index]}` };
  });
  const [weekTasks, setWeekTasks] = usePersistentState("winnie-week-tasks", [
    { id: 1, day: "30 周四", text: "完成本周计划的第一版", done: false },
    { id: 2, day: "01 周六", text: "看电影，休息一下", done: false }
  ]);
  const [addingDay, setAddingDay] = useState(null);
  const [taskDraft, setTaskDraft] = useState("");
  const [swipedId, setSwipedId] = useState(null);
  const swipeStartX = useRef(null);
  const addPriority = () => setPriorities(current => [...current, { id: Date.now(), text: "新的重要事项", done: false }]);
  const autoGrow = event => {
    event.currentTarget.style.height = "auto";
    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
  };
  const startSwipe = event => { swipeStartX.current = event.touches[0].clientX; };
  const endSwipe = (event, id) => {
    if (swipeStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - swipeStartX.current;
    if (distance < -35) setSwipedId(id);
    else if (distance > 25) setSwipedId(null);
    swipeStartX.current = null;
  };
  const addWeekTask = (event, day) => {
    event.preventDefault();
    if (!taskDraft.trim()) return;
    setWeekTasks(current => [...current, { id: Date.now(), date: day.date, day: day.label, text: taskDraft.trim(), done: false }]);
    setTaskDraft("");
    setAddingDay(null);
  };
  const taskBelongsToDay = (task, day) => task.date ? task.date === day.date : (weekStart === "2026-07-27" && task.day.includes(day.day));
  const shiftWeek = amount => {
    const date = new Date(`${weekStart}T12:00:00`);
    date.setDate(date.getDate() + amount * 7);
    setWeekStart(localDateKey(date));
    setAddingDay(null);
  };
  return <>
    <PageIntro eyebrow="WEEK 31" icon="▤" title="周计划表" copy="先抓住这一周最重要的几件事。" />
    <section className="card focus-card"><div className="section-heading"><div><span className="section-kicker">THIS WEEK</span><h2>本周重要的事</h2></div><button className="priority-add" onClick={addPriority} aria-label="添加本周重要事项">＋</button></div>
      {priorities.map(item => <div className={item.done ? "editable-plan priority done" : "editable-plan priority"} key={item.id}>
        <textarea rows="1" value={item.text} onInput={autoGrow} onChange={event => setPriorities(v => v.map(x => x.id === item.id ? {...x,text:event.target.value}:x))} aria-label="编辑本周重要事项" />
        <button className="round-check" aria-label={item.done ? "取消完成" : "标记完成"} onClick={() => setPriorities(v => v.map(x => x.id === item.id ? {...x,done:!x.done}:x))} />
      </div>)}
    </section>
    <section className="card week-card"><div className="section-heading"><div><h2>{days[0].date.slice(5).replace("-"," 月 ")} 日 · {days[6].date.slice(5).replace("-"," 月 ")} 日</h2><small className="week-history-label">可切换查看最近周计划</small></div><div className="week-nav"><button onClick={()=>shiftWeek(-1)} aria-label="上一周">‹</button><button onClick={()=>shiftWeek(1)} aria-label="下一周">›</button></div></div>
      {days.map((day,index) => <div className={day.date === localDateKey() ? "week-row today" : "week-row"} key={day.date}><b>{day.label}</b><div className="week-day-tasks">
        {weekTasks.filter(task => taskBelongsToDay(task, day)).map(task => <div className={swipedId === task.id ? "swipe-task revealed" : "swipe-task"} key={task.id} onTouchStart={startSwipe} onTouchEnd={event => endSwipe(event, task.id)}>
          <button className="swipe-delete" onClick={() => { setWeekTasks(v => v.filter(x => x.id !== task.id)); setSwipedId(null); }}>删除</button>
          <div className={task.done ? "week-task done" : "week-task"}><button className="square-check" aria-label={task.done ? "取消完成" : "标记完成"} onClick={() => setWeekTasks(v => v.map(x => x.id === task.id ? {...x,done:!x.done}:x))}/><textarea rows="1" value={task.text} onInput={autoGrow} onChange={event => setWeekTasks(v => v.map(x => x.id === task.id ? {...x,text:event.target.value}:x))}/></div>
        </div>)}
        {addingDay === day.date && <form className="week-inline-add" onSubmit={event => addWeekTask(event, day)}><input autoFocus value={taskDraft} onChange={event => setTaskDraft(event.target.value)} placeholder={`添加${day.label.slice(3)}任务`} /><button type="submit">添加</button></form>}
      </div><button className="week-day-add" aria-label={`添加${day.label}任务`} onClick={() => { setAddingDay(current => current === day.date ? null : day.date); setTaskDraft(""); }}>＋</button></div>)}
    </section>
  </>;
}

function DayPlan({ items, setItems, taskDate, taskArchives }) {
  const [drafts, setDrafts] = useState({ 工作: "", 生活: "", 娱乐: "" });
  const [viewDate, setViewDate] = useState(taskDate);
  const [swipedId, setSwipedId] = useState(null);
  const swipeStartX = useRef(null);
  const startSwipe = event => { swipeStartX.current = event.touches[0].clientX; };
  const endSwipe = (event, id) => {
    if (swipeStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - swipeStartX.current;
    if (distance < -35) setSwipedId(id);
    else if (distance > 25) setSwipedId(null);
    swipeStartX.current = null;
  };
  const addItem = (event, group) => {
    event.preventDefault();
    const title = drafts[group].trim();
    if (!title) return;
    setItems(current => [...current, { id: Date.now(), text: title, group, done: false }]);
    setDrafts(current => ({ ...current, [group]: "" }));
  };
  useEffect(() => setViewDate(taskDate), [taskDate]);
  const viewingToday = viewDate === taskDate;
  const visibleItems = viewingToday ? items : (taskArchives[viewDate] || []);
  return <>
    <PageIntro eyebrow="THURSDAY · JUL 30" icon="☑" title="日计划表" copy="把今天拆成清楚、可以完成的小步骤。" />
    <section className="card plan-date-nav"><div><span className="section-kicker">PLAN ARCHIVE</span><h2>{viewingToday ? "今天的计划" : "历史计划回顾"}</h2></div><input type="date" value={viewDate} max={taskDate} onChange={event => setViewDate(event.target.value)} /></section>
    {["工作","生活","娱乐"].map(group => <section className="card day-section" key={group}><div className="section-heading"><h2>{group}</h2><span className="count-pill">{visibleItems.filter(x=>x.group===group&&x.done).length}/{visibleItems.filter(x=>x.group===group).length}</span></div>
      {visibleItems.filter(x=>x.group===group).map(item=><div className={swipedId===item.id?"swipe-task day-swipe revealed":"swipe-task day-swipe"} key={item.id} onTouchStart={viewingToday?startSwipe:undefined} onTouchEnd={viewingToday?event=>endSwipe(event,item.id):undefined}><button className="swipe-delete" onClick={()=>{setItems(v=>v.filter(x=>x.id!==item.id));setSwipedId(null);}}>删除</button><div className={item.done?"editable-plan done":"editable-plan"}><input readOnly={!viewingToday} value={item.text} onChange={event=>setItems(v=>v.map(x=>x.id===item.id?{...x,text:event.target.value}:x))}/><button disabled={!viewingToday} className="round-check" aria-label={item.done?"取消完成":"标记完成"} onClick={()=>setItems(v=>v.map(x=>x.id===item.id?{...x,done:!x.done}:x))}/></div></div>)}
      {viewingToday && <form className="inline-add-form compact" onSubmit={event => addItem(event, group)}><input value={drafts[group]} onChange={event=>setDrafts(current=>({...current,[group]:event.target.value}))} placeholder={`添加${group}任务`} /><button type="submit">添加</button></form>}
    </section>)}
  </>;
}

function ReminderPage() {
  const [reminders, setReminders] = usePersistentState("winnie-reminders", [
    { title:"提交项目第一版", date:"8 月 3 日", on:true },
    { title:"预约牙医", date:"8 月 8 日", on:false }
  ]);
  const addReminder = () => {
    const title = window.prompt("提醒事项名称");
    if (!title?.trim()) return;
    const date = window.prompt("提醒日期，例如：8 月 12 日") || "日期待定";
    setReminders(current => [...current, { title: title.trim(), date, on: true }]);
  };
  return <>
    <PageIntro eyebrow="DON'T FORGET" icon="♢" title="提醒事项" copy="这里只记录重要日期，暂不发送系统推送。" />
    <section className="card">
      {reminders.map((item,index)=><div className="reminder-row" key={item.title}><span className="reminder-bell">♢</span><div><b>{item.title}</b><small>{item.date}</small></div><button className={item.on?"toggle on":"toggle"} onClick={()=>setReminders(v=>v.map((x,i)=>i===index?{...x,on:!x.on}:x))}><span /></button></div>)}
      <button className="primary-button" onClick={addReminder}>＋ 添加提醒</button>
    </section>
  </>;
}

const habitSeed = [
  { id:"water", icon:"♢", name:"喝水", color:"blue", days:[1,2,3,5,7,8,10,12,14,15,18,20,23,25,28,29] },
  { id:"english", icon:"A", name:"英语学习", color:"lilac", days:[2,3,4,8,9,10,15,16,17,22,23,24,29] },
  { id:"sport", icon:"♥", name:"运动", color:"coral", days:[1,4,7,11,14,18,21,25,28] }
];

const habitColorOptions = [
  { value: "coral", label: "樱花粉" },
  { value: "blue", label: "雾霾蓝" },
  { value: "lilac", label: "淡紫色" },
  { value: "mint", label: "薄荷绿" },
  { value: "peach", label: "蜜桃色" },
  { value: "butter", label: "奶油黄" },
  { value: "mauve", label: "灰豆沙" },
  { value: "sage", label: "鼠尾草绿" }
];

function HabitPage({ habits, setHabits }) {
  const today = 30;
  const todayKey = "2026-07-30";
  const [habitMonth, setHabitMonth] = useState("2026-07");
  const [habitYear, habitMonthNumber] = habitMonth.split("-").map(Number);
  const habitMonthDays = new Date(habitYear, habitMonthNumber, 0).getDate();
  const habitMonthOffset = (new Date(habitYear, habitMonthNumber - 1, 1).getDay() + 6) % 7;
  const habitDateKey = day => `${habitMonth}-${String(day).padStart(2, "0")}`;
  const datesForHabit = habit => habit.dates || (habit.days || []).map(day => `2026-07-${String(day).padStart(2, "0")}`);
  const habitHit = (habit, day) => datesForHabit(habit).includes(habitDateKey(day));
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const longPressTimer = useRef(null);
  const [habitDraft, setHabitDraft] = useState({ name: "", icon: "✨", color: "coral" });
  const toggleToday = id => setHabits(v=>v.map(h=>{
    if (h.id !== id) return h;
    const dates = datesForHabit(h);
    const checked = dates.includes(todayKey);
    return {...h, dates:checked ? dates.filter(date=>date!==todayKey) : [...dates,todayKey], days:checked ? h.days.filter(d=>d!==today) : [...h.days,today]};
  }));
  const toggleDay = (id, day) => setHabits(v => v.map(h => {
    if (h.id !== id) return h;
    const dateKey = habitDateKey(day);
    const dates = datesForHabit(h);
    const checked = dates.includes(dateKey);
    const legacyDays = habitMonth === "2026-07" ? (checked ? h.days.filter(value => value !== day) : [...h.days, day]) : h.days;
    return { ...h, days: legacyDays, dates: checked ? dates.filter(date => date !== dateKey) : [...dates, dateKey] };
  }));
  const addHabit = event => {
    event.preventDefault();
    if (!habitDraft.name.trim()) return;
    setHabits(current => [...current, { id: `habit-${Date.now()}`, icon: habitDraft.icon, name: habitDraft.name.trim(), color: habitDraft.color, days: [], dates: [] }]);
    setHabitDraft({ name: "", icon: "✨", color: "coral" });
    setShowHabitForm(false);
  };
  const updateHabit = (id, patch) => setHabits(current => current.map(habit => habit.id === id ? { ...habit, ...patch } : habit));
  const moveHabit = (from, target) => setHabits(current => {
    if (from === target || from < 0 || target < 0 || target >= current.length) return current;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    return next;
  });
  const startHabitDrag = (event, index) => {
    const handle = event.currentTarget;
    longPressTimer.current = window.setTimeout(() => {
      setDragIndex(index);
      handle.setPointerCapture?.(event.pointerId);
      navigator.vibrate?.(25);
    }, 380);
  };
  const moveHabitDrag = event => {
    if (dragIndex === null) return;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-habit-index]");
    const target = Number(row?.dataset.habitIndex);
    if (Number.isInteger(target) && target !== dragIndex) {
      moveHabit(dragIndex, target);
      setDragIndex(target);
    }
  };
  const endHabitDrag = () => {
    window.clearTimeout(longPressTimer.current);
    setDragIndex(null);
  };
  const deleteHabit = id => {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    setHabits(current => current.filter(habit => habit.id !== id));
    setPendingDelete(null);
  };
  return <>
    <PageIntro eyebrow="LITTLE STEPS" icon="✿" title="习惯打卡" copy="写下今天的坚持，看见一个月里的点滴积累。" />
    <section className="card"><div className="section-heading"><h2>今日打卡</h2><div className="habit-heading-actions"><button className={editMode ? "mini-add active" : "mini-add secondary"} onClick={() => setEditMode(current => !current)}>{editMode ? "完成编辑" : "编辑"}</button><button className="mini-add" onClick={() => setShowHabitForm(current => !current)}>{showHabitForm ? "收起" : "＋ 新习惯"}</button></div></div>
      {showHabitForm && <form className="habit-create-form" onSubmit={addHabit}>
        <input value={habitDraft.name} onChange={event => setHabitDraft(current => ({ ...current, name: event.target.value }))} placeholder="习惯名称" />
        <div className="habit-options"><label>图标<select value={habitDraft.icon} onChange={event => setHabitDraft(current => ({ ...current, icon: event.target.value }))}>{["✨","💧","📖","🏃","🧘","🥗","💊","🌙","☀️","🎨"].map(icon => <option key={icon}>{icon}</option>)}</select></label><label>颜色<select value={habitDraft.color} onChange={event => setHabitDraft(current => ({ ...current, color: event.target.value }))}>{habitColorOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div>
        <button type="submit">创建习惯</button>
      </form>}
      {editMode && <div className="habit-edit-list">{habits.map((habit, index) => <div className={dragIndex === index ? "habit-edit-row dragging" : "habit-edit-row"} data-habit-index={index} key={habit.id}><button className="habit-drag-handle" aria-label={`长按拖动${habit.name}`} onPointerDown={event => startHabitDrag(event,index)} onPointerMove={moveHabitDrag} onPointerUp={endHabitDrag} onPointerCancel={endHabitDrag}>⋮⋮</button><input value={habit.name} onChange={event => updateHabit(habit.id, { name: event.target.value })}/><select value={habit.icon} onChange={event => updateHabit(habit.id, { icon: event.target.value })}>{["✨","💧","📖","🏃","🧘","🥗","💊","🌙","☀️","🎨"].map(icon => <option key={icon}>{icon}</option>)}</select><select value={habit.color} onChange={event => updateHabit(habit.id, { color: event.target.value })}>{habitColorOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select><button className={pendingDelete === habit.id ? "confirm-delete" : ""} onClick={() => deleteHabit(habit.id)}>{pendingDelete === habit.id ? "确认" : "删除"}</button></div>)}</div>}
      <div className="habit-today">{habits.map(h=><button key={h.id} disabled={!editMode} className={`${h.days.includes(today)?"habit-pill checked":"habit-pill"}${editMode ? " editable" : ""}`} onClick={()=>toggleToday(h.id)}><span className={`checkin-icon ${h.color}`}>{h.icon}</span><b>{h.name}</b><small>{editMode ? (h.days.includes(today)?"点击取消":"点击打卡") : (h.days.includes(today)?"今天已打卡":"未打卡")}</small></button>)}</div>
    </section>
    <section className="card heatmap-card"><div className="section-heading"><div><span className="section-kicker">HABIT ARCHIVE</span><h2>月度打卡</h2></div><input className="month-picker" type="month" value={habitMonth} onChange={event => setHabitMonth(event.target.value)} /></div>
      {habits.map(h=><div className="habit-calendar" key={h.id}><div className="habit-title"><span className={`checkin-icon ${h.color}`}>{h.icon}</span><b>{h.name}</b><small>{Array.from({length:habitMonthDays},(_,index)=>habitHit(h,index+1)).filter(Boolean).length} 天</small></div>
        <div className="heat-weekdays">{["一","二","三","四","五","六","日"].map(day => <span key={day}>{day}</span>)}</div>
        <div className={`heat-grid ${h.color}`}>
          {Array.from({length:habitMonthOffset},(_,index)=><span className="blank" key={`blank-${index}`} />)}
          {Array.from({length:habitMonthDays},(_,i)=><button type="button" disabled={!editMode} onClick={() => toggleDay(h.id, i + 1)} className={`${habitHit(h,i+1)?"hit ":""}${habitDateKey(i+1)===todayKey?"today ":""}${editMode?"editable":""}`} key={i}>{i+1}</button>)}
        </div>
      </div>)}
    </section>
  </>;
}

function DataPage({ health, setHealth }) {
  const [type, setType] = useState("早间体重");
  const [value, setValue] = useState("");
  const [recordDate, setRecordDate] = useState("2026-07-30");
  const [historyMonth, setHistoryMonth] = useState("2026-07");
  const [hovered, setHovered] = useState(null);
  const [trendDays, setTrendDays] = useState(7);
  const [trendStart, setTrendStart] = useState(24);
  const [selectedHistoryDay, setSelectedHistoryDay] = useState(30);
  const [historyDraft, setHistoryDraft] = useState("");
  const keyMap = { "早间体重": "morning", "晚间体重": "evening", "睡眠时长": "sleep" };
  const historyMap = { "早间体重": "morningHistory", "晚间体重": "eveningHistory", "睡眠时长": "sleepHistory" };
  const historyKey = historyMap[type];
  const [historyYear, historyMonthNumber] = historyMonth.split("-").map(Number);
  const daysInHistoryMonth = new Date(historyYear, historyMonthNumber, 0).getDate();
  const historyOffset = (new Date(historyYear, historyMonthNumber - 1, 1).getDay() + 6) % 7;
  const recordKeyFor = day => `${historyMonth}-${String(day).padStart(2, "0")}`;
  const normalizeMonth = raw => {
    if (raw?.length === 31) return raw;
    const month = Array(31).fill(null);
    (raw || []).slice(-7).forEach((number, index) => { month[23 + index] = number; });
    return month;
  };
  const legacyMonth = normalizeMonth(health[historyKey]);
  const monthData = Array.from({ length: daysInHistoryMonth }, (_, index) => {
    const saved = health.records?.[recordKeyFor(index + 1)]?.[keyMap[type]];
    if (Number.isFinite(saved)) return saved;
    return historyMonth === "2026-07" ? legacyMonth[index] : null;
  });
  const maxTrendStart = Math.max(0, daysInHistoryMonth - trendDays);
  const safeTrendStart = Math.min(trendStart, maxTrendStart);
  const data = monthData.slice(safeTrendStart, safeTrendStart + trendDays);
  const dates = Array.from({ length: Math.min(trendDays, daysInHistoryMonth) }, (_, index) => safeTrendStart + index + 1);
  const unit = type === "睡眠时长" ? "小时" : "kg";
  const validValues = data.filter(value => Number.isFinite(value));
  const monthValidValues = monthData.filter(value => Number.isFinite(value));
  const minimum = validValues.length ? Math.min(...validValues) : 0;
  const maximum = validValues.length ? Math.max(...validValues) : 1;
  const valueRange = maximum - minimum || 1;
  const yFor = number => 90 - ((number - minimum) / valueRange) * 65;
  const xFor = index => 36 + index * (246 / Math.max(1, data.length - 1));
  const middleValue = minimum + valueRange / 2;
  const selectedDateKey = recordKeyFor(selectedHistoryDay);
  const selectedDayRecord = health.records?.[selectedDateKey];
  const selectedMorning = Number.isFinite(selectedDayRecord?.morning) ? selectedDayRecord.morning : (historyMonth === "2026-07" ? normalizeMonth(health.morningHistory)[selectedHistoryDay - 1] : null);
  const selectedEvening = Number.isFinite(selectedDayRecord?.evening) ? selectedDayRecord.evening : (historyMonth === "2026-07" ? normalizeMonth(health.eveningHistory)[selectedHistoryDay - 1] : null);
  const selectedSleep = Number.isFinite(selectedDayRecord?.sleep) ? selectedDayRecord.sleep : (historyMonth === "2026-07" ? normalizeMonth(health.sleepHistory)[selectedHistoryDay - 1] : null);
  const selectedWeightDifference = Number.isFinite(selectedMorning) && Number.isFinite(selectedEvening)
    ? selectedEvening - selectedMorning
    : null;
  useEffect(() => {
    setTrendStart(Math.max(0, 31 - trendDays));
  }, [trendDays]);
  useEffect(() => {
    setHistoryDraft(Number.isFinite(monthData[selectedHistoryDay - 1]) ? String(monthData[selectedHistoryDay - 1]) : "");
  }, [type, historyMonth]);
  const saveData = () => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      window.alert("请输入有效的数字。");
      return;
    }
    const key = keyMap[type];
    const dayIndex = Number(recordDate.slice(-2)) - 1;
    setHealth(current => {
      const nextHistory = normalizeMonth(current[historyKey]);
      if (recordDate.startsWith("2026-07") && dayIndex >= 0 && dayIndex < 31) nextHistory[dayIndex] = numeric;
      return {
        ...current,
        ...(recordDate === "2026-07-30" ? { [key]: String(numeric) } : {}),
        [historyKey]: nextHistory,
        records: { ...(current.records || {}), [recordDate]: { ...(current.records?.[recordDate] || {}), [key]: numeric } },
        lastRecordDate: recordDate
      };
    });
    setHistoryMonth(recordDate.slice(0, 7));
    setSelectedHistoryDay(Number(recordDate.slice(-2)));
    setValue("");
  };
  const deleteRecord = dayIndex => {
    setHealth(current => {
      const nextHistory = normalizeMonth(current[historyKey]);
      if (historyMonth === "2026-07") nextHistory[dayIndex] = null;
      const dateKey = recordKeyFor(dayIndex + 1);
      const nextRecords = { ...(current.records || {}), [dateKey]: { ...(current.records?.[dateKey] || {}), [keyMap[type]]: null } };
      const latest = dateKey === "2026-07-30" ? "" : current[keyMap[type]];
      return { ...current, [historyKey]: nextHistory, records: nextRecords, [keyMap[type]]: latest };
    });
  };
  const openHistoryDay = day => {
    setSelectedHistoryDay(day);
    setHistoryDraft(Number.isFinite(monthData[day - 1]) ? String(monthData[day - 1]) : "");
  };
  const saveHistoryDay = () => {
    const numeric = Number(historyDraft);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      window.alert("请输入有效的数字。");
      return;
    }
    setHealth(current => {
      const nextHistory = normalizeMonth(current[historyKey]);
      if (historyMonth === "2026-07") nextHistory[selectedHistoryDay - 1] = numeric;
      const dateKey = recordKeyFor(selectedHistoryDay);
      return { ...current, [historyKey]: nextHistory, records: { ...(current.records || {}), [dateKey]: { ...(current.records?.[dateKey] || {}), [keyMap[type]]: numeric } }, ...(dateKey === "2026-07-30" ? { [keyMap[type]]: String(numeric) } : {}) };
    });
  };
  return <>
    <PageIntro eyebrow="BODY NOTES" icon="⌁" title="数据打卡" copy="记录早晚体重与睡眠时长，看见趋势变化。" />
    <section className="current-data-strip">
      <div><small>所选日早间</small><b>{Number.isFinite(selectedMorning) ? `${selectedMorning} kg` : "未记录"}</b></div>
      <div><small>所选日晚间</small><b>{Number.isFinite(selectedEvening) ? `${selectedEvening} kg` : "未记录"}</b></div>
      <div><small>所选日睡眠</small><b>{Number.isFinite(selectedSleep) ? `${selectedSleep} h` : "未记录"}</b></div>
      <div><small>所选日早晚差</small><b>{selectedWeightDifference === null ? "待完整记录" : `${selectedWeightDifference >= 0 ? "+" : ""}${selectedWeightDifference.toFixed(1)} kg`}</b></div>
    </section>
    <section className="card data-form"><div className="section-heading"><h2>录入数据</h2><span className="count-pill">7 月 30 日</span></div>
      <div className="segmented">{["早间体重","晚间体重","睡眠时长"].map(x=><button className={type===x?"active":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div>
      <label><span>记录日期</span><div className="value-field"><input type="date" value={recordDate} onChange={event => setRecordDate(event.target.value)} /></div></label>
      <label><span>{type}</span><div className="value-field"><input value={value} onChange={e=>setValue(e.target.value)} inputMode="decimal" placeholder={type==="睡眠时长"?"例如 7.5":"例如 52.6"} /><b>{type==="睡眠时长"?"小时":"kg"}</b></div></label>
      <button className="primary-button" onClick={saveData}>保存今日数据</button>
    </section>
    <section className="card chart-card"><div className="section-heading"><div><span className="section-kicker">TREND</span><h2>{type}趋势</h2></div><div className="chart-legend"><i />{unit}</div></div>
      <div className="trend-range-tabs">{[7,14,31].map(days => <button className={trendDays === days ? "active" : ""} onClick={() => setTrendDays(days)} key={days}>{days === 31 ? "整月" : `${days} 日`}</button>)}</div>
      <svg viewBox="0 0 300 120" role="img" aria-label={`${type}趋势图`} onMouseLeave={() => setHovered(null)}><g className="grid-lines"><line x1="36" y1="20" x2="282" y2="20"/><line x1="36" y1="55" x2="282" y2="55"/><line x1="36" y1="90" x2="282" y2="90"/></g>
        <g className="y-axis-labels"><text x="31" y="23" textAnchor="end">{maximum.toFixed(1)}</text><text x="31" y="58" textAnchor="end">{middleValue.toFixed(1)}</text><text x="31" y="93" textAnchor="end">{minimum.toFixed(1)}</text></g>
        {data.slice(0, -1).map((number, index) => Number.isFinite(number) && Number.isFinite(data[index + 1]) ? <line className="data-segment" key={index} x1={xFor(index)} y1={yFor(number)} x2={xFor(index + 1)} y2={yFor(data[index + 1])} /> : null)}
        {data.map((number,index) => Number.isFinite(number) ? <circle className="data-node" cx={xFor(index)} cy={yFor(number)} r={trendDays === 31 ? "3.5" : "5"} key={index} onMouseEnter={() => setHovered(index)} /> : null)}
        {hovered !== null && Number.isFinite(data[hovered]) && <g className="chart-tooltip"><rect x={Math.min(225, Math.max(3, xFor(hovered) - 34))} y={Math.max(1, yFor(data[hovered]) - 31)} width="68" height="22" rx="7"/><text x={Math.min(259, Math.max(37, xFor(hovered)))} y={Math.max(15, yFor(data[hovered]) - 16)} textAnchor="middle">{`${historyMonthNumber}/${dates[hovered]} · ${data[hovered]} ${unit}`}</text></g>}
      </svg>
      <div className="chart-labels"><span>{dates[0]} 日</span><span>{dates[Math.floor(dates.length / 2)]} 日</span><span>{dates[dates.length - 1]} 日</span></div>
      <div className="trend-slider"><div><span>{historyMonthNumber} 月 {safeTrendStart + 1} 日</span><span>{historyMonthNumber} 月 {Math.min(daysInHistoryMonth, safeTrendStart + trendDays)} 日</span></div><input type="range" min="0" max={maxTrendStart} value={safeTrendStart} disabled={trendDays >= daysInHistoryMonth} onChange={event => setTrendStart(Number(event.target.value))}/></div>
    </section>
    <section className="card history-card"><div className="section-heading"><div><span className="section-kicker">ARCHIVE</span><h2>历史数据月历</h2></div><input className="month-picker" type="month" value={historyMonth} onChange={event => { setHistoryMonth(event.target.value); setSelectedHistoryDay(1); setTrendStart(0); }} /></div>
      <div className="data-weekdays">{["一","二","三","四","五","六","日"].map(day => <span key={day}>{day}</span>)}</div>
      <div className="data-month-grid">{Array.from({length:historyOffset},(_,index)=><i key={`blank-${index}`}/>) }{monthData.map((number,index) => <button className={`${selectedHistoryDay === index + 1 ? "selected " : ""}${Number.isFinite(number) ? "has-value" : ""}`} onClick={() => openHistoryDay(index + 1)} key={index}><b>{index + 1}</b><small>{Number.isFinite(number) ? `${number}${type === "睡眠时长" ? "h" : ""}` : "—"}</small></button>)}</div>
      <div className="history-editor"><div><span>{historyYear} 年 {historyMonthNumber} 月 {selectedHistoryDay} 日 · {type}</span><div className="value-field"><input value={historyDraft} onChange={event => setHistoryDraft(event.target.value)} inputMode="decimal" placeholder="输入数值"/><b>{unit}</b></div></div><button className="save-history" onClick={saveHistoryDay}>保存修改</button><button className="delete-history" onClick={() => { deleteRecord(selectedHistoryDay - 1); setHistoryDraft(""); }}>删除数据</button></div>
      <p className="archive-note">数据按完整日期保存在当前工作台中，切换年月即可回溯；开启云同步后也会同步这份日期档案。</p>
    </section>
    <section className="stats-row"><div><small>本周变化</small><b>−0.3 kg</b></div><div><small>平均睡眠</small><b>7.3 h</b></div></section>
  </>;
}

function MealPage({ mealRecords, setMealRecords }) {
  const mealKey = { "早餐": "breakfast", "午餐": "lunch", "晚餐": "dinner" };
  const addPhoto=(meal,file)=>{
    if (!file) return;
    const key = mealKey[meal];
    setMealRecords(current => ({ ...current, [key]: { done: true, photo: URL.createObjectURL(file) } }));
  };
  return <>
    <PageIntro eyebrow="MEAL DIARY" icon="♨" title="吃饭打卡" copy="用照片收藏今天认真吃过的每一餐。" />
    <section className="meal-day-summary"><div><span>30</span><small>七月 · 星期四</small></div><strong>{Object.values(mealRecords).filter(item => item.done).length}/3</strong></section>
    {["早餐","午餐","晚餐"].map((meal,index)=><section className="card photo-meal" key={meal}><div className="meal-title"><span className="meal-icon">{["☀","◐","☾"][index]}</span><div><h2>{meal}</h2><small>{["08:10","12:30","18:40"][index]}</small></div></div>
      {mealRecords[mealKey[meal]].photo?<div className="photo-preview"><img src={mealRecords[mealKey[meal]].photo} alt={`${meal}照片`} /><label>更换照片<input type="file" accept="image/*" onChange={e=>addPhoto(meal,e.target.files?.[0])}/></label></div>:<label className="photo-upload"><span>＋</span><b>上传{meal}照片</b><small>{mealRecords[mealKey[meal]].done ? "首页已完成记录，可继续补照片" : "可以拍照，也可以从相册选择"}</small><input type="file" accept="image/*" capture="environment" onChange={e=>addPhoto(meal,e.target.files?.[0])}/></label>}
    </section>)}
  </>;
}
