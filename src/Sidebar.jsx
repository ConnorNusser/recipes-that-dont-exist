import React from "react";
import { BASE, catColor } from "./lib.js";

export default function Sidebar({ index, activeDate, streak, open }) {
  const todayDate = index[0]?.date;
  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-header">
        <div className="workspace">
          <img className="workspace-mark" src={`${BASE}assets/mark.jpg`} alt="" />
          <span className="workspace-name">Recipes That Don't Exist</span>
        </div>
      </div>

      <nav className="nav-section">
        <a className={`nav-item${activeDate === todayDate ? " active" : ""}`} href={todayDate ? `#/${todayDate}` : "#"}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8.75-4a.75.75 0 0 0-1.5 0v4c0 .27.14.52.38.65l2.5 1.5a.75.75 0 1 0 .77-1.3L8.75 7.58V4Z"/></svg>
          Today
        </a>
        <a className={`nav-item${activeDate === "about" ? " active" : ""}`} href="#/about">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM6.92 6.085h.001a.749.749 0 1 1-1.342-.67c.169-.339.436-.701.849-.977C6.845 4.16 7.369 4 8 4a2.76 2.76 0 0 1 1.637.525c.503.377.863.965.863 1.725 0 .448-.115.83-.329 1.15-.205.307-.47.513-.692.662-.109.072-.22.138-.313.195l-.006.004a6.24 6.24 0 0 0-.26.16.952.952 0 0 0-.276.245.75.75 0 0 1-1.248-.832c.184-.264.42-.489.692-.661.103-.067.207-.132.313-.195l.007-.004c.1-.061.182-.11.258-.161a.969.969 0 0 0 .277-.245C8.96 6.514 9 6.427 9 6.25a.612.612 0 0 0-.262-.525A1.27 1.27 0 0 0 8 5.5c-.369 0-.595.09-.74.187a1.01 1.01 0 0 0-.34.398ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
          How this works
        </a>
      </nav>

      <div className="nav-section">
        <div className="nav-label">Archive</div>
        {index.map((r) => (
          <a key={r.date} className={`archive-item${activeDate === r.date ? " active" : ""}`} href={`#/${r.date}`}>
            <span className="cat-dot" style={{ background: catColor(r.category) }} />
            <span className="archive-id">{r.id}</span>
            <span className="archive-title">{r.title}</span>
          </a>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="streak" title="Consecutive days with a correct guess">
          <svg width="11" height="13" viewBox="0 0 12 14" fill="var(--accent)"><path d="M6.5.3c.2 2.2-.7 3.4-1.8 4.6C3.5 6.2 2 7.6 2 10a4.5 4.5 0 0 0 9 0c0-1.9-.9-3.3-1.8-4.3-.3 1-.9 1.7-1.6 2.1.3-2.4-.4-5.6-1.1-7.5Z"/></svg>
          {streak} day streak
        </div>
      </div>
    </aside>
  );
}
