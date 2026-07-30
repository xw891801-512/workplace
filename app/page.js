"use client";

import { useEffect, useMemo, useState } from "react";

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
      { icon: "✿", label: "习惯" },
      { icon: "⌁", label: "数据" },
      { icon: "♨", label: "吃饭" }
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

export default function TodayPage() {
  const [activeNav, setActiveNav] = useState("今天");
  const [openGroup, setOpenGroup] = useState(null);
  const [tasks, setTasks] = useState(starterTasks);
  const [habits, setHabits] = useState(habitSeed);
  const [health, setHealth] = useState({
    morning: "52.6",
    evening: "",
    sleep: "7.3",
    morningHistory: [52.9, 52.7, 52.8, 52.6, 52.5, 52.7, 52.6],
    eveningHistory: [53.2, 53.1, 53.0, 52.9, 52.8, 52.9, 52.8],
    sleepHistory: [7.1, 6.8, 7.5, 7.2, 8.0, 7.4, 7.3]
  });
  const [mealRecords, setMealRecords] = useState({
    breakfast: { done: true, photo: null },
    lunch: { done: false, photo: null },
    dinner: { done: false, photo: null }
  });
  const [newTask, setNewTask] = useState("");
  const [activeGroup, setActiveGroup] = useState("全部");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("winnie-workbench") || "null");
      if (saved?.tasks) setTasks(saved.tasks);
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
    localStorage.setItem("winnie-workbench", JSON.stringify({ tasks, habits, health, mealRecords: safeMeals }));
  }, [tasks, habits, health, mealRecords, storageReady]);

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
        <button className="brand" aria-label="工作台首页" onClick={() => { setActiveNav("今天"); setOpenGroup(null); }}>W</button>
        <nav>
          <button
            className={activeNav === "今天" ? "nav-button active" : "nav-button"}
            onClick={() => { setActiveNav("今天"); setOpenGroup(null); }}
            aria-label="今天"
          >
            <span>⌂</span><small>今天</small>
          </button>
          {navGroups.map((group) => (
            <div className={openGroup === group.label ? "nav-group open" : "nav-group"} key={group.label}>
              <button
                className={group.items.some(item => item.label === activeNav) ? "nav-button nav-parent active" : "nav-button nav-parent"}
                onClick={() => setOpenGroup(current => current === group.label ? null : group.label)}
                aria-expanded={openGroup === group.label}
                aria-label={`${group.label}菜单`}
              >
                <span>{group.label === "计划" ? "▤" : "✿"}</span>
                <small>{group.label}</small>
                <i>{openGroup === group.label ? "−" : "+"}</i>
              </button>
              {openGroup === group.label && <div className="nav-children">{group.items.map((item) => (
                <button
                  key={item.label}
                  className={activeNav === item.label ? "nav-child active" : "nav-child"}
                  onClick={() => setActiveNav(item.label)}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span>{item.icon}</span>
                  <small>{item.label}</small>
                </button>
              ))}</div>}
            </div>
          ))}
        </nav>
        <div className="avatar" aria-label="用户头像">温</div>
      </aside>

      {activeNav === "今天" ? <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">THURSDAY · JUL 30</p>
            <h1>早上好，Winnie <span>☁</span></h1>
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
                  <small>{task.group}</small>
                </span>
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

      </section> : <FeaturePage page={activeNav} tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} health={health} setHealth={setHealth} mealRecords={mealRecords} setMealRecords={setMealRecords} />}
    </main>
  );
}

