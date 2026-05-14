import { useState, useRef, useContext, createContext, useEffect } from "react";
import {
  getClients, addClient, updateClient, deleteClient,
  getProjects, addProject, updateProject,
  getBriefs, addBrief, updateBrief,
  getNextMonth, addNextMonth,
  getComments, addComment,
  getAssets, addAsset,
  getBrandFiles, addBrandFile, deleteBrandFile,
  getContent, updateContent,
  uploadFile,
} from "./supabase";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  white:"#FFFFFF", bg:"#F5F6F8", border:"#E2E5EA",
  text:"#0D0F12", textSub:"#6B7280", textMute:"#9CA3AF",
  blue:"#2563EB", blueSoft:"#EFF4FF", blueMid:"#DBEAFE",
  grey1:"#F9FAFB", grey2:"#F3F4F6", grey3:"#E5E7EB", grey4:"#D1D5DB",
  dark:"#111827", dark2:"#1F2937",
  success:"#16A34A", successBg:"#DCFCE7",
  warn:"#D97706", warnBg:"#FEF3C7",
  info:"#0891B2", infoBg:"#ECFEFF",
  danger:"#DC2626", dangerBg:"#FEE2E2",
  purple:"#7C3AED", purpleBg:"#F5F3FF",
};
const F = "'Inter','system-ui',sans-serif";

const STATUS = {
  "Pending Approval":{ color:C.warn,    bg:C.warnBg,    dot:C.warn },
  "To Do":           { color:C.textSub, bg:C.grey2,     dot:C.grey4 },
  "In Progress":     { color:C.blue,    bg:C.blueSoft,  dot:C.blue },
  "In Review":       { color:C.info,    bg:C.infoBg,    dot:C.info },
  "Done":            { color:C.success, bg:C.successBg, dot:C.success },
  "Next Month":      { color:C.purple,  bg:C.purpleBg,  dot:C.purple },
};

const TIER_CAPS = { Essential:10, Growth:12, Pro:16 };
const TIER_MRR  = { Essential:1500, Growth:2500, Pro:3500 };
const TIERS = [
  { name:"Essential", price:"$1,500/mo", tag:"5 SPOTS LEFT", desc:"For growing teams ready for consistent, professional design support.", requests:"5–10 design requests/month", active:"1 active request at a time", turnaround:"24–48 hr turnaround", support:"Email Support", extras:["Unused hours roll over 30 days","Light brand consistency support","Post Scheduling"], services:["Social Media Content","Presentation Deck","Email Newsletter","Print & Merch","Website Updates","Ads","UI/UX Design","Branding & Visual Assets"] },
  { name:"Growth",    price:"$2,500/mo", tag:"Most Popular",  desc:"For scaling firms with active marketing needs and higher design volume.", requests:"6–12 design requests/month", active:"2 active requests at a time", turnaround:"24–48 hr turnaround", support:"Priority Email (24hr)", extras:["Unused hours roll over 30 days","Creative direction alignment","Post Scheduling"], services:["Social Media Content","Presentation Deck","Email Newsletter","Print & Merch","Website Updates","Ads","UI/UX Design","Packaging & Merch","Custom Illustrations","Branding & Visual Assets"] },
  { name:"Pro",       price:"$3,500/mo", tag:"Best Value",    desc:"For established GTA firms that need a fully embedded creative partner.", requests:"8–16 design requests/month", active:"2–3 active requests at a time", turnaround:"24–48 hr turnaround", support:"Priority Email (24hr)", extras:["Unused hours roll over 30 days","Light creative strategy support","Post Scheduling","Video Editing"], services:["Social Media Content","Presentation Deck","Email Newsletter","Print & Merch","Website Updates","Ads","UI/UX Design","Packaging & Merch","Custom Illustrations","Video Editing","Branding & Visual Assets"] },
];
const BRAND_CATS = [
  { id:"guidelines", label:"Brand Guidelines", icon:"📋", hint:"Brand guide PDFs, style docs" },
  { id:"logos",      label:"Logo Files",        icon:"◈",  hint:"SVG, PNG, AI, EPS files" },
  { id:"assets",     label:"Brand Assets",      icon:"🎨", hint:"Icons, illustrations, patterns" },
  { id:"fonts",      label:"Fonts",             icon:"Aa", hint:"OTF, TTF, WOFF files" },
  { id:"other",      label:"Other Files",       icon:"📎", hint:"Anything else Maryam might need" },
];

// ── Fix 1: expanded QNA with rich questions + placeholders ────────
const QNA = [
  { q:"What is the primary goal of this project? What do you want people to feel or do after seeing it?", placeholder:"e.g. Drive event sign-ups, build trust with new clients, announce a rebrand..." },
  { q:"Who is your target audience? Describe their role, industry, and what they care about.", placeholder:"e.g. Senior partners at GTA law firms, ages 40–60, value professionalism and discretion..." },
  { q:"What copy or written content will this piece include? Share any headlines, body text, CTAs, or key messages — even rough drafts.", placeholder:"e.g. Headline: 'Built for the way you work.' CTA: Book a call..." },
  { q:"Do you have existing brand guidelines (colours, fonts, logo)? Any design assets Maryam should reference?", placeholder:"e.g. Yes — guidelines are in my Brand Library. Primary colour is navy #1A2B5F, font is Garamond..." },
  { q:"What formats or sizes do you need? (You'll also fill in dimensions below.)", placeholder:"e.g. Instagram carousel (9 slides), LinkedIn post, plus a print version at A4..." },
  { q:"Any visual references, mood, or aesthetic direction? Share links, describe a feeling, or name brands you admire.", placeholder:"e.g. Clean and elevated like McKinsey's site — dark navy, lots of white space, no stock photos..." },
  { q:"Is there anything Maryam should avoid? Colours, styles, or directions that don't fit your brand?", placeholder:"e.g. Avoid bright colours, illustration-heavy styles, or anything that feels startup-y..." },
  { q:"Any other context, constraints, or details Maryam should know before she starts?", placeholder:"e.g. This is going to a board-level audience, needs to be ready for a June 1 launch event..." },
];

const PRESET_DIMS = [
  { label:"Instagram Post",     value:"1080 × 1080 px" },
  { label:"Instagram Story",    value:"1080 × 1920 px" },
  { label:"LinkedIn Banner",    value:"1584 × 396 px" },
  { label:"Presentation Slide", value:"1920 × 1080 px" },
  { label:"A4 Print",           value:"210 × 297 mm" },
  { label:"Letter Print",       value:"8.5 × 11 in" },
  { label:"Business Card",      value:"88.9 × 50.8 mm" },
  { label:"Email Header",       value:"600 × 200 px" },
  { label:"Custom",             value:"" },
];

const clientCap = c => c.cap_override ?? TIER_CAPS[c.plan] ?? 10;
const clientMRR = c => TIER_MRR[c.plan] ?? 0;
const usagePct  = c => Math.min(100, Math.round((c.used / clientCap(c)) * 100));
const isOverCap = c => c.used >= clientCap(c);
const fmt = d => { if(!d) return "—"; return new Date(d).toLocaleDateString("en-CA",{month:"short",day:"numeric"}); };
const daysLeft = d => { if(!d) return null; return Math.ceil((new Date(d)-new Date())/864e5); };
const randomColor = () => ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"][Math.floor(Math.random()*7)];
const toInitials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── CONTENT CONTEXT ─────────────────────────────────────────────
const ContentCtx = createContext(null);
const INIT_CONTENT = {
  welcomeGreeting:"Good morning 👋", welcomeName:"Welcome back",
  bookingUrl:"https://meetings.hubspot.com/maryam-ashraf", bookingLabel:"Book Alignment Call",
  briefCta:"Need something new?", briefCtaSub:"Submit a brief — Maryam reviews within 24–48hrs.",
  callCta:"Have a question?", callCtaSub:"Book a 15-min alignment call with Maryam.",
  approvalNote:"Maryam reviews all submitted briefs within 24–48 hours. You'll be notified once approved.",
  nextMonthNote:"These projects are queued for next month due to capacity. Maryam will confirm at the start of next month.",
  firstTimerTitle:"First time submitting a brief?",
  firstTimerSub:"Try the Q&A Walkthrough — Maryam's AI guides you through everything step by step.",
  portalTitle:"Pixie Creative", portalSubtitle:"Client Portal",
  inviteEmailIntro:"Maryam has invited you to your Pixie Creative client portal.",
  // Fix 2: ET-editable plan tier text
  planTierName:"Growth Plan",
  planTierDesc:"$2,500/mo · 6–12 design requests/month",
};