function FeaturePage({ page, tasks, setTasks, habits, setHabits, health, setHealth, mealRecords, setMealRecords }) {
  const pageMap = {
    "月日历": <MonthPlan />,
    "周计划": <WeekPlan />,
    "日计划": <DayPlan items={tasks} setItems={setTasks} />,
    "提醒": <ReminderPage />,
    "习惯": <HabitPage habits={habits} setHabits={setHabits} />,
    "数据": <DataPage health={health} setHealth={setHealth} />,
    "吃饭": <MealPage mealRecords={mealRecords} setMealRecords={setMealRecords} />
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
  const [plans, setPlans] = useState({ 30: ["完成工作台页面规划"] });
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const addPlan = () => {
    const title = window.prompt(`为 7 月 ${selected} 日添加安排`);
    if (title?.trim()) setPlans(current => ({ ...current, [selected]: [...(current[selected] || []), title.trim()] }));
  };
  return <>
    <PageIntro eyebrow="PLAN · JULY" icon="▦" title="月日历" copy="把重要安排和大的 deadline 放进这个月。" />
    <section className="card calendar-card">
      <div className="section-heading"><h2>2026 年 7 月</h2><span className="count-pill">今天 30</span></div>
      <div className="week-labels">{["一","二","三","四","五","六","日"].map(d => <span key={d}>{d}</span>)}</div>
      <div className="month-grid">
        <i /><i />
        {days.map(day => <button key={day} className={`${selected === day ? "selected " : ""}${[4,12,18,27].includes(day) ? "has-plan" : ""}`} onClick={() => setSelected(day)}>{day}</button>)}
      </div>
    </section>
    <section className="card agenda-card">
      <span className="section-kicker">SELECTED DAY</span><h2>7 月 {selected} 日</h2>
      {(plans[selected] || []).map((plan, index) => <div className="agenda-item" key={`${plan}-${index}`}><span className="agenda-dot work" /><div><b>{plan}</b><small>工作 · 全天</small></div></div>)}
      {!plans[selected]?.length && <p className="empty-note">这一天还没有安排。</p>}
      <button className="primary-button" onClick={addPlan}>＋ 添加月度安排</button>
    </section>
  </>;
}

function WeekPlan() {
  const initial = ["整理工作台需求","完成周计划原型","运动 30 分钟","整理娱乐收藏"];
  const [items, setItems] = useState(initial.map((text, id) => ({ id, text, done: id === 0 })));
  return <>
    <PageIntro eyebrow="WEEK 31" icon="▤" title="周计划表" copy="先抓住这一周最重要的几件事。" />
    <section className="card focus-card"><span className="section-kicker">THIS WEEK</span><h2>本周三件重要的事</h2>
      {items.slice(0,3).map(item => <button className={item.done ? "plan-line done" : "plan-line"} key={item.id} onClick={() => setItems(v => v.map(x => x.id === item.id ? {...x,done:!x.done}:x))}><span>{item.done ? "✓" : ""}</span>{item.text}</button>)}
    </section>
    <section className="card week-card"><div className="section-heading"><h2>7.27 — 8.2</h2><span className="count-pill">1/4</span></div>
      {["一 27","二 28","三 29","四 30","五 31","六 01","日 02"].map((day,index) => <div className={index === 3 ? "week-row today" : "week-row"} key={day}><b>{day}</b><span>{index === 3 ? "完成本周计划的第一版" : index === 5 ? "看电影，休息一下" : "＋ 添加任务"}</span></div>)}
    </section>
  </>;
}

function DayPlan({ items, setItems }) {
  const addItem = group => {
    const title = window.prompt(`添加${group}任务`);
    if (title?.trim()) setItems(current => [...current, { id: Date.now(), text: title.trim(), group, done: false }]);
  };
  return <>
    <PageIntro eyebrow="THURSDAY · JUL 30" icon="☑" title="日计划表" copy="把今天拆成清楚、可以完成的小步骤。" />
    {["工作","生活","娱乐"].map(group => <section className="card day-section" key={group}><div className="section-heading"><h2>{group}</h2><span className="count-pill">{items.filter(x=>x.group===group&&x.done).length}/{items.filter(x=>x.group===group).length}</span></div>
      {items.filter(x=>x.group===group).map(item=><button className={item.done?"plan-line done":"plan-line"} key={item.id} onClick={()=>setItems(v=>v.map(x=>x.id===item.id?{...x,done:!x.done}:x))}><span>{item.done?"✓":""}</span>{item.text}</button>)}
      <button className="soft-button" onClick={() => addItem(group)}>＋ 添加{group}任务</button>
    </section>)}
  </>;
}

function ReminderPage() {
  const [reminders, setReminders] = useState([
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

function HabitPage({ habits, setHabits }) {
  const today = 30;
  const toggleToday = id => setHabits(v=>v.map(h=>h.id===id?{...h,days:h.days.includes(today)?h.days.filter(d=>d!==today):[...h.days,today]}:h));
  const addHabit = () => {
    const name = window.prompt("新习惯名称");
    if (name?.trim()) setHabits(current => [...current, { id: `habit-${Date.now()}`, icon: "✦", name: name.trim(), color: "coral", days: [] }]);
  };
  return <>
    <PageIntro eyebrow="LITTLE STEPS" icon="✿" title="习惯打卡" copy="写下今天的坚持，看见一个月里的点滴积累。" />
    <section className="card"><div className="section-heading"><h2>今日打卡</h2><button className="mini-add" onClick={addHabit}>＋ 新习惯</button></div>
      <div className="habit-today">{habits.map(h=><button key={h.id} className={h.days.includes(today)?"habit-pill checked":"habit-pill"} onClick={()=>toggleToday(h.id)}><span className={`checkin-icon ${h.color}`}>{h.icon}</span><b>{h.name}</b><small>{h.days.includes(today)?"今天已打卡":"点击打卡"}</small></button>)}</div>
    </section>
    <section className="card heatmap-card"><div className="section-heading"><div><span className="section-kicker">JULY</span><h2>本月打卡</h2></div><span className="count-pill">30 天</span></div>
      {habits.map(h=><div className="habit-calendar" key={h.id}><div className="habit-title"><span className={`checkin-icon ${h.color}`}>{h.icon}</span><b>{h.name}</b><small>{h.days.length} 天</small></div><div className={`heat-grid ${h.color}`}>{Array.from({length:31},(_,i)=><span className={h.days.includes(i+1)?"hit":""} key={i}>{i+1}</span>)}</div></div>)}
    </section>
  </>;
}

function DataPage({ health, setHealth }) {
  const [type,setType]=useState("早间体重");
  const [value,setValue]=useState("");
  const keyMap = { "早间体重": "morning", "晚间体重": "evening", "睡眠时长": "sleep" };
  const historyMap = { "早间体重": "morningHistory", "晚间体重": "eveningHistory", "睡眠时长": "sleepHistory" };
  const data = health[type === "晚间体重" ? "eveningHistory" : "morningHistory"];
  const points = data.map((v,i)=>`${18+i*42},${88-(v-52.4)*90}`).join(" ");
  const saveData = () => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      window.alert("请输入有效的数字。");
      return;
    }
    const key = keyMap[type];
    const historyKey = historyMap[type];
    setHealth(current => ({ ...current, [key]: String(numeric), [historyKey]: [...current[historyKey].slice(1), numeric] }));
    setValue("");
  };
  return <>
    <PageIntro eyebrow="BODY NOTES" icon="⌁" title="数据打卡" copy="记录早晚体重与睡眠时长，看见趋势变化。" />
    <section className="current-data-strip">
      <div><small>早间体重</small><b>{health.morning || "—"} kg</b></div>
      <div><small>晚间体重</small><b>{health.evening ? `${health.evening} kg` : "未记录"}</b></div>
      <div><small>睡眠</small><b>{health.sleep || "—"} h</b></div>
    </section>
    <section className="card data-form"><div className="section-heading"><h2>录入数据</h2><span className="count-pill">7 月 30 日</span></div>
      <div className="segmented">{["早间体重","晚间体重","睡眠时长"].map(x=><button className={type===x?"active":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div>
      <label><span>{type}</span><div className="value-field"><input value={value} onChange={e=>setValue(e.target.value)} inputMode="decimal" placeholder={type==="睡眠时长"?"例如 7.5":"例如 52.6"} /><b>{type==="睡眠时长"?"小时":"kg"}</b></div></label>
      <button className="primary-button" onClick={saveData}>保存今日数据</button>
    </section>
    <section className="card chart-card"><div className="section-heading"><div><span className="section-kicker">7 DAYS</span><h2>体重趋势</h2></div><div className="chart-legend"><i />早间</div></div>
      <svg viewBox="0 0 300 120" role="img" aria-label="七日体重趋势折线图"><g className="grid-lines"><line x1="18" y1="20" x2="282" y2="20"/><line x1="18" y1="55" x2="282" y2="55"/><line x1="18" y1="90" x2="282" y2="90"/></g><polyline points={points}/>{data.map((v,i)=><circle cx={18+i*42} cy={88-(v-52.4)*90} r="4" key={i}/>)}</svg>
      <div className="chart-labels">{["24","25","26","27","28","29","30"].map(x=><span key={x}>{x}</span>)}</div>
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