// ─── EDITABLE TEXT ────────────────────────────────────────────────
function ET({ k, style:s={}, multiline=false }) {
  const ctx = useContext(ContentCtx);
  if (!ctx) return null;
  const { content, setContent, editMode } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef();
  if (!editMode) return <span style={s}>{content[k]}</span>;
  const start = () => { setDraft(content[k]); setEditing(true); setTimeout(()=>ref.current?.focus(),50); };
  const save = async () => {
    setContent(p=>({...p,[k]:draft}));
    await updateContent(k, draft);
    setEditing(false);
  };
  if (editing) return multiline
    ? <textarea ref={ref} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>e.key==="Escape"&&setEditing(false)}
        style={{ ...s,fontFamily:F,border:`2px solid ${C.blue}`,borderRadius:6,padding:"2px 6px",outline:"none",resize:"none",minHeight:60,width:"100%",boxSizing:"border-box",background:C.blueSoft }}/>
    : <input ref={ref} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{ if(e.key==="Enter") save(); if(e.key==="Escape") setEditing(false); }}
        style={{ ...s,fontFamily:F,border:`2px solid ${C.blue}`,borderRadius:6,padding:"2px 6px",outline:"none",background:C.blueSoft,width:"100%",boxSizing:"border-box" }}/>;
  return (
    <span onClick={start} title="Click to edit" style={{ ...s,cursor:"text",borderRadius:4,padding:"1px 3px",transition:"all 0.12s",outline:"1.5px dashed transparent",outlineOffset:2 }}
      onMouseEnter={e=>e.currentTarget.style.outline=`1.5px dashed ${C.blue}`}
      onMouseLeave={e=>e.currentTarget.style.outline="1.5px dashed transparent"}>
      {content[k]}<span style={{ fontSize:9,marginLeft:4,color:C.blue,opacity:0.6,verticalAlign:"middle" }}>✏</span>
    </span>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = STATUS[status]||STATUS["To Do"];
  return <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:600,fontFamily:F,whiteSpace:"nowrap" }}><span style={{ width:6,height:6,borderRadius:"50%",background:cfg.dot,flexShrink:0 }}/>{status}</span>;
}
function Tag({ label }) { return <span style={{ display:"inline-flex",padding:"2px 9px",borderRadius:20,background:C.grey2,color:C.textSub,fontSize:11,fontWeight:500,fontFamily:F }}>{label}</span>; }
function Btn({ children, variant="primary", size="md", onClick, style:s={}, disabled, title }) {
  const sz = size==="sm"?{fontSize:12,padding:"6px 12px"}:size==="lg"?{fontSize:15,padding:"12px 24px"}:{fontSize:13,padding:"9px 18px"};
  const v = variant==="primary"?{background:C.blue,color:C.white}:variant==="outline"?{background:"transparent",color:C.blue,border:`1.5px solid ${C.blue}`}:variant==="ghost"?{background:"transparent",color:C.textSub}:variant==="danger"?{background:C.dangerBg,color:C.danger}:variant==="success"?{background:C.successBg,color:C.success}:variant==="purple"?{background:C.purpleBg,color:C.purple}:{background:C.grey2,color:C.text};
  return <button title={title} style={{ fontFamily:F,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"none",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.15s",borderRadius:8,opacity:disabled?0.45:1,...sz,...v,...s }} onClick={disabled?undefined:onClick}>{children}</button>;
}
function Inp({ label, ...p }) { return <div style={{ display:"flex",flexDirection:"column",gap:5 }}>{label&&<label style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F }}>{label}</label>}<input style={{ fontFamily:F,fontSize:14,padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box" }} {...p}/></div>; }
function Sel({ label, children, ...p }) { return <div style={{ display:"flex",flexDirection:"column",gap:5 }}>{label&&<label style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F }}>{label}</label>}<select style={{ fontFamily:F,fontSize:14,padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box" }} {...p}>{children}</select></div>; }
function Txt({ label, ...p }) { return <div style={{ display:"flex",flexDirection:"column",gap:5 }}>{label&&<label style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F }}>{label}</label>}<textarea style={{ fontFamily:F,fontSize:14,padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical",minHeight:90 }} {...p}/></div>; }
function Av({ initials, color, size=32 }) { return <div style={{ width:size,height:size,borderRadius:"50%",background:color||C.blue,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontSize:size*0.36,fontWeight:700,fontFamily:F,flexShrink:0 }}>{initials}</div>; }
function Modal({ children, onClose, width=700 }) {
  return <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{ background:C.white,borderRadius:16,width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>{children}</div>
  </div>;
}
function Spinner() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:60 }}><div style={{ width:28,height:28,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.blue}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>; }
function SectionLabel({ children }) { return <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8 }}>{children}</div>; }

function BookingBtn({ style:s={} }) {
  const ctx = useContext(ContentCtx);
  const url   = ctx?.content?.bookingUrl   || "https://meetings.hubspot.com/maryam-ashraf";
  const label = ctx?.content?.bookingLabel || "Book Alignment Call";
  return <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}><Btn variant="outline" style={{ borderColor:C.border,color:C.text,background:C.white,fontSize:12,...s }}>📅 {label}</Btn></a>;
}
function RevBadge({ used, max }) {
  const over = used>=max;
  return <span style={{ fontSize:11,fontFamily:F,fontWeight:600,color:over?C.danger:C.textSub,background:over?C.dangerBg:C.grey2,padding:"2px 9px",borderRadius:20 }}>{used}/{max} revisions</span>;
}
function UsageBar({ pct }) {
  const color = pct>=100?C.danger:pct>=80?C.warn:C.blue;
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:12,fontFamily:F,color:C.textSub,fontWeight:500 }}>Design request usage</span>
        <span style={{ fontSize:12,fontFamily:F,fontWeight:700,color }}>{pct>=100?"At capacity":pct>=80?"Almost full":`${pct}% used`}</span>
      </div>
      <div style={{ height:8,background:C.grey2,borderRadius:10,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:10,transition:"width 0.4s" }}/>
      </div>
      {pct>=100&&<div style={{ fontSize:11,fontFamily:F,color:C.danger }}>You've reached your plan limit — Maryam will be in touch about next steps.</div>}
      {pct>=80&&pct<100&&<div style={{ fontSize:11,fontFamily:F,color:C.warn }}>You're approaching your monthly limit.</div>}
    </div>
  );
}
function ViewToggle({ isAdmin, setIsAdmin }) {
  return (
    <div style={{ display:"flex",background:C.grey2,borderRadius:8,padding:3,gap:2 }}>
      {[{label:"Client View",val:false},{label:"Admin View",val:true}].map(v=>(
        <button key={String(v.val)} onClick={()=>setIsAdmin(v.val)} style={{ fontFamily:F,fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:isAdmin===v.val?C.white:"transparent",color:isAdmin===v.val?C.text:C.textSub,boxShadow:isAdmin===v.val?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.15s" }}>{v.label}</button>
      ))}
    </div>
  );
}

// ─── SIDEBARS ─────────────────────────────────────────────────────
function Sidebar({ active, setActive, queueCount, user, onClose }) {
  const nav = [
    { id:"dashboard", icon:"⊞", label:"Dashboard" },
    { id:"projects",  icon:"◈", label:"Projects" },
    { id:"queue",     icon:"⏳", label:"Submitted Briefs", badge:queueCount },
    { id:"nextmonth", icon:"📅", label:"Next Month" },
    { id:"brief",     icon:"＋", label:"Submit Brief" },
    { id:"brand",     icon:"🎨", label:"Brand Library" },
    { id:"assets",    icon:"📎", label:"Files & Assets" },
    { id:"plan",      icon:"★",  label:"My Plan" },
  ];
  return (
    <div style={{ width:224,background:C.dark,display:"flex",flexDirection:"column",height:"100%",flexShrink:0 }}>
      <div style={{ padding:"22px 20px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ color:C.white,fontSize:17,fontWeight:700,fontFamily:F }}><ET k="portalTitle" style={{ color:C.white,fontSize:17,fontWeight:700,fontFamily:F }}/></div>
        <div style={{ color:"rgba(255,255,255,0.35)",fontSize:11,fontFamily:F,marginTop:2,textTransform:"uppercase",letterSpacing:"0.06em" }}><ET k="portalSubtitle" style={{ color:"rgba(255,255,255,0.35)",fontSize:11,fontFamily:F }}/></div>
      </div>
      <div style={{ flex:1,padding:"10px",overflowY:"auto" }}>
        {nav.map(({ id,icon,label,badge })=>(
          <div key={id} onClick={()=>{ setActive(id); onClose&&onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,background:active===id?"rgba(37,99,235,0.25)":"transparent",color:active===id?C.white:"rgba(255,255,255,0.5)",fontSize:13,fontFamily:F,fontWeight:active===id?600:400,transition:"all 0.12s" }}>
            <span style={{ fontSize:14,flexShrink:0 }}>{icon}</span>
            <span style={{ flex:1 }}>{label}</span>
            {badge>0&&<span style={{ background:C.blue,color:C.white,fontSize:10,fontWeight:700,fontFamily:F,padding:"1px 7px",borderRadius:20 }}>{badge}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 14px" }}><BookingBtn style={{ width:"100%",justifyContent:"center",fontSize:11 }}/></div>
      <div style={{ padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:10 }}>
        <Av initials={user.initials} color={C.blue} size={30}/>
        <div>
          <div style={{ color:C.white,fontSize:12,fontFamily:F,fontWeight:600 }}>{user.name}</div>
          <div style={{ color:"rgba(255,255,255,0.35)",fontSize:11,fontFamily:F }}>{user.plan}</div>
        </div>
      </div>
    </div>
  );
}
function AdminSidebar({ active, setActive, queueCount, onClose }) {
  const nav = [
    { id:"admin-dashboard", icon:"⊞", label:"Overview" },
    { id:"admin-clients",   icon:"👥", label:"Clients" },
    { id:"admin-queue",     icon:"⏳", label:"Approval Queue", badge:queueCount },
    { id:"admin-capacity",  icon:"◉", label:"Capacity" },
    { id:"admin-revenue",   icon:"$", label:"Revenue" },
  ];
  return (
    <div style={{ width:224,background:C.dark,display:"flex",flexDirection:"column",height:"100%",flexShrink:0 }}>
      <div style={{ padding:"22px 20px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ color:C.white,fontSize:17,fontWeight:700,fontFamily:F }}>Pixie Creative</div>
        <div style={{ color:C.blue,fontSize:11,fontFamily:F,marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:600 }}>Admin View</div>
      </div>
      <div style={{ flex:1,padding:"10px",overflowY:"auto" }}>
        {nav.map(({ id,icon,label,badge })=>(
          <div key={id} onClick={()=>{ setActive(id); onClose&&onClose(); }}
            style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,background:active===id?"rgba(37,99,235,0.25)":"transparent",color:active===id?C.white:"rgba(255,255,255,0.5)",fontSize:13,fontFamily:F,fontWeight:active===id?600:400,transition:"all 0.12s" }}>
            <span style={{ fontSize:14,flexShrink:0 }}>{icon}</span>
            <span style={{ flex:1 }}>{label}</span>
            {badge>0&&<span style={{ background:C.blue,color:C.white,fontSize:10,fontWeight:700,fontFamily:F,padding:"1px 7px",borderRadius:20 }}>{badge}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:10 }}>
        <Av initials="M" color={C.blue} size={30}/>
        <div>
          <div style={{ color:C.white,fontSize:12,fontFamily:F,fontWeight:600 }}>Maryam</div>
          <div style={{ color:"rgba(255,255,255,0.35)",fontSize:11,fontFamily:F }}>Owner</div>
        </div>
      </div>
    </div>
  );
}
function Topbar({ title, actions, onMenu }) {
  return <div style={{ background:C.white,borderBottom:`1px solid ${C.border}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
      <button onClick={onMenu} className="menu-btn" style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.text,padding:"2px 6px",borderRadius:6 }}>☰</button>
      <div style={{ fontSize:18,fontWeight:700,color:C.text,fontFamily:F,letterSpacing:"-0.01em" }}>{title}</div>
    </div>
    <div style={{ display:"flex",alignItems:"center",gap:8 }}>{actions}</div>
  </div>;
}

// ─── PROJECT CARD ─────────────────────────────────────────────────
function ProjectCard({ project:p, onClick }) {
  const days = daysLeft(p.deadline);
  const urgent = days!==null&&days<=3&&p.status!=="Done";
  return (
    <div onClick={onClick} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"15px 18px",marginBottom:10,cursor:"pointer",transition:"all 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
        <Av initials={p.initials} color={p.color} size={38}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.title}</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,alignItems:"center" }}>
            <Badge status={p.status}/>
            <RevBadge used={p.revisions||0} max={p.max_revisions||2}/>
            {(p.tags||[]).map(t=><Tag key={t} label={t}/>)}
          </div>
        </div>
        <div style={{ textAlign:"right",flexShrink:0,fontSize:12,fontFamily:F }}>
          <div style={{ color:urgent?C.danger:C.textSub,fontWeight:urgent?600:400 }}>{days===null?"No deadline":days<0?"Overdue":days===0?"Due today":`${days}d left`}</div>
          <div style={{ color:C.textMute,marginTop:3 }}>Del. {fmt(p.delivery)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT MODAL ────────────────────────────────────────────────
function ProjectModal({ project:p, onClose, onRevision }) {
  const [tab, setTab]           = useState("brief");
  const [comments, setComments] = useState([]);
  const [assets, setAssets]     = useState([]);
  const [comment, setComment]   = useState("");
  const [imgs, setImgs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showRevConfirm, setShowRevConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgRef  = useRef();
  const fileRef = useRef();

  useEffect(()=>{
    Promise.all([getComments(p.id), getAssets(p.id)]).then(([c,a])=>{
      setComments(c.data||[]); setAssets(a.data||[]); setLoading(false);
    });
  },[p.id]);

  const handleImgs = e => setImgs(prev=>[...prev,...Array.from(e.target.files).map(f=>({ file:f, url:URL.createObjectURL(f), name:f.name }))]);

  const sendComment = async () => {
    if (!comment.trim()&&imgs.length===0) return;
    setUploading(true);
    const imageUrls = await Promise.all(imgs.map(async img=>{
      const path = `comments/${p.id}/${Date.now()}-${img.name}`;
      return uploadFile("comments", path, img.file);
    }));
    const { data } = await addComment({ project_id:p.id, author:"Client", avatar:"C", color:"#8B5CF6", text:comment, image_urls:imageUrls });
    if (data) setComments(prev=>[...prev, data]);
    setComment(""); setImgs([]); setUploading(false);
  };

  const handleAssetUpload = async e => {
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      const path = `assets/${p.id}/${Date.now()}-${file.name}`;
      const url = await uploadFile("assets", path, file);
      const { data } = await addAsset({ project_id:p.id, client_id:p.client_id, name:file.name, size:`${(file.size/1048576).toFixed(1)} MB`, type:file.name.split(".").pop().toLowerCase(), url });
      if (data) setAssets(prev=>[...prev, data]);
    }
    setUploading(false);
  };

  const requestRevision = async () => {
    await updateProject(p.id, { revisions:(p.revisions||0)+1 });
    onRevision(p.id);
    setShowRevConfirm(false);
  };

  const overRevision = (p.revisions||0) >= (p.max_revisions||2);
  const days = daysLeft(p.deadline);
  const urgent = days!==null&&days<=3&&p.status!=="Done";

  return (
    <Modal onClose={onClose} width={760}>
      <div style={{ padding:"22px 26px 16px",borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
          <div style={{ display:"flex",gap:12,alignItems:"flex-start",flex:1,minWidth:0 }}>
            <Av initials={p.initials} color={p.color} size={42}/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:18,fontWeight:700,color:C.text,fontFamily:F,marginBottom:2 }}>{p.title}</div>
              <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:10 }}>{p.client_name}</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                <Badge status={p.status}/>
                <RevBadge used={p.revisions||0} max={p.max_revisions||2}/>
                {(p.tags||[]).map(t=><Tag key={t} label={t}/>)}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textSub,padding:"2px 8px",flexShrink:0 }}>✕</button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:20,marginTop:16 }}>
          {[{label:"Client Deadline",value:fmt(p.deadline),alert:urgent},{label:"Expected Delivery",value:fmt(p.delivery)},{label:"Priority",value:p.priority}].map(m=>(
            <div key={m.label}>
              <div style={{ fontSize:11,fontFamily:F,color:C.textMute,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:2 }}>{m.label}</div>
              <div style={{ fontSize:13,fontFamily:F,fontWeight:600,color:m.alert?C.danger:C.text }}>{m.value}</div>
            </div>
          ))}
        </div>
        {overRevision&&<div style={{ marginTop:14,background:C.dangerBg,border:`1px solid #FCA5A5`,borderRadius:8,padding:"10px 14px",fontSize:12,fontFamily:F,color:C.danger }}>⚠️ You've used both revisions. Any additional revision requests will roll over to next month.</div>}
      </div>
      <div style={{ display:"flex",padding:"0 26px",borderBottom:`1px solid ${C.border}` }}>
        {["brief","comments","assets"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"11px 16px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:tab===t?600:400,color:tab===t?C.blue:C.textSub,borderBottom:tab===t?`2px solid ${C.blue}`:"2px solid transparent",marginBottom:-1,transition:"all 0.12s" }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ padding:"22px 26px" }}>
        {loading ? <Spinner/> : (<>
          {tab==="brief"&&(
            <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
              <div>
                <SectionLabel>Project Brief</SectionLabel>
                {p.brief ? <p style={{ fontSize:14,fontFamily:F,color:C.text,lineHeight:1.65,background:C.grey1,padding:"14px 16px",borderRadius:10,border:`1px solid ${C.border}`,margin:0 }}>{p.brief}</p>
                : <div style={{ background:C.grey1,border:`1.5px dashed ${C.border}`,borderRadius:10,padding:30,textAlign:"center" }}><div style={{ fontSize:13,color:C.textMute,fontFamily:F }}>No brief yet.</div></div>}
              </div>
              {/* Fix 3: Content section in brief card */}
              <div>
                <SectionLabel>Copy & Content</SectionLabel>
                <textarea placeholder="Paste any written content, headlines, captions, CTAs, or key messages that should appear in the design. Rough drafts welcome."
                  style={{ fontFamily:F,fontSize:13,padding:"11px 13px",border:`1.5px solid ${C.border}`,borderRadius:10,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical",minHeight:90,lineHeight:1.6 }}/>
              </div>
              <div>
                <SectionLabel>Reference Images & Files</SectionLabel>
                <div style={{ border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"24px",textAlign:"center",background:C.grey1,cursor:"pointer" }}>
                  <div style={{ fontSize:22,marginBottom:6 }}>📎</div>
                  <div style={{ fontSize:13,color:C.textSub,fontFamily:F }}>Drop images, PDFs, or mood board files — or <span style={{ color:C.blue }}>browse</span></div>
                  <div style={{ fontSize:11,color:C.textMute,fontFamily:F,marginTop:3 }}>PNG, JPG, PDF up to 50MB</div>
                </div>
              </div>
              <div>
                {/* Fix 4: Dimensions required */}
                <SectionLabel>Design Dimensions <span style={{ color:C.danger,fontSize:10,fontWeight:700 }}>REQUIRED</span></SectionLabel>
                <DimensionsField required/>
              </div>
              <div>
                <SectionLabel>Revision Request</SectionLabel>
                {!showRevConfirm
                  ? <Btn variant={overRevision?"danger":"outline"} onClick={()=>!overRevision&&setShowRevConfirm(true)} disabled={overRevision}>{overRevision?"No Revisions Remaining — Rolls to Next Month":"Request a Revision"}</Btn>
                  : <div style={{ background:C.warnBg,border:`1px solid #FCD34D`,borderRadius:10,padding:16 }}>
                      <div style={{ fontSize:13,fontFamily:F,color:C.dark,fontWeight:600,marginBottom:6 }}>Use revision {(p.revisions||0)+1} of {p.max_revisions||2}?</div>
                      <div style={{ display:"flex",gap:8 }}>
                        <Btn variant="ghost" size="sm" onClick={()=>setShowRevConfirm(false)}>Cancel</Btn>
                        <Btn size="sm" onClick={requestRevision}>Yes, Request Revision</Btn>
                      </div>
                    </div>
                }
              </div>
            </div>
          )}
          {tab==="comments"&&(
            <div>
              <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:20 }}>
                {comments.map(c=>(
                  <div key={c.id} style={{ display:"flex",gap:10 }}>
                    <Av initials={c.avatar} color={c.color} size={32}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:4 }}>
                        <span style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{c.author}</span>
                        <span style={{ fontSize:11,color:C.textMute,fontFamily:F }}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      {c.text&&<div style={{ fontSize:13,fontFamily:F,color:C.dark2,lineHeight:1.55,background:C.grey1,padding:"10px 13px",borderRadius:10,border:`1px solid ${C.border}` }}>{c.text}</div>}
                      {(c.image_urls||[]).length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>{c.image_urls.map((u,i)=><img key={i} src={u} alt="" style={{ width:80,height:80,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}` }}/>)}</div>}
                    </div>
                  </div>
                ))}
                {comments.length===0&&<div style={{ textAlign:"center",padding:24,color:C.textMute,fontFamily:F,fontSize:13 }}>No comments yet.</div>}
              </div>
              <div style={{ border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden" }}>
                <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Leave a comment..." style={{ width:"100%",padding:"12px 14px",border:"none",outline:"none",fontFamily:F,fontSize:13,color:C.text,resize:"none",minHeight:72,boxSizing:"border-box",background:C.white }}/>
                {imgs.length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:8,padding:"8px 14px" }}>{imgs.map((img,i)=><div key={i} style={{ position:"relative" }}><img src={img.url} alt="" style={{ width:60,height:60,objectFit:"cover",borderRadius:6 }}/><button onClick={()=>setImgs(p=>p.filter((_,j)=>j!==i))} style={{ position:"absolute",top:-4,right:-4,background:C.danger,color:C.white,border:"none",borderRadius:"50%",width:16,height:16,fontSize:10,cursor:"pointer" }}>✕</button></div>)}</div>}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:C.grey1,borderTop:`1px solid ${C.border}` }}>
                  <button onClick={()=>imgRef.current.click()} style={{ background:"none",border:"none",cursor:"pointer",color:C.textSub,fontSize:18,padding:"4px" }}>📷</button>
                  <input ref={imgRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleImgs}/>
                  <Btn size="sm" onClick={sendComment} disabled={uploading}>{uploading?"Sending...":"Send"}</Btn>
                </div>
              </div>
            </div>
          )}
          {tab==="assets"&&(
            <div>
              {assets.map(a=>(
                <div key={a.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",background:C.grey1,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:10 }}>
                  <span style={{ fontSize:22 }}>{a.type==="pdf"?"📄":a.type==="zip"?"🗜️":"🎨"}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{a.name}</div><div style={{ fontSize:11,fontFamily:F,color:C.textMute }}>{a.size} · {new Date(a.uploaded_at).toLocaleDateString()}</div></div>
                  <a href={a.url} download target="_blank" rel="noreferrer"><Btn variant="outline" size="sm">⬇ Download</Btn></a>
                </div>
              ))}
              {assets.length===0&&<div style={{ textAlign:"center",padding:24,color:C.textMute,fontFamily:F,fontSize:13 }}>No assets uploaded yet.</div>}
              <div onClick={()=>fileRef.current.click()} style={{ border:`1.5px dashed ${C.border}`,borderRadius:10,padding:18,textAlign:"center",background:C.grey1,cursor:"pointer",marginTop:4 }}>
                <div style={{ fontSize:13,color:C.textSub,fontFamily:F }}>{uploading?"Uploading...":"+ Upload file"}</div>
              </div>
              <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={handleAssetUpload}/>
            </div>
          )}
        </>)}
      </div>
    </Modal>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ projects, queue, nextMonth, setActive, clientData }) {
  const pct = clientData ? usagePct(clientData) : 0;
  const firstName = clientData?.name?.split(" ")[0] || "there";
  const counts = ["To Do","In Progress","In Review","Done"].reduce((a,s)=>({...a,[s]:projects.filter(p=>p.status===s).length}),{});
  return (
    <div style={{ padding:"22px 20px",maxWidth:920 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:3 }}><ET k="welcomeGreeting" style={{ fontSize:13,color:C.textSub,fontFamily:F }}/></div>
        <div style={{ fontSize:24,fontWeight:700,color:C.text,fontFamily:F,letterSpacing:"-0.02em" }}><ET k="welcomeName" style={{ fontSize:24,fontWeight:700,color:C.text,fontFamily:F }}/>, {firstName}</div>
      </div>
      <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px",marginBottom:20 }}>
        <UsageBar pct={pct}/>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:22 }}>
        {Object.entries(counts).map(([s,n])=>(
          <div key={s} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px" }}>
            <div style={{ fontSize:26,fontWeight:700,color:STATUS[s]?.dot||C.blue,fontFamily:F }}>{n}</div>
            <div style={{ fontSize:12,fontFamily:F,color:C.textSub,marginTop:2 }}>{s}</div>
          </div>
        ))}
      </div>
      {queue.length>0&&<div onClick={()=>setActive("queue")} style={{ background:C.warnBg,border:`1px solid #FCD34D`,borderRadius:12,padding:"13px 18px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:18 }}>⏳</span><div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.dark }}>{queue.length} brief{queue.length>1?"s":""} pending approval</div></div><span style={{ color:C.warn }}>→</span></div>}
      {nextMonth.length>0&&<div onClick={()=>setActive("nextmonth")} style={{ background:C.purpleBg,border:`1px solid #C4B5FD`,borderRadius:12,padding:"13px 18px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:18 }}>📅</span><div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.dark }}>{nextMonth.length} project{nextMonth.length>1?"s":""} queued for next month</div></div><span style={{ color:C.purple }}>→</span></div>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
        <div style={{ fontSize:15,fontWeight:600,color:C.text,fontFamily:F }}>Active Projects</div>
        <Btn variant="ghost" size="sm" onClick={()=>setActive("projects")}>View all →</Btn>
      </div>
      {projects.filter(p=>p.status!=="Done").slice(0,3).map(p=><ProjectCard key={p.id} project={p} onClick={()=>setActive("projects")}/>)}
      <div style={{ display:"flex",gap:12,marginTop:20,flexWrap:"wrap" }}>
        <div style={{ flex:1,minWidth:220,background:C.blueSoft,border:`1.5px dashed ${C.blue}50`,borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}><ET k="briefCta" style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}/></div>
            <div style={{ fontSize:12,fontFamily:F,color:C.textSub,marginTop:2 }}><ET k="briefCtaSub" style={{ fontSize:12,fontFamily:F,color:C.textSub }}/></div>
          </div>
          <Btn size="sm" onClick={()=>setActive("brief")}>+ Brief</Btn>
        </div>
        <div style={{ flex:1,minWidth:220,background:C.grey1,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}><ET k="callCta" style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}/></div>
            <div style={{ fontSize:12,fontFamily:F,color:C.textSub,marginTop:2 }}><ET k="callCtaSub" style={{ fontSize:12,fontFamily:F,color:C.textSub }}/></div>
          </div>
          <BookingBtn/>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECTS ─────────────────────────────────────────────────────
function Projects({ projects, setProjects }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const filters = ["All","In Progress","In Review","To Do","Done"];
  const filtered = filter==="All"?projects:projects.filter(p=>p.status===filter);
  const handleRevision = id => setProjects(prev=>prev.map(p=>p.id===id?{...p,revisions:(p.revisions||0)+1}:p));
  return (
    <div style={{ padding:"22px 20px",maxWidth:920 }}>
      <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:20 }}>
        {filters.map(f=><button key={f} onClick={()=>setFilter(f)} style={{ fontFamily:F,fontSize:12,fontWeight:filter===f?600:500,padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filter===f?C.blue:C.border}`,background:filter===f?C.blue:C.white,color:filter===f?C.white:C.textSub,cursor:"pointer",transition:"all 0.12s" }}>{f}</button>)}
      </div>
      {filtered.length===0?<div style={{ textAlign:"center",padding:40,color:C.textMute,fontFamily:F,fontSize:14 }}>No projects here yet.</div>
      :filtered.map(p=><ProjectCard key={p.id} project={p} onClick={()=>setSelected(p)}/>)}
      {selected&&<ProjectModal project={selected} onClose={()=>setSelected(null)} onRevision={handleRevision}/>}
    </div>
  );
}

// ─── SUBMITTED BRIEFS ─────────────────────────────────────────────
function SubmittedBriefs({ queue }) {
  return (
    <div style={{ padding:"22px 20px",maxWidth:920 }}>
      <div style={{ background:C.warnBg,border:`1px solid #FCD34D`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,fontFamily:F,color:C.warn,display:"flex",gap:8 }}>
        <span>⏳</span><ET k="approvalNote" style={{ fontSize:13,fontFamily:F,color:C.warn }} multiline/>
      </div>
      {queue.length===0?<div style={{ textAlign:"center",padding:"50px 20px" }}><div style={{ fontSize:32,marginBottom:12 }}>✓</div><div style={{ fontSize:15,fontWeight:600,fontFamily:F,color:C.text,marginBottom:6 }}>No briefs pending</div></div>
      :queue.map(item=>(
        <div key={item.id} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",marginBottom:12 }}>
          <div style={{ fontSize:15,fontWeight:600,color:C.text,fontFamily:F,marginBottom:4 }}>{item.title}</div>
          <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:8 }}>Submitted {new Date(item.submitted_at).toLocaleDateString()} · Deadline {fmt(item.deadline)}</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}><Badge status="Pending Approval"/>{(item.tags||[]).map(t=><Tag key={t} label={t}/>)}</div>
          {item.brief&&<p style={{ fontSize:13,color:C.dark2,fontFamily:F,lineHeight:1.55,marginTop:10,background:C.grey1,padding:"10px 13px",borderRadius:8,border:`1px solid ${C.border}` }}>{item.brief}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── NEXT MONTH ───────────────────────────────────────────────────
function NextMonth({ items }) {
  return (
    <div style={{ padding:"22px 20px",maxWidth:920 }}>
      <div style={{ background:C.purpleBg,border:`1px solid #C4B5FD`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,fontFamily:F,color:C.purple,display:"flex",gap:8 }}>
        <span>📅</span><ET k="nextMonthNote" style={{ fontSize:13,fontFamily:F,color:C.purple }} multiline/>
      </div>
      {items.length===0?<div style={{ textAlign:"center",padding:"50px 20px" }}><div style={{ fontSize:32,marginBottom:12 }}>🎉</div><div style={{ fontSize:15,fontWeight:600,fontFamily:F,color:C.text }}>Nothing queued yet</div></div>
      :items.map(item=>(
        <div key={item.id} style={{ background:C.white,border:`1px solid #C4B5FD`,borderRadius:12,padding:"18px 20px",marginBottom:12 }}>
          <div style={{ fontSize:15,fontWeight:600,color:C.text,fontFamily:F,marginBottom:4 }}>{item.title}</div>
          <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:8 }}>Queued {new Date(item.queued_on||item.created_at).toLocaleDateString()}</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}><Badge status="Next Month"/>{(item.tags||[]).map(t=><Tag key={t} label={t}/>)}</div>
          {item.reason&&<div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginTop:10 }}>ℹ️ {item.reason}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── DIMENSIONS FIELD — Fix 4: required + validation ──────────────
function DimensionsField({ required=false, showError=false }) {
  const [rows, setRows] = useState([{ id:1, preset:"", custom:"", notes:"" }]);
  const addRow = () => setRows(r=>[...r,{ id:Date.now(), preset:"", custom:"", notes:"" }]);
  const removeRow = id => setRows(r=>r.filter(x=>x.id!==id));
  const update = (id,key,val) => setRows(r=>r.map(x=>x.id===id?{...x,[key]:val}:x));
  const hasSelection = rows.some(r=>r.preset||r.custom);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      {showError&&!hasSelection&&<div style={{ background:C.dangerBg,border:`1px solid #FCA5A5`,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:F,color:C.danger }}>⚠️ Please select at least one design format before submitting.</div>}
      {rows.map(row=>(
        <div key={row.id} style={{ display:"flex",gap:8,alignItems:"flex-start",background:C.grey1,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px" }}>
          <div style={{ display:"flex",flex:1,gap:8,flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px" }}>
              <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,marginBottom:4,textTransform:"uppercase" }}>Format</div>
              <select value={row.preset} onChange={e=>{ update(row.id,"preset",e.target.value); if(e.target.value!=="Custom") update(row.id,"custom",e.target.value); }} style={{ fontFamily:F,fontSize:13,padding:"7px 10px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box" }}>
                <option value="">Select format...</option>
                {PRESET_DIMS.map(d=><option key={d.label} value={d.value}>{d.label}{d.value?` — ${d.value}`:""}</option>)}
              </select>
            </div>
            <div style={{ flex:"1 1 160px" }}>
              <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,marginBottom:4,textTransform:"uppercase" }}>Custom Size</div>
              <input value={row.preset==="Custom"||!row.preset?row.custom:row.preset} onChange={e=>update(row.id,"custom",e.target.value)} placeholder="e.g. 1200 × 628 px" disabled={row.preset&&row.preset!=="Custom"} style={{ fontFamily:F,fontSize:13,padding:"7px 10px",border:`1.5px solid ${C.border}`,borderRadius:8,background:row.preset&&row.preset!=="Custom"?C.grey2:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box" }}/>
            </div>
            <div style={{ flex:"2 1 200px" }}>
              <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,marginBottom:4,textTransform:"uppercase" }}>Notes</div>
              <input value={row.notes} onChange={e=>update(row.id,"notes",e.target.value)} placeholder="e.g. CMYK, bleed, @2x" style={{ fontFamily:F,fontSize:13,padding:"7px 10px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box" }}/>
            </div>
          </div>
          {rows.length>1&&<button onClick={()=>removeRow(row.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.textMute,fontSize:16,padding:"6px",marginTop:20,flexShrink:0 }}>✕</button>}
        </div>
      ))}
      <button onClick={addRow} style={{ background:"none",border:`1.5px dashed ${C.border}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontFamily:F,color:C.textSub,width:"fit-content" }} onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>+ Add another size</button>
    </div>
  );
}

// ─── BRIEF SUBMIT ─────────────────────────────────────────────────
function BriefSubmit({ setQueue, clientId, clientName }) {
  const [mode, setMode]   = useState(null);
  const [step, setStep]   = useState(0);
  const [qna, setQna]     = useState({});
  const [form, setForm]   = useState({ title:"", type:"", description:"", deadline:"", copyContent:"" });
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiText, setAiText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (brief) => {
    setSaving(true);
    const { data } = await addBrief({
      client_id:clientId, client_name:clientName,
      title:form.title||"New Project", brief, copy_content:form.copyContent||null,
      tags:[form.type||"Design"], priority:"Medium", deadline:form.deadline||null,
    });
    if (data) setQueue(q=>[...q, data]);
    setSaving(false); setSubmitted(true);
  };

  const genAI = () => {
    setGenerating(true);
    setTimeout(()=>{
      setAiText(`We need ${form.type||"design"} work. ${form.description||"The project should align with our brand guidelines and target a professional B2B audience."} Timeline: ${form.deadline?fmt(form.deadline):"TBD"}. Please ensure consistency with brand assets on file.${form.copyContent?` Key messages: ${form.copyContent}`:""}`);
      setGenerating(false);
    },1800);
  };

  const reset = () => { setMode(null);setSubmitted(false);setStep(0);setAiText("");setForm({ title:"",type:"",description:"",deadline:"",copyContent:"" }); };

  if (submitted) return (
    <div style={{ padding:"60px 20px",textAlign:"center",maxWidth:480,margin:"0 auto" }}>
      <div style={{ width:56,height:56,borderRadius:"50%",background:C.successBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24 }}>✓</div>
      <div style={{ fontSize:20,fontWeight:700,color:C.text,fontFamily:F,marginBottom:8 }}>Brief Submitted!</div>
      <div style={{ fontSize:14,color:C.textSub,fontFamily:F,lineHeight:1.6,marginBottom:24 }}>Maryam will review within <strong>24–48 hours</strong>.</div>
      <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}><Btn onClick={reset}>Submit Another</Btn><BookingBtn/></div>
    </div>
  );

  const back = <Btn variant="ghost" size="sm" onClick={()=>setMode(null)} style={{ marginBottom:20 }}>← Back</Btn>;

  if (!mode) return (
    <div style={{ padding:"22px 20px",maxWidth:780 }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:20,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Submit a New Brief</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F }}>Maryam reviews all briefs within 24–48 hours.</div>
      </div>
      <div style={{ background:C.blueSoft,border:`1px solid ${C.blueMid}`,borderRadius:10,padding:"12px 16px",marginBottom:22,display:"flex",gap:10,alignItems:"flex-start" }}>
        <span>🎓</span>
        <div>
          <div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}><ET k="firstTimerTitle" style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}/></div>
          <div style={{ fontSize:12,fontFamily:F,color:C.textSub,marginTop:2 }}><ET k="firstTimerSub" style={{ fontSize:12,fontFamily:F,color:C.textSub }} multiline/></div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14 }}>
        {[
          { id:"ai",    icon:"✦", title:"AI Brief Generator",  desc:"Answer a few questions and AI writes your full brief.", badge:"Recommended" },
          { id:"qna",   icon:"💬", title:"Q&A Walkthrough",     desc:"Chat-style guided questions — great for first-timers.", badge:"Beginner Friendly" },
          { id:"write", icon:"✏️", title:"Write It Yourself",    desc:"Prefer to type it out? Jump right in." },
        ].map(opt=>(
          <div key={opt.id} onClick={()=>setMode(opt.id)} style={{ background:C.white,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"22px 20px",cursor:"pointer",transition:"all 0.15s",textAlign:"center" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.boxShadow=`0 0 0 3px ${C.blueSoft}`; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none"; }}>
            <div style={{ fontSize:26,marginBottom:10 }}>{opt.icon}</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6 }}>{opt.title}</div>
            <div style={{ fontSize:12,color:C.textSub,fontFamily:F,lineHeight:1.55 }}>{opt.desc}</div>
            {opt.badge&&<div style={{ marginTop:12 }}><span style={{ background:C.blueSoft,color:C.blue,fontSize:11,fontWeight:600,fontFamily:F,padding:"3px 10px",borderRadius:20 }}>{opt.badge}</span></div>}
          </div>
        ))}
      </div>
    </div>
  );

  if (mode==="write") return (
    <div style={{ padding:"22px 20px",maxWidth:600 }}>
      {back}
      <div style={{ fontSize:18,fontWeight:700,color:C.text,fontFamily:F,marginBottom:20 }}>Write Your Brief</div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <Inp label="Project Title" placeholder="e.g. Brand Refresh, Q2 Social Templates" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        <Sel label="Project Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
          <option value="">Select type...</option>
          {["Branding","Social Media","Presentation","Email / Newsletter","Website","Print","Other"].map(t=><option key={t}>{t}</option>)}
        </Sel>
        <Txt label="Description" placeholder="Describe what you need in as much detail as you like..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <Txt label="Copy & Content" placeholder="Paste any written content, headlines, captions, CTAs, or key messages. Rough drafts welcome." value={form.copyContent} onChange={e=>setForm({...form,copyContent:e.target.value})} style={{ minHeight:80 }}/>
        <Inp label="Client Deadline" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6 }}>Design Dimensions <span style={{ color:C.danger }}>*</span></div>
          <DimensionsField required/>
        </div>
        <Btn onClick={()=>submit(form.description)} disabled={saving}>{saving?"Submitting...":"Submit Brief →"}</Btn>
      </div>
    </div>
  );

  if (mode==="ai") return (
    <div style={{ padding:"22px 20px",maxWidth:600 }}>
      {back}
      <div style={{ fontSize:18,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>AI Brief Generator</div>
      <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:22 }}>Fill in the basics — AI writes the full brief for you.</div>
      <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:20 }}>
        <Inp label="Project Title" placeholder="e.g. Brand Refresh" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        <Sel label="Project Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
          <option value="">Select type...</option>
          {["Branding","Social Media","Presentation","Email / Newsletter","Website","Print"].map(t=><option key={t}>{t}</option>)}
        </Sel>
        <Txt label="In a sentence, what do you need?" placeholder="e.g. A refined brand identity for a Toronto law firm" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{ minHeight:60 }}/>
        <Txt label="Copy & Content" placeholder="Any written content, headlines, CTAs, or messages to include. Rough is fine — AI will refine." value={form.copyContent} onChange={e=>setForm({...form,copyContent:e.target.value})} style={{ minHeight:70 }}/>
        <Inp label="Client Deadline" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6 }}>Design Dimensions <span style={{ color:C.danger }}>*</span></div>
          <DimensionsField required/>
        </div>
      </div>
      {!aiText?<Btn onClick={genAI} style={{ width:"100%",justifyContent:"center" }} disabled={generating}>{generating?"✦ Generating...":"✦ Generate My Brief"}</Btn>:(
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <Txt label="Your AI-Generated Brief (feel free to edit)" value={aiText} onChange={e=>setAiText(e.target.value)} style={{ minHeight:140 }}/>
          <div style={{ display:"flex",gap:10 }}>
            <Btn variant="secondary" onClick={genAI}>↺ Regenerate</Btn>
            <Btn onClick={()=>submit(aiText)} disabled={saving}>{saving?"Submitting...":"Submit Brief →"}</Btn>
          </div>
        </div>
      )}
    </div>
  );

  // ── Fix 1: Q&A with validation — can't advance without answering ──
  if (mode==="qna") {
    const isLast = step===QNA.length-1;
    const cur = QNA[step];
    const [qnaError, setQnaError] = useState(false);
    const currentAnswer = (qna[step]||"").trim();
    const isEmpty = currentAnswer.length===0;

    const tryNext = () => {
      if (isEmpty) { setQnaError(true); return; }
      setQnaError(false); setStep(step+1);
    };
    const trySubmit = () => {
      if (isEmpty) { setQnaError(true); return; }
      setQnaError(false); submit(Object.values(qna).join(" | "));
    };

    return (
      <div style={{ padding:"22px 20px",maxWidth:600 }}>
        {back}
        <div style={{ fontSize:18,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Q&A Walkthrough</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:20 }}>Question {step+1} of {QNA.length}</div>
        <div style={{ display:"flex",gap:4,marginBottom:24 }}>
          {QNA.map((_,i)=><div key={i} style={{ flex:1,height:3,borderRadius:4,background:i<=step?C.blue:C.border,transition:"background 0.2s" }}/>)}
        </div>
        <div style={{ background:C.grey1,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",marginBottom:14 }}>
          <div style={{ display:"flex",gap:10 }}>
            <Av initials="M" color={C.blue} size={30}/>
            <div>
              <div style={{ fontSize:12,fontWeight:600,fontFamily:F,color:C.text,marginBottom:4 }}>Maryam</div>
              <div style={{ fontSize:14,fontFamily:F,color:C.dark2,lineHeight:1.6 }}>{cur.q}</div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <textarea
            placeholder={cur.placeholder}
            value={qna[step]||""}
            onChange={e=>{ setQna({...qna,[step]:e.target.value}); if(e.target.value.trim()) setQnaError(false); }}
            style={{ fontFamily:F,fontSize:14,padding:"9px 12px",border:`1.5px solid ${qnaError&&isEmpty?C.danger:C.border}`,borderRadius:8,background:C.white,color:C.text,outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical",minHeight:90,lineHeight:1.6,transition:"border-color 0.15s" }}
          />
          {qnaError&&isEmpty&&<div style={{ display:"flex",alignItems:"center",gap:6,marginTop:6,fontSize:12,fontFamily:F,color:C.danger }}>⚠️ Please answer this question before continuing.</div>}
        </div>
        {isLast&&(
          <div style={{ display:"flex",flexDirection:"column",gap:16,marginBottom:16 }}>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8 }}>📝 Copy & Content</div>
              <Txt label="Body copy / captions / key messages" placeholder="Paste or draft any written content that will appear in the design. Rough is fine." value={form.copyContent} onChange={e=>setForm({...form,copyContent:e.target.value})} style={{ minHeight:90 }}/>
            </div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8 }}>📎 Reference Images & Files</div>
              <div style={{ border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"22px",textAlign:"center",background:C.grey1,cursor:"pointer" }}>
                <div style={{ fontSize:13,color:C.textSub,fontFamily:F }}>📎 Drop images, PDFs, or references — or <span style={{ color:C.blue }}>browse</span></div>
                <div style={{ fontSize:11,color:C.textMute,fontFamily:F,marginTop:3 }}>PNG, JPG, PDF up to 50MB</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8 }}>📐 Design Dimensions <span style={{ color:C.danger }}>*</span></div>
              <DimensionsField required/>
            </div>
          </div>
        )}
        <div style={{ display:"flex",gap:10 }}>
          {step>0&&<Btn variant="secondary" onClick={()=>{ setQnaError(false); setStep(step-1); }}>← Back</Btn>}
          {!isLast
            ?<Btn onClick={tryNext} style={{ opacity:isEmpty?0.6:1 }}>Next →</Btn>
            :<Btn onClick={trySubmit} disabled={saving} style={{ opacity:isEmpty?0.6:1 }}>{saving?"Submitting...":"Submit Brief →"}</Btn>}
        </div>
      </div>
    );
  }
}

// ─── BRAND LIBRARY ────────────────────────────────────────────────
function BrandLibrary({ clientId }) {
  const [activeTab, setActiveTab] = useState("guidelines");
  const [files, setFiles]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(()=>{
    getBrandFiles(clientId).then(({ data })=>{
      const grouped = (data||[]).reduce((a,f)=>({ ...a,[f.category]:[...(a[f.category]||[]),f] }),{});
      setFiles(grouped); setLoading(false);
    });
  },[clientId]);

  const handleUpload = async e => {
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      const path = `brand-library/${clientId}/${activeTab}/${Date.now()}-${file.name}`;
      const url = await uploadFile("brand-library", path, file);
      const { data } = await addBrandFile({ client_id:clientId, category:activeTab, name:file.name, size:`${(file.size/1048576).toFixed(1)} MB`, type:file.name.split(".").pop().toLowerCase(), url });
      if (data) setFiles(prev=>({ ...prev,[activeTab]:[...(prev[activeTab]||[]),data] }));
    }
    setUploading(false);
  };

  const removeFile = async (id, cat) => {
    await deleteBrandFile(id);
    setFiles(prev=>({ ...prev,[cat]:(prev[cat]||[]).filter(f=>f.id!==id) }));
  };

  const cat = BRAND_CATS.find(c=>c.id===activeTab);
  const catFiles = files[activeTab]||[];
  const fileIcon = t => ({ pdf:"📄",svg:"✦",png:"🖼️",jpg:"🖼️",jpeg:"🖼️",ai:"🎨",eps:"🎨",zip:"🗜️",otf:"Aa",ttf:"Aa",woff:"Aa" }[t]||"📎");

  return (
    <div style={{ padding:"22px 20px",maxWidth:920 }}>
      <div style={{ background:C.blueSoft,border:`1px solid ${C.blueMid}`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,fontFamily:F,color:C.blue,display:"flex",gap:8 }}>
        <span>🔒</span><span>Your brand library is <strong>completely private</strong>. Only you and Maryam can access these files.</span>
      </div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:22 }}>
        {BRAND_CATS.map(c=>(
          <button key={c.id} onClick={()=>setActiveTab(c.id)} style={{ fontFamily:F,fontSize:12,fontWeight:activeTab===c.id?600:500,padding:"7px 14px",borderRadius:8,border:`1.5px solid ${activeTab===c.id?C.blue:C.border}`,background:activeTab===c.id?C.blue:C.white,color:activeTab===c.id?C.white:C.textSub,cursor:"pointer",transition:"all 0.12s",display:"flex",alignItems:"center",gap:6 }}>
            <span>{c.icon}</span>{c.label}{(files[c.id]||[]).length>0&&<span style={{ background:activeTab===c.id?"rgba(255,255,255,0.25)":C.blueSoft,color:activeTab===c.id?C.white:C.blue,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20 }}>{files[c.id].length}</span>}
          </button>
        ))}
      </div>
      <div onClick={()=>fileRef.current.click()} style={{ border:`2px dashed ${C.border}`,borderRadius:14,padding:"32px 20px",textAlign:"center",background:C.grey1,cursor:"pointer",marginBottom:20,transition:"all 0.15s" }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.blue; e.currentTarget.style.background=C.blueSoft; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.grey1; }}>
        <div style={{ fontSize:28,marginBottom:10 }}>{cat.icon}</div>
        <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:4 }}>{uploading?"Uploading...":"Upload "+cat.label}</div>
        <div style={{ fontSize:12,color:C.textSub,fontFamily:F }}>{cat.hint}</div>
        {!uploading&&<div style={{ marginTop:14 }}><Btn size="sm">Browse Files</Btn></div>}
      </div>
      <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={handleUpload}/>
      {loading?<Spinner/>:catFiles.length===0?<div style={{ textAlign:"center",padding:24,color:C.textMute,fontFamily:F,fontSize:13 }}>No {cat.label.toLowerCase()} uploaded yet.</div>
      :catFiles.map(f=>(
        <div key={f.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",background:C.white,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:10 }}>
          <span style={{ fontSize:22 }}>{fileIcon(f.type)}</span>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{f.name}</div>
            <div style={{ fontSize:11,fontFamily:F,color:C.textMute }}>{f.size} · {new Date(f.uploaded_at).toLocaleDateString()}</div>
          </div>
          <div style={{ display:"flex",gap:8,flexShrink:0 }}>
            <a href={f.url} download target="_blank" rel="noreferrer"><Btn variant="outline" size="sm">⬇</Btn></a>
            <Btn variant="danger" size="sm" onClick={()=>removeFile(f.id,activeTab)}>✕</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ASSETS PAGE ──────────────────────────────────────────────────
function AssetsPage({ clientId }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ getAssets(clientId).then(({ data })=>{ setAssets(data||[]); setLoading(false); }); },[clientId]);
  if (loading) return <Spinner/>;
  return (
    <div style={{ padding:"22px 20px",maxWidth:700 }}>
      <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:16 }}>Deliverables and files from Maryam — ready to download.</div>
      {assets.length===0?<div style={{ textAlign:"center",padding:40,color:C.textMute,fontFamily:F,fontSize:14 }}>No files delivered yet.</div>
      :assets.map(a=>(
        <div key={a.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:C.white,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:10 }}>
          <span style={{ fontSize:22 }}>{a.type==="pdf"?"📄":a.type==="zip"?"🗜️":"🎨"}</span>
          <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{a.name}</div><div style={{ fontSize:11,fontFamily:F,color:C.textMute }}>{a.size} · {new Date(a.uploaded_at).toLocaleDateString()}</div></div>
          <a href={a.url} download target="_blank" rel="noreferrer"><Btn variant="outline" size="sm">⬇ Download</Btn></a>
        </div>
      ))}
    </div>
  );
}

// ─── MY PLAN — Fix 2: ET-editable tier text, highlights client's actual plan ──
function MyPlan({ clientPlan }) {
  const planName = clientPlan || "Growth";
  return (
    <div style={{ padding:"22px 20px" }}>
      <div style={{ background:C.dark,borderRadius:14,padding:"22px 24px",marginBottom:28,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
        <div>
          <div style={{ fontSize:11,fontFamily:F,fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4 }}>Current Plan</div>
          <div style={{ fontSize:22,fontWeight:700,color:C.white,fontFamily:F }}><ET k="planTierName" style={{ fontSize:22,fontWeight:700,color:C.white,fontFamily:F }}/></div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.5)",fontFamily:F,marginTop:2 }}><ET k="planTierDesc" style={{ fontSize:13,color:"rgba(255,255,255,0.5)",fontFamily:F }}/></div>
        </div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          <BookingBtn style={{ borderColor:"rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)" }}/>
          <Btn style={{ background:C.blue }}>Upgrade Plan</Btn>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16 }}>
        {TIERS.map(t=>{
          const isCurrent = t.name===planName;
          return (
            <div key={t.name} style={{ background:C.white,border:`1.5px solid ${isCurrent?C.blue:C.border}`,borderRadius:14,padding:"22px 20px",position:"relative",boxShadow:isCurrent?`0 0 0 3px ${C.blueSoft}`:"none" }}>
              {t.tag&&<div style={{ position:"absolute",top:-10,left:20,background:isCurrent?C.blue:C.dark,color:C.white,fontSize:10,fontWeight:700,fontFamily:F,padding:"3px 10px",borderRadius:20 }}>{t.tag}</div>}
              <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F }}>{t.name}</div>
              <div style={{ fontSize:22,fontWeight:700,color:isCurrent?C.blue:C.text,fontFamily:F,margin:"6px 0 2px" }}>{t.price}</div>
              <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:16,lineHeight:1.5 }}>{t.desc}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:7,marginBottom:16 }}>
                {[t.requests,t.active,t.turnaround,t.support,...t.extras].map((f,i)=>(
                  <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start" }}><span style={{ color:C.success,fontSize:12,marginTop:1,flexShrink:0 }}>✓</span><span style={{ fontSize:12,fontFamily:F,color:C.text,lineHeight:1.45 }}>{f}</span></div>
                ))}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:12,marginBottom:14 }}>
                <div style={{ fontSize:11,fontFamily:F,fontWeight:600,color:C.textMute,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Includes</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{t.services.map(s=><Tag key={s} label={s}/>)}</div>
              </div>
              <Btn style={{ width:"100%",justifyContent:"center",background:isCurrent?C.blue:C.grey2,color:isCurrent?C.white:C.text }}>{isCurrent?"★ Current Plan":"Switch to "+t.name}</Btn>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign:"center",marginTop:18,fontSize:12,color:C.textMute,fontFamily:F }}>Cancel anytime · No long-term commitments · Unlimited support</div>
    </div>
  );
}

// ─── ADMIN OVERVIEW ───────────────────────────────────────────────
function AdminOverview({ clients, queue, setActive }) {
  const active = clients.filter(c=>c.status==="Active");
  const totalMRR = active.reduce((a,c)=>a+clientMRR(c),0);
  const overCap  = clients.filter(c=>isOverCap(c)&&c.status==="Active");
  return (
    <div style={{ padding:"22px 20px",maxWidth:980 }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:3 }}>Good morning 👋</div>
        <div style={{ fontSize:24,fontWeight:700,color:C.text,fontFamily:F,letterSpacing:"-0.02em" }}>Welcome back, Maryam</div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24 }}>
        {[
          { label:"Monthly Revenue",  value:`$${totalMRR.toLocaleString()}`,  color:C.success },
          { label:"Active Clients",   value:active.length,                     color:C.blue },
          { label:"Briefs to Review", value:queue.length,                      color:queue.length>0?C.warn:C.success },
          { label:"Over Cap",         value:overCap.length,                    color:overCap.length>0?C.danger:C.success },
        ].map(k=>(
          <div key={k.label} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px" }}>
            <div style={{ fontSize:26,fontWeight:700,color:k.color,fontFamily:F }}>{k.value}</div>
            <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      {queue.length>0&&<div onClick={()=>setActive("admin-queue")} style={{ background:C.warnBg,border:`1px solid #FCD34D`,borderRadius:12,padding:"14px 18px",marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:12 }}><span style={{ fontSize:20 }}>⏳</span><div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:600,fontFamily:F,color:C.dark }}>{queue.length} brief{queue.length>1?"s":""} waiting for your approval</div></div><Btn size="sm">Review →</Btn></div>}
      {overCap.length>0&&<div style={{ background:C.dangerBg,border:`1px solid #FCA5A5`,borderRadius:12,padding:"14px 18px",marginBottom:16 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.danger,marginBottom:8 }}>⚠️ {overCap.length} client{overCap.length>1?"s":""} at or over cap</div>{overCap.map(c=><div key={c.id} style={{ fontSize:12,fontFamily:F,color:C.danger,display:"flex",alignItems:"center",gap:8,marginBottom:4 }}><Av initials={c.initials} color={c.color} size={22}/><span><strong>{c.name}</strong> — {c.used}/{clientCap(c)} used</span></div>)}</div>}
      <div style={{ fontSize:15,fontWeight:600,color:C.text,fontFamily:F,marginBottom:12 }}>Client Usage This Month</div>
      {active.map(c=>{ const pct=usagePct(c); const over=isOverCap(c); const barColor=pct>=100?C.danger:pct>=80?C.warn:C.blue; return (
        <div key={c.id} style={{ background:C.white,border:`1px solid ${over?C.danger:C.border}`,borderRadius:12,padding:"14px 18px",marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
            <Av initials={c.initials} color={c.color} size={34}/>
            <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}>{c.name} <span style={{ fontWeight:400,color:C.textSub }}>— {c.company}</span></div><div style={{ fontSize:11,color:C.textSub,fontFamily:F }}>{c.plan} Plan · {c.used}/{clientCap(c)} requests · ${clientMRR(c).toLocaleString()}/mo</div></div>
            {over&&<span style={{ background:C.dangerBg,color:C.danger,fontSize:11,fontWeight:700,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>Over cap</span>}
          </div>
          <div style={{ height:6,background:C.grey2,borderRadius:10,overflow:"hidden" }}><div style={{ height:"100%",width:`${Math.min(pct,100)}%`,background:barColor,borderRadius:10 }}/></div>
        </div>
      );})}
    </div>
  );
}

// ─── ADMIN CLIENTS ────────────────────────────────────────────────
function AdminClients({ clients, setClients, queue, setQueue, setProjects, setNextMonth, setViewingClient, setIsAdmin }) {
  const [showInvite,  setShowInvite]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(null);
  const [showDecline, setShowDecline] = useState(null);
  const [showDelete,  setShowDelete]  = useState(null);
  const [deliveryDates, setDeliveryDates] = useState({});
  const [declineNote, setDeclineNote] = useState("");
  const [editCap,     setEditCap]     = useState("");
  const [invite, setInvite] = useState({ name:"", company:"", email:"", plan:"Growth" });
  const [saving, setSaving] = useState(false);

  const sendInvite = async () => {
    if (!invite.name||!invite.email) return;
    setSaving(true);
    const { data } = await addClient({ name:invite.name, company:invite.company, email:invite.email, plan:invite.plan, status:"Pending", color:randomColor(), initials:toInitials(invite.name), cap_override:null, used:0, revisions:0 });
    if (data) setClients(prev=>[...prev,data]);
    setInvite({ name:"",company:"",email:"",plan:"Growth" }); setShowInvite(false); setSaving(false);
  };

  const saveCapOverride = async (client) => {
    const val = parseInt(editCap);
    const capVal = !isNaN(val)&&val>0 ? val : null;
    await updateClient(client.id, { cap_override:capVal });
    setClients(prev=>prev.map(c=>c.id===client.id?{...c,cap_override:capVal}:c));
    setShowEdit(null); setEditCap("");
  };

  const approveQ = async (item) => {
    const { data } = await addProject({ client_id:item.client_id, client_name:item.client_name, title:item.title, status:"To Do", deadline:item.deadline, delivery:deliveryDates[item.id]||null, priority:item.priority||"Medium", tags:item.tags||[], brief:item.brief, revisions:0, max_revisions:2, initials:toInitials(item.client_name||""), color:randomColor() });
    if (data) { setProjects(p=>[...p,data]); await updateBrief(item.id,{ status:"Approved" }); setQueue(q=>q.filter(i=>i.id!==item.id)); }
  };

  const declineQ = async (item) => {
    const { data } = await addNextMonth({ client_id:item.client_id, client_name:item.client_name, title:item.title, tags:item.tags||[], reason:declineNote||"Over monthly capacity" });
    if (data) { setNextMonth(n=>[...n,data]); await updateBrief(item.id,{ status:"Declined" }); setQueue(q=>q.filter(i=>i.id!==item.id)); }
    setShowDecline(null); setDeclineNote("");
  };

  const removeClient = async (c) => {
    await deleteClient(c.id);
    setClients(prev=>prev.filter(x=>x.id!==c.id));
    setShowDelete(null);
  };

  const totalMRR = clients.filter(c=>c.status==="Active").reduce((a,c)=>a+clientMRR(c),0);

  return (
    <div style={{ padding:"22px 20px",maxWidth:980 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div style={{ fontSize:15,fontWeight:600,color:C.text,fontFamily:F }}>{clients.filter(c=>c.status==="Active").length} active clients · <span style={{ color:C.success }}>${totalMRR.toLocaleString()}/mo</span></div>
        <Btn onClick={()=>setShowInvite(true)}>+ Invite Client</Btn>
      </div>

      {queue.length>0&&(
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13,fontWeight:600,color:C.warn,fontFamily:F,marginBottom:12 }}>⏳ {queue.length} brief{queue.length>1?"s":""} waiting for approval</div>
          {queue.map(item=>(
            <div key={item.id} style={{ background:C.white,border:`1.5px solid #FCD34D`,borderRadius:12,padding:"16px 20px",marginBottom:10 }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
                <div style={{ flex:1,minWidth:200 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:2 }}>{item.title}</div>
                  <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:8 }}>from <strong>{item.client_name}</strong> · {new Date(item.submitted_at).toLocaleDateString()} · Deadline {fmt(item.deadline)}</div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}><Badge status="Pending Approval"/>{(item.tags||[]).map(t=><Tag key={t} label={t}/>)}</div>
                  {item.brief&&<div style={{ fontSize:12,color:C.dark2,fontFamily:F,lineHeight:1.55,background:C.grey1,padding:"10px 13px",borderRadius:8,border:`1px solid ${C.border}`,marginTop:10 }}>{item.brief}</div>}
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",flexShrink:0 }}>
                  <div>
                    <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em" }}>Delivery Date</div>
                    <input type="date" value={deliveryDates[item.id]||""} onChange={e=>setDeliveryDates(d=>({...d,[item.id]:e.target.value}))} style={{ fontFamily:F,fontSize:12,padding:"7px 10px",border:`1.5px solid ${C.border}`,borderRadius:8,color:C.text,outline:"none",background:C.white }}/>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <Btn variant="danger" size="sm" onClick={()=>setShowDecline(item)}>Next Month</Btn>
                    <Btn variant="success" size="sm" onClick={()=>approveQ(item)} disabled={!deliveryDates[item.id]}>✓ Approve</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {clients.map(c=>{ const cap=clientCap(c); const pct=usagePct(c); const over=isOverCap(c); const barColor=pct>=100?C.danger:pct>=80?C.warn:C.blue; return (
        <div key={c.id} style={{ background:C.white,border:`1px solid ${over&&c.status==="Active"?C.danger:C.border}`,borderRadius:12,padding:"16px 20px",marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap" }}>
            <Av initials={c.initials} color={c.color} size={40}/>
            <div style={{ flex:1,minWidth:180 }}>
              <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:2 }}>{c.name}</div>
              <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:8 }}>{c.company} · {c.email}</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:c.status==="Active"?10:0 }}>
                <span style={{ background:c.plan==="Pro"?C.dark:c.plan==="Growth"?C.blueSoft:C.grey2,color:c.plan==="Pro"?C.white:c.plan==="Growth"?C.blue:C.textSub,fontSize:11,fontWeight:600,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>{c.plan} Plan</span>
                <span style={{ background:c.status==="Active"?C.successBg:C.warnBg,color:c.status==="Active"?C.success:C.warn,fontSize:11,fontWeight:600,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>{c.status}</span>
                {over&&c.status==="Active"&&<span style={{ background:C.dangerBg,color:C.danger,fontSize:11,fontWeight:700,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>⚠ Over cap</span>}
                {c.cap_override&&<span style={{ background:C.purpleBg,color:C.purple,fontSize:11,fontWeight:600,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>Custom cap: {c.cap_override}</span>}
              </div>
              {c.status==="Active"&&(<div><div style={{ height:6,background:C.grey2,borderRadius:10,overflow:"hidden",marginBottom:4 }}><div style={{ height:"100%",width:`${Math.min(pct,100)}%`,background:barColor,borderRadius:10,transition:"width 0.4s" }}/></div><div style={{ fontSize:11,color:C.textMute,fontFamily:F }}>{c.used}/{cap} requests · {c.revisions||0}/2 revisions</div></div>)}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0 }}>
              <div style={{ fontSize:16,fontWeight:700,color:C.success,fontFamily:F }}>${clientMRR(c).toLocaleString()}/mo</div>
              <Btn size="sm" onClick={()=>{ setViewingClient(c); setIsAdmin(false); }}>👁 View Portal</Btn>
              <Btn variant="secondary" size="sm" onClick={()=>{ setShowEdit(c); setEditCap(c.cap_override?.toString()||""); }}>⚙ Override Cap</Btn>
              <Btn variant="danger" size="sm" onClick={()=>setShowDelete(c)}>🗑 Remove</Btn>
            </div>
          </div>
        </div>
      );})}

      {showInvite&&(<Modal onClose={()=>setShowInvite(false)} width={500}><div style={{ padding:"26px 28px" }}>
        <div style={{ fontSize:17,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Invite a New Client</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:20 }}>They'll receive an email with their login link.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <Inp label="Full Name" placeholder="e.g. Karina Vindels" value={invite.name} onChange={e=>setInvite({...invite,name:e.target.value})}/>
          <Inp label="Company" placeholder="e.g. Vindels Legal" value={invite.company} onChange={e=>setInvite({...invite,company:e.target.value})}/>
          <Inp label="Email Address" type="email" placeholder="karina@vindels.ca" value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})}/>
          <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
            <label style={{ fontSize:12,fontWeight:600,color:C.textSub,fontFamily:F }}>Plan</label>
            <div style={{ display:"flex",gap:8 }}>
              {["Essential","Growth","Pro"].map(p=>(
                <button key={p} onClick={()=>setInvite({...invite,plan:p})} style={{ flex:1,padding:"10px",borderRadius:8,border:`1.5px solid ${invite.plan===p?C.blue:C.border}`,background:invite.plan===p?C.blueSoft:C.white,color:invite.plan===p?C.blue:C.textSub,fontSize:13,fontWeight:600,fontFamily:F,cursor:"pointer",transition:"all 0.12s" }}>
                  {p}<div style={{ fontSize:10,fontWeight:400,marginTop:2 }}>{TIER_CAPS[p]} req/mo</div>
                </button>
              ))}
            </div>
          </div>
          {invite.name&&invite.email&&<div style={{ background:C.grey1,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px" }}><div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8 }}>Invite Preview</div><div style={{ fontSize:13,fontFamily:F,color:C.text,lineHeight:1.6 }}>Hi <strong>{invite.name.split(" ")[0]}</strong>, Maryam has invited you to your Pixie Creative client portal. You're on the <strong>{invite.plan}</strong> plan with up to <strong>{TIER_CAPS[invite.plan]} design requests/month</strong>.</div></div>}
          <div style={{ display:"flex",gap:10,marginTop:4 }}>
            <Btn variant="ghost" onClick={()=>setShowInvite(false)}>Cancel</Btn>
            <Btn onClick={sendInvite} disabled={!invite.name||!invite.email||saving}>{saving?"Sending...":"Send Invite →"}</Btn>
          </div>
        </div>
      </div></Modal>)}

      {showEdit&&(<Modal onClose={()=>setShowEdit(null)} width={440}><div style={{ padding:"26px 28px" }}>
        <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Override Cap — {showEdit.name}</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:6 }}>Default for <strong>{showEdit.plan}</strong>: <strong>{TIER_CAPS[showEdit.plan]} requests/mo</strong></div>
        <div style={{ fontSize:12,color:C.textMute,fontFamily:F,marginBottom:16 }}>Leave blank to reset to plan default. Client never sees this.</div>
        <Inp label="Custom Monthly Cap" type="number" placeholder={`Default: ${TIER_CAPS[showEdit.plan]}`} value={editCap} onChange={e=>setEditCap(e.target.value)} style={{ marginBottom:16 }}/>
        <div style={{ display:"flex",gap:10 }}>
          <Btn variant="ghost" onClick={()=>setShowEdit(null)}>Cancel</Btn>
          <Btn onClick={()=>saveCapOverride(showEdit)}>Save Override</Btn>
        </div>
      </div></Modal>)}

      {showDecline&&(<Modal onClose={()=>setShowDecline(null)} width={460}><div style={{ padding:"26px 28px" }}>
        <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Move to Next Month</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:16 }}>Add a note for <strong>{showDecline.client_name}</strong>.</div>
        <Txt placeholder="e.g. We're at capacity this month — queued for June 1st." value={declineNote} onChange={e=>setDeclineNote(e.target.value)} style={{ marginBottom:16 }}/>
        <div style={{ display:"flex",gap:10 }}>
          <Btn variant="ghost" onClick={()=>setShowDecline(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={()=>declineQ(showDecline)}>Confirm & Move</Btn>
        </div>
      </div></Modal>)}

      {showDelete&&(<Modal onClose={()=>setShowDelete(null)} width={440}><div style={{ padding:"26px 28px" }}>
        <div style={{ width:48,height:48,borderRadius:"50%",background:C.dangerBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16 }}>🗑</div>
        <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6 }}>Remove {showDelete.name}?</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:16,lineHeight:1.6 }}>This will permanently remove <strong>{showDelete.name}</strong> and all their data.</div>
        <div style={{ background:C.dangerBg,border:`1px solid #FCA5A5`,borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:12,fontFamily:F,color:C.danger }}>⚠️ This cannot be undone.</div>
        <div style={{ display:"flex",gap:10 }}>
          <Btn variant="ghost" onClick={()=>setShowDelete(null)} style={{ flex:1,justifyContent:"center" }}>Cancel</Btn>
          <Btn variant="danger" style={{ flex:1,justifyContent:"center" }} onClick={()=>removeClient(showDelete)}>Yes, Remove</Btn>
        </div>
      </div></Modal>)}
    </div>
  );
}

// ─── ADMIN QUEUE ──────────────────────────────────────────────────
function AdminQueue({ queue, setQueue, setProjects, setNextMonth }) {
  const [deliveryDates, setDeliveryDates] = useState({});
  const [showDecline, setShowDecline] = useState(null);
  const [declineNote, setDeclineNote] = useState("");

  const approve = async (item) => {
    const { data } = await addProject({ client_id:item.client_id, client_name:item.client_name, title:item.title, status:"To Do", deadline:item.deadline, delivery:deliveryDates[item.id]||null, priority:item.priority||"Medium", tags:item.tags||[], brief:item.brief, revisions:0, max_revisions:2, initials:toInitials(item.client_name||""), color:randomColor() });
    if (data) { setProjects(p=>[...p,data]); await updateBrief(item.id,{ status:"Approved" }); setQueue(q=>q.filter(i=>i.id!==item.id)); }
  };

  const decline = async (item) => {
    const { data } = await addNextMonth({ client_id:item.client_id, client_name:item.client_name, title:item.title, tags:item.tags||[], reason:declineNote||"Over monthly capacity" });
    if (data) { setNextMonth(n=>[...n,data]); await updateBrief(item.id,{ status:"Declined" }); setQueue(q=>q.filter(i=>i.id!==item.id)); }
    setShowDecline(null); setDeclineNote("");
  };

  return (
    <div style={{ padding:"22px 20px",maxWidth:860 }}>
      {queue.length===0?<div style={{ textAlign:"center",padding:"60px 20px" }}><div style={{ fontSize:40,marginBottom:14 }}>✓</div><div style={{ fontSize:16,fontWeight:600,fontFamily:F,color:C.text,marginBottom:6 }}>All caught up!</div></div>
      :queue.map(item=>(
        <div key={item.id} style={{ background:C.white,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"22px",marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap" }}>
            <div style={{ flex:1,minWidth:240 }}>
              <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>{item.title}</div>
              <div style={{ fontSize:12,color:C.textSub,fontFamily:F,marginBottom:10 }}>From <strong>{item.client_name}</strong> · {new Date(item.submitted_at).toLocaleDateString()} · Deadline <strong>{fmt(item.deadline)}</strong></div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:item.brief?12:0 }}><Badge status="Pending Approval"/>{(item.tags||[]).map(t=><Tag key={t} label={t}/>)}</div>
              {item.brief&&<div style={{ fontSize:13,color:C.dark2,fontFamily:F,lineHeight:1.6,background:C.grey1,padding:"12px 14px",borderRadius:10,border:`1px solid ${C.border}`,marginTop:10 }}>{item.brief}</div>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end",flexShrink:0 }}>
              <div>
                <div style={{ fontSize:11,fontWeight:600,color:C.textMute,fontFamily:F,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.04em" }}>Your Delivery Date</div>
                <input type="date" value={deliveryDates[item.id]||""} onChange={e=>setDeliveryDates(d=>({...d,[item.id]:e.target.value}))} style={{ fontFamily:F,fontSize:13,padding:"8px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,color:C.text,outline:"none",background:C.white,width:160 }}/>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <Btn variant="danger" size="sm" onClick={()=>setShowDecline(item)}>→ Next Month</Btn>
                <Btn variant="success" size="sm" onClick={()=>approve(item)} disabled={!deliveryDates[item.id]}>✓ Approve</Btn>
              </div>
              {!deliveryDates[item.id]&&<div style={{ fontSize:11,color:C.textMute,fontFamily:F }}>Set a delivery date to approve</div>}
            </div>
          </div>
        </div>
      ))}
      {showDecline&&(<Modal onClose={()=>setShowDecline(null)} width={480}><div style={{ padding:"26px 28px" }}>
        <div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>Move to Next Month</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:16 }}><strong>{showDecline.title}</strong> from {showDecline.client_name} will be queued for next month.</div>
        <Txt placeholder="e.g. We're at capacity this month — scheduled for June 1st." value={declineNote} onChange={e=>setDeclineNote(e.target.value)} style={{ marginBottom:16 }}/>
        <div style={{ display:"flex",gap:10 }}>
          <Btn variant="ghost" onClick={()=>setShowDecline(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={()=>decline(showDecline)}>Confirm & Move</Btn>
        </div>
      </div></Modal>)}
    </div>
  );
}

// ─── ADMIN CAPACITY ───────────────────────────────────────────────
function AdminCapacity({ clients, nextMonth }) {
  const active = clients.filter(c=>c.status==="Active");
  return (
    <div style={{ padding:"22px 20px",maxWidth:860 }}>
      <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:20 }}>Each client's cap is based on their plan. Only you can see these numbers.</div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:12 }}>Per-Client Usage — This Month</div>
        {active.map(c=>{ const cap=clientCap(c); const pct=usagePct(c); const over=isOverCap(c); const barColor=pct>=100?C.danger:pct>=80?C.warn:C.blue; return (
          <div key={c.id} style={{ background:C.white,border:`1px solid ${over?C.danger:C.border}`,borderRadius:12,padding:"16px 18px",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
              <Av initials={c.initials} color={c.color} size={32}/>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{c.name} <span style={{ fontWeight:400,color:C.textSub }}>· {c.plan} Plan</span></div></div>
              <div style={{ fontSize:13,fontWeight:700,fontFamily:F,color:barColor }}>{c.used}/{cap} requests</div>
              {over&&<span style={{ background:C.dangerBg,color:C.danger,fontSize:11,fontWeight:700,fontFamily:F,padding:"2px 9px",borderRadius:20 }}>Over cap</span>}
            </div>
            <div style={{ height:8,background:C.grey2,borderRadius:10,overflow:"hidden" }}><div style={{ height:"100%",width:`${Math.min(pct,100)}%`,background:barColor,borderRadius:10 }}/></div>
            <div style={{ fontSize:11,color:C.textMute,fontFamily:F,marginTop:5 }}>Cap: {cap} req/mo {c.cap_override?"(custom override)":"("+c.plan+" default)"}</div>
          </div>
        );})}
      </div>
      <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px" }}>
        <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:4 }}>Next Month Queue</div>
        <div style={{ fontSize:13,color:C.textSub,fontFamily:F,marginBottom:14 }}>Scheduled for next month.</div>
        {nextMonth.length===0?<div style={{ textAlign:"center",padding:"20px",color:C.textMute,fontFamily:F,fontSize:13 }}>Nothing queued — all good! 🎉</div>
        :nextMonth.map(item=>(
          <div key={item.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.purpleBg,border:`1px solid #C4B5FD`,borderRadius:10,marginBottom:8 }}>
            <span>📅</span>
            <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{item.title}</div><div style={{ fontSize:12,color:C.textSub,fontFamily:F }}>{item.client_name} · {item.reason}</div></div>
            <Badge status="Next Month"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN REVENUE ────────────────────────────────────────────────
function AdminRevenue({ clients }) {
  const active = clients.filter(c=>c.status==="Active");
  const totalMRR = active.reduce((a,c)=>a+clientMRR(c),0);
  const totalARR = totalMRR*12;
  const byPlan = ["Essential","Growth","Pro"].map(p=>({ plan:p, count:active.filter(c=>c.plan===p).length, mrr:active.filter(c=>c.plan===p).reduce((a,c)=>a+clientMRR(c),0) }));
  return (
    <div style={{ padding:"22px 20px",maxWidth:860 }}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:24 }}>
        {[
          { label:"Monthly Recurring Revenue", value:`$${totalMRR.toLocaleString()}`, color:C.success },
          { label:"Annual Run Rate",            value:`$${totalARR.toLocaleString()}`, color:C.blue },
          { label:"Avg / Client",               value:`$${active.length?Math.round(totalMRR/active.length).toLocaleString():0}`, color:C.info },
          { label:"Active Clients",             value:active.length, color:C.purple },
        ].map(k=>(
          <div key={k.label} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px" }}>
            <div style={{ fontSize:24,fontWeight:700,color:k.color,fontFamily:F }}>{k.value}</div>
            <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px",marginBottom:20 }}>
        <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:16 }}>Revenue by Plan</div>
        {byPlan.map(p=>{ const pct=totalMRR?Math.round((p.mrr/totalMRR)*100):0; return (
          <div key={p.plan} style={{ marginBottom:16 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
              <span style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{p.plan} <span style={{ fontWeight:400,color:C.textSub }}>({p.count} client{p.count!==1?"s":""})</span></span>
              <span style={{ fontSize:13,fontWeight:700,fontFamily:F,color:C.success }}>${p.mrr.toLocaleString()}/mo</span>
            </div>
            <div style={{ height:8,background:C.grey2,borderRadius:10,overflow:"hidden" }}><div style={{ height:"100%",width:`${pct}%`,background:p.plan==="Pro"?C.dark:p.plan==="Growth"?C.blue:C.info,borderRadius:10 }}/></div>
            <div style={{ fontSize:11,color:C.textMute,fontFamily:F,marginTop:4 }}>{pct}% of MRR</div>
          </div>
        );})}
      </div>
      <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px" }}>
        <div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F,marginBottom:14 }}>Client Billing</div>
        {active.map((c,i)=>(
          <div key={c.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderTop:i>0?`1px solid ${C.border}`:"none" }}>
            <Av initials={c.initials} color={c.color} size={28}/>
            <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,fontFamily:F,color:C.text }}>{c.name}</div><div style={{ fontSize:11,color:C.textMute,fontFamily:F }}>{c.company}</div></div>
            <Tag label={c.plan}/>
            <div style={{ fontSize:14,fontWeight:700,color:C.success,fontFamily:F,minWidth:80,textAlign:"right" }}>${clientMRR(c).toLocaleString()}/mo</div>
          </div>
        ))}
        <div style={{ borderTop:`2px solid ${C.border}`,marginTop:8,paddingTop:12,display:"flex",justifyContent:"space-between" }}>
          <div style={{ fontSize:13,fontWeight:700,color:C.text,fontFamily:F }}>Total MRR</div>
          <div style={{ fontSize:15,fontWeight:700,color:C.success,fontFamily:F }}>${totalMRR.toLocaleString()}/mo</div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [isAdmin, setIsAdmin]             = useState(false);
  const [active, setActive]               = useState("dashboard");
  const [adminActive, setAdminActive]     = useState("admin-dashboard");
  const [projects, setProjects]           = useState([]);
  const [queue, setQueue]                 = useState([]);
  const [nextMonth, setNextMonth]         = useState([]);
  const [clients, setClients]             = useState([]);
  const [content, setContent]             = useState(INIT_CONTENT);
  const [editMode, setEditMode]           = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [loading, setLoading]             = useState(true);

  // Fix 5: per-client data scoping — filter by client_id when viewing a specific client
  const portalClient = viewingClient || null;
  const scopedProjects  = portalClient ? projects.filter(p=>p.client_id===portalClient.id)  : projects;
  const scopedQueue     = portalClient ? queue.filter(q=>q.client_id===portalClient.id)     : queue;
  const scopedNextMonth = portalClient ? nextMonth.filter(n=>n.client_id===portalClient.id) : nextMonth;

  // Fix 2: auto-sync planTierName / planTierDesc in content to the viewed client's plan
  const planName = portalClient?.plan || "Growth";
  const planTier = TIERS.find(t=>t.name===planName) || TIERS[1];
  const derivedContent = {
    ...content,
    planTierName: planTier.name + " Plan",
    planTierDesc: planTier.price + " · " + planTier.requests,
  };

  useEffect(()=>{
    const load = async () => {
      const [c, p, b, nm, ct] = await Promise.all([
        getClients(), getProjects(), getBriefs(), getNextMonth(), getContent()
      ]);
      setClients(c.data||[]);
      setProjects(p.data||[]);
      setQueue((b.data||[]).filter(x=>x.status==="Pending"));
      setNextMonth(nm.data||[]);
      if (ct.data) {
        const contentMap = ct.data.reduce((a,row)=>({...a,[row.key]:row.value}),{});
        setContent(prev=>({...prev,...contentMap}));
      }
      setLoading(false);
    };
    load();
  },[]);

  const clientUser = portalClient
    ? { name:portalClient.name, initials:portalClient.initials, plan:(portalClient.plan||"Growth")+" Plan" }
    : { name:"Client", initials:"C", plan:"Growth Plan" };

  const clientTitles = { dashboard:"Dashboard",projects:"Projects",queue:"Submitted Briefs",nextmonth:"Next Month Queue",brief:"Submit Brief",brand:"Brand Library",assets:"Files & Assets",plan:"My Plan" };
  const adminTitles  = { "admin-dashboard":"Overview","admin-clients":"Clients","admin-queue":"Approval Queue","admin-capacity":"Capacity","admin-revenue":"Revenue" };
  const curTitle = isAdmin?(adminTitles[adminActive]||"Admin"):(clientTitles[active]||"Dashboard");
  const backToAdmin = () => { setIsAdmin(true); setViewingClient(null); setAdminActive("admin-clients"); setEditMode(false); };

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:16 }}>
      <div style={{ width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.blue}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:14,color:C.textSub,fontFamily:F }}>Loading your portal...</div>
    </div>
  );

  return (
    <ContentCtx.Provider value={{ content:derivedContent, setContent, editMode }}>
    <div style={{ display:"flex",height:"100vh",overflow:"hidden",fontFamily:F,background:C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#E2E5EA;border-radius:10px;}
        .menu-btn{display:none!important;}
        @media(max-width:720px){.menu-btn{display:flex!important;}.desk-sidebar{display:none!important;}}
      `}</style>

      <div className="desk-sidebar" style={{ flexShrink:0,display:"flex" }}>
        {isAdmin
          ?<AdminSidebar active={adminActive} setActive={setAdminActive} queueCount={queue.length}/>
          :<Sidebar active={active} setActive={setActive} queueCount={scopedQueue.length} user={clientUser}/>}
      </div>

      {menuOpen&&(
        <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex" }}>
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.4)" }} onClick={()=>setMenuOpen(false)}/>
          <div style={{ position:"relative",zIndex:1,height:"100%" }}>
            {isAdmin
              ?<AdminSidebar active={adminActive} setActive={setAdminActive} queueCount={queue.length} onClose={()=>setMenuOpen(false)}/>
              :<Sidebar active={active} setActive={setActive} queueCount={scopedQueue.length} user={clientUser} onClose={()=>setMenuOpen(false)}/>}
          </div>
        </div>
      )}

      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {editMode&&(
          <div style={{ background:`linear-gradient(90deg,${C.blue},#7C3AED)`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <span>✏️</span>
              <span style={{ fontSize:12,fontFamily:F,color:C.white,fontWeight:600 }}>Edit Mode — click any text to edit it in place</span>
            </div>
            <Btn size="sm" onClick={()=>setEditMode(false)} style={{ background:"rgba(255,255,255,0.15)",color:C.white,border:"1px solid rgba(255,255,255,0.3)" }}>Done Editing</Btn>
          </div>
        )}

        {!isAdmin&&viewingClient&&(
          <div style={{ background:C.dark,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <Av initials={viewingClient.initials} color={viewingClient.color} size={26}/>
              <div style={{ fontSize:13,fontFamily:F,color:"rgba(255,255,255,0.7)" }}>Viewing <strong style={{ color:C.white }}>{viewingClient.name}'s portal</strong> — {viewingClient.company} · {viewingClient.plan} Plan</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <Btn size="sm" onClick={()=>setEditMode(e=>!e)} style={{ background:editMode?"rgba(37,99,235,0.4)":"rgba(255,255,255,0.1)",color:C.white,border:`1px solid ${editMode?C.blue:"rgba(255,255,255,0.2)"}` }}>{editMode?"✏️ Editing...":"✏️ Edit Text"}</Btn>
              <Btn size="sm" onClick={backToAdmin} style={{ background:"rgba(255,255,255,0.1)",color:C.white,border:"1px solid rgba(255,255,255,0.2)" }}>← Back to Admin</Btn>
            </div>
          </div>
        )}

        <Topbar title={curTitle} onMenu={()=>setMenuOpen(true)}
          actions={<>
            <ViewToggle isAdmin={isAdmin} setIsAdmin={v=>{ setIsAdmin(v); if(v){ setViewingClient(null); setEditMode(false); } }}/>
            {isAdmin&&<Btn size="sm" variant="secondary" onClick={()=>{ setIsAdmin(false); setEditMode(true); }} style={{ fontSize:12 }}>✏️ Edit Portal Text</Btn>}
            {!isAdmin&&!viewingClient&&<><BookingBtn/>{active!=="brief"&&<Btn size="sm" onClick={()=>setActive("brief")}>+ New Brief</Btn>}</>}
            <Av initials={isAdmin?"M":clientUser.initials} color={C.blue} size={32}/>
          </>}
        />

        <div style={{ flex:1,overflowY:"auto" }}>
          {isAdmin?(<>
            {adminActive==="admin-dashboard"&&<AdminOverview clients={clients} queue={queue} setActive={setAdminActive}/>}
            {adminActive==="admin-clients"  &&<AdminClients clients={clients} setClients={setClients} queue={queue} setQueue={setQueue} setProjects={setProjects} setNextMonth={setNextMonth} setViewingClient={setViewingClient} setIsAdmin={setIsAdmin}/>}
            {adminActive==="admin-queue"    &&<AdminQueue queue={queue} setQueue={setQueue} setProjects={setProjects} setNextMonth={setNextMonth}/>}
            {adminActive==="admin-capacity" &&<AdminCapacity clients={clients} nextMonth={nextMonth}/>}
            {adminActive==="admin-revenue"  &&<AdminRevenue clients={clients}/>}
          </>):(<>
            {active==="dashboard"&&<Dashboard projects={scopedProjects} queue={scopedQueue} nextMonth={scopedNextMonth} setActive={setActive} clientData={portalClient}/>}
            {active==="projects" &&<Projects projects={scopedProjects} setProjects={setProjects}/>}
            {active==="queue"    &&<SubmittedBriefs queue={scopedQueue}/>}
            {active==="nextmonth"&&<NextMonth items={scopedNextMonth}/>}
            {active==="brief"    &&<BriefSubmit setQueue={setQueue} clientId={portalClient?.id} clientName={portalClient?.name||"Client"}/>}
            {active==="brand"    &&<BrandLibrary clientId={portalClient?.id}/>}
            {active==="assets"   &&<AssetsPage clientId={portalClient?.id}/>}
            {active==="plan"     &&<MyPlan clientPlan={portalClient?.plan||"Growth"}/>}
          </>)}
        </div>
      </div>
    </div>
    </ContentCtx.Provider>
  );
}
