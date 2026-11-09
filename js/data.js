// Healthzilla shared data: Jahan's gym catalog, plan, maps, foods, research.
// Source of truth: /workspace/health/gym/plan_v1.md (Nov 9, 2026)
export const PROGRAM_START = '2026-11-09'; // Monday, Week 1
export const YT = id => `https://www.youtube.com/watch?v=${id}`;

export const DAYS = {
  pushA: { name: 'Push A', floor: 'L', plan: true, desc: 'Chest, shoulders, triceps' },
  pullA: { name: 'Pull A', floor: 'L', plan: true, desc: 'Back, rear delts, biceps' },
  legs:  { name: 'Legs + Core', floor: 'U', plan: true, desc: 'Upper floor legs + core' },
  ppb:   { name: 'Push-Pull B', floor: 'L', plan: true, desc: 'Mixed push/pull (from Week 2)' },
  bicep: { name: 'Bicep', floor: 'L', plan: false },
  tricep:{ name: 'Tricep', floor: 'L', plan: false },
  leg:   { name: 'Leg', floor: 'U', plan: false },
  back:  { name: 'Back', floor: 'L', plan: false },
  pull:  { name: 'Pull', floor: 'L', plan: false },
};

// role: warmup | main | acc | core | finisher | swap ; weeks [from,to] limits within plan days
// days: map of dayKey -> order. likeness: generated clip in /videos/likeness/
export const EX = [
 { id:'skierg_wu', name:'SkiErg warm-up', role:'warmup', floor:'L', zone:'Z5', vid:'B0lIgT5PHc8', days:{pushA:1,pullA:1,ppb:1},
   cues:'Easy 6-8 min + band pull-aparts. Hinge ~45°, arms finish by thighs.', swap:'5 min upstairs rower or elliptical', unit:'min' },
 { id:'chest_press', name:'Multi press: chest press', role:'main', floor:'L', zone:'Z6', vid:'sEfN2Gebvag', days:{pushA:2},
   cues:'Handles mid-chest, elbows ~45° from torso, blades back. Exhale on press, 2-3 s return, stop ~5° short of lockout.', swap:'Smith incline press (Z3)', likeness:'push_a_chest_press.mp4' },
 { id:'incline_db', name:'Incline DB press', role:'main', floor:'L', zone:'Z2', vid:'0f6-uCUKqgA', days:{pushA:3},
   cues:'Bench 30°. Elbows 45-60°, forearms vertical. Press up and in, no bouncing.' },
 { id:'shoulder_press', name:'Multi press: shoulder press', role:'acc', floor:'L', zone:'Z6', vid:'tXNiPE_3pIE', days:{pushA:4},
   cues:'Start at chin height, elbows ~30° forward. Back flat, no arching or shrugging.' },
 { id:'pec_fly', name:'Pec fly machine', role:'acc', floor:'L', zone:'Z6', vid:'ON8kg47QpOY', days:{pushA:5},
   cues:'Handles chest height, elbows bent 15-20°. Open only to chest line, squeeze like hugging a tree.' },
 { id:'pushdown', name:'Cable triceps pushdown', role:'acc', floor:'L', zone:'Z4', vid:'2-LAMcpzODU', days:{pushA:6,tricep:1},
   cues:'Upper arms vertical, elbows pinned. 90° to straight, lean 10-15°.' },
 { id:'lat_raise', name:'DB lateral raise', role:'acc', floor:'L', zone:'Z2', vid:'v_ZkxWzYnMc', days:{pushA:7},
   cues:'Light. Arms 15-30° forward, lead with elbows to 90°, 3 s down, no swinging.' },
 { id:'dips', name:'Dips', role:'acc', floor:'L', zone:'Z6', vid:'yN6Q1UI_xkE', days:{pushA:8,tricep:3}, weeks:{pushA:[5,99]},
   cues:'Optional W5-6. Lean 15-30°, elbows to 90°.', swap:'2 extra pushdown sets' },
 { id:'ab_coaster', name:'Ab coaster', role:'core', floor:'L', zone:'Z6', vid:'2FTBFO7IDVs', days:{pushA:9},
   cues:'Arms straight, knees to ~90°, controlled.' },
 { id:'heavy_bag', name:'Heavy bag finisher', role:'finisher', floor:'L', zone:'Z5', vid:'7EHSN5T-ZQE', days:{pushA:10}, unit:'rounds',
   cues:'Gloves/wraps. Lead toes 45°, elbows tucked, chin down. Jab-cross, exhale each punch.',
   rx:['3×1 min / 1 min walk','4×1 min / 1 min walk','5×1 min / 45 s','6×1 min / 45 s','6-8×1 min / 40 s'] },

 { id:'lat_pulldown', name:'Lat pulldown', role:'main', floor:'L', zone:'Z4', vid:'nZip-pdLlQM', days:{pullA:2,back:1,pull:1},
   cues:'Thigh pad snug, grip just outside shoulders. Lean back 10-15°, bar to upper chest. Never behind the neck.', swap:'(replaces pull-ups)', likeness:'pull_a_lat_pulldown.mp4' },
 { id:'cs_tbar', name:'Chest-supported T-bar row', role:'main', floor:'L', zone:'Z6', vid:'TyLoy3n_a10', days:{pullA:3,back:2,pull:2},
   cues:'Chest glued to pad, torso ~45°. Elbows 30-45°, drive past ribs, no jerking.' },
 { id:'seated_row', name:'Seated row machine', role:'acc', floor:'L', zone:'Z6', vid:'0SyFgXnbBBc', days:{pullA:4,back:3,pull:3},
   cues:'Handles mid-chest, torso 90°, elbows ~30°. Pull to lower ribs, no rounding.' },
 { id:'rear_delt', name:'Rear delt machine', role:'acc', floor:'L', zone:'Z6', vid:'6yMdhi2DVao', days:{pullA:5,back:6,pull:4},
   cues:'Face the pad, handles shoulder height, arms ~90° to torso. Sweep out and back, light, no shrugging.' },
 { id:'hs_curl', name:'Hammer Strength biceps curl', role:'acc', floor:'L', zone:'Z6', vid:'TKOG5N0YEV4', vid2:'rwo-3PTM8U4', days:{pullA:6,bicep:1,pull:5},
   cues:'Elbows at the pivot. 3 s lower, full reps, elbows stay down.' },
 { id:'db_hammer', name:'DB hammer curl', role:'acc', floor:'L', zone:'Z2', vid:'8XLxfXROrTo', days:{pullA:7,bicep:3,pull:6},
   cues:'Elbows at sides, palms in, no swinging.' },
 { id:'vkr', name:'Vertical knee raise', role:'core', floor:'L', zone:'Z6', vid:'7KDDZtaUaxw', days:{pullA:8},
   cues:'Back on pad, knees to a 90° hip bend, no swinging.' },
 { id:'skierg_int', name:'SkiErg intervals finisher', role:'finisher', floor:'L', zone:'Z5', vid:'B0lIgT5PHc8', vid2:'pQb2xIGioyQ', days:{pullA:9}, unit:'rounds',
   cues:'Steady, talkable pace. Hinge ~45°.', swap:'Battle rope waves',
   rx:['5×30 s / 60 s','6×30 s / 60 s','8×30 s / 45 s','8×40 s / 40 s','10×40 s / 40 s'] },

 { id:'row_wu', name:'Rower / treadmill warm-up', role:'warmup', floor:'U', zone:'U1', vid:'4zWu1yuJ0_g', vid2:'EZ7OkjYGhdY', days:{legs:1}, unit:'min',
   cues:'5-7 min easy row (legs-body-arms, damper 3-5) or treadmill walk, then 10 box squats, 10 glute bridges, leg swings.' },
 { id:'goblet', name:'Goblet box squat', role:'main', floor:'U', zone:'U4', vid:'j_aozkAccpQ', days:{legs:2,leg:1}, weeks:{legs:[1,2]},
   cues:'Plyo box behind you. Toes out 15-30°, thighs ~parallel, chest tall.' },
 { id:'back_squat', name:'Barbell back squat', role:'main', floor:'U', zone:'U7', vid:'7v_V6xiA_AA', days:{legs:3,leg:2}, weeks:{legs:[3,99]},
   cues:'Safeties just below bottom, empty bar first. Toes out 15-30°, torso lean 30-45°, no breath-holding.', swap:'Belt squat (U8) or Smith squat (2F Z3) if rack busy' },
 { id:'belt_squat', name:'Belt squat', role:'swap', floor:'U', zone:'U8', vid:'LzWYzEMbLXM', days:{legs:4,leg:3},
   cues:'Swap for back squat. Belt at hips, tall torso, knees track over toes.' },
 { id:'leg_press45', name:'45° leg press', role:'main', floor:'U', zone:'U6', vid:'jX1kXo4tnko', days:{legs:5,leg:4},
   cues:'Feet mid-platform, shoulder width. Knees to ~90°, low back flat, never lock knees.', likeness:'legs_leg_press.mp4' },
 { id:'db_rdl', name:'DB Romanian deadlift', role:'main', floor:'U', zone:'U4', vid:'_oyxCn2iSjU', days:{legs:6,leg:6},
   cues:'Knees 15-20°, hinge until torso ~45° / DBs mid-shin. Flat back.', swap:'Hip-thrust machine (U6) if back complains' },
 { id:'hip_thrust', name:'Hip-thrust machine', role:'acc', floor:'U', zone:'U6', vid:'tztHvSLdXLA', vid2:'LGuI48EwHHI', days:{legs:7,leg:7},
   cues:'Pad on hip crease, shins vertical, knees 90° at the top, squeeze glutes.' },
 { id:'seated_lp', name:'Seated leg press', role:'acc', floor:'U', zone:'U6', vid:'30N6fKpuTNo', days:{legs:8,leg:5}, weeks:{legs:[1,3]},
   cues:'Knees start ~90°, push through heels, do not lock out.' },
 { id:'bss', name:'DB Bulgarian split squat', role:'acc', floor:'U', zone:'U4', vid:'hPlKPjohFS0', days:{legs:9,leg:8}, weeks:{legs:[4,99]},
   cues:'Rear foot on bench, lean 10-20°, front knee ~90°.', swap:'Seated leg press' },
 { id:'abductor', name:'Hip abductor machine', role:'acc', floor:'U', zone:'U1', vid:'b-cxonq03vQ', days:{legs:10,leg:9},
   cues:'Abductor setting, pads outside knees. Open 30-45° per side, slow return.' },
 { id:'decline_crunch', name:'Decline crunch (ab bench)', role:'core', floor:'U', zone:'U5', vid:'QhGU5cmNZds', days:{legs:11},
   cues:'Lowest decline ~15-20°, curl 30-45° off the pad.' },
 { id:'pallof', name:'Cable Pallof press', role:'core', floor:'U', zone:'U5', vid:'_2xWmYNnFS8', days:{legs:12},
   cues:'Cable at chest height, press out at 90° to the cable, resist rotation.' },
 { id:'stair_fin', name:'Stair climber / rower finisher', role:'finisher', floor:'U', zone:'U2', vid:'ww3YV_N6U_U', vid2:'4zWu1yuJ0_g', days:{legs:13}, unit:'min',
   cues:'~10° lean, fingertips on rails (or row, damper 3-5).', rx:['3 min easy','5 min','6 min','6-8 min steady','8 min or 6×30 s hard / 60 s easy'] },
 { id:'smith_squat', name:'Smith machine squat', role:'main', floor:'L', zone:'Z3', vid:'fEuYM-miK5U', days:{leg:10},
   cues:'Feet 15-30 cm forward, thighs parallel. (2nd floor)' },

 { id:'smith_incline', name:'Smith incline press', role:'main', floor:'L', zone:'Z3', vid:'b8DqTO6ak0k', days:{ppb:2},
   cues:'Bench 30°, safeties above chest. Elbows 45-60°, 2-3 s down, no bouncing.' },
 { id:'cable_low_row', name:'Cable seated low row', role:'main', floor:'L', zone:'Z7', vid:'vwHG9Jfu4sw', days:{ppb:3,back:4,pull:8},
   cues:'Feet on plates, knees ~15°. Torso upright (≤10° lean back), pull to belly button, no rocking.', likeness:'ppb_cable_low_row.mp4' },
 { id:'landmine_row', name:'Landmine / T-bar row', role:'acc', floor:'L', zone:'Z6', vid:'A0at3sCMsII', days:{ppb:4,back:5,pull:7},
   cues:'Hinge ~45°, knees 15-20°, flat back.', swap:'Chest-supported T-bar row if low back tired' },
 { id:'crossover', name:'Cable crossover fly', role:'acc', floor:'L', zone:'Z4', vid:'hrh0K1Oo7Yc', days:{ppb:5},
   cues:'Pulleys shoulder height, stride forward, lean ~15°, elbows 15-20°, arc together.' },
 { id:'seated_db_press', name:'Seated DB shoulder press', role:'acc', floor:'L', zone:'Z2', vid:'rO_iEImwHyo', days:{ppb:6},
   cues:'Bench 80-90°, back supported. Elbows ~30° forward, ear height to overhead.' },
 { id:'ez_preacher', name:'EZ-bar preacher curl', role:'acc', floor:'L', zone:'Z2', vid:'Gydpcouclx8', days:{ppb:7,bicep:2},
   cues:'Armpits over the pad (~45°), slow lower, stop short of lockout.' },
 { id:'oh_triceps', name:'Cable overhead triceps extension', role:'acc', floor:'L', zone:'Z7', vid:'u4sEGN7FlzQ', days:{ppb:8,tricep:2},
   cues:'Face away, arms by ears, elbows forward, lean ~30°.' },
 { id:'farmer', name:'DB farmer carry', role:'acc', floor:'L', zone:'Track', vid:'NH7Xv-7NQNQ', days:{ppb:9}, unit:'m',
   cues:'Upright, shoulders down, walk the orange track.', rx:['—','2×40 m','3×50 m','3×60 m','4×60 m'] },
 { id:'slam_wall', name:'Slam ball + wall ball finisher', role:'finisher', floor:'L', zone:'Z1', vid:'6vXHh-Lhb2o', vid2:'_KfCGKfP1_g', days:{ppb:10}, unit:'rounds',
   cues:'4-6 kg. Squat ~parallel, wall-ball target ~3 m.', rx:['—','3 rounds (8 slams, 8 wall balls, 30 s walk)','4 rounds','4 rounds + 20 s battle ropes','5 rounds'] },
];

export const RX = {
  main:   ['2×12 @RPE6 · rest 90s','3×12 @RPE6-7 · rest 90s','3×10 @RPE7 · rest 90-120s','3×8-10 @RPE7-8 · rest 2 min','4×8-10 @RPE8 · rest 2 min'],
  acc:    ['2×12-15 @RPE6 · rest 60s','2×12-15 @RPE6-7 · rest 60s','3×12 @RPE7 · rest 60-75s','3×10-12 @RPE7-8 · rest 75s','3×10-12 @RPE8 · rest 75s'],
  core:   ['2×8-10 · rest 45s','2×10-12 · rest 45s','3×10-12 · rest 45s','3×12 · rest 45s','3×12-15 · rest 45s'],
  warmup: ['6 min + ramp set','7 min + ramp set','8 min + ramp set','8 min + ramp set','8 min + ramp set'],
  swap:   null,
};
// top of rep range per role per week (for overload alerts)
export const TOP_REPS = { main:[12,12,10,10,10], acc:[15,15,12,12,12], core:[10,12,12,12,15] };

export const ZONES = {
  Z1:'Combaxx storage: slam/med balls, sandbags, bands, plates, fixed bars',
  Z2:'Bench field + long DB racks on the mirror, preacher + EZ bar',
  Z3:'Smith machine, Olympic flat + decline bench',
  Z4:'Life Fitness multi-jungle (lat pulldown, pushdown, crossover, low row)',
  Z5:'Mezzanine end: SkiErg, heavy bag, wall balls, BOB dummy, turf + ropes',
  Z6:'Machine row by the windows: multi press, pec fly/rear delt, curls, T-bar rows, seated row, VKR/dip, ab coaster',
  Z7:'Champions end: LF dual-pulley + seated row plates, tire station',
  Track:'Orange track loop',
  U1:'Entrance: Concept2 RowErgs, spin bikes, LF hip abductor/adductor',
  U2:'Window row: stair climbers, spin bikes, treadmill row',
  U3:'Inner cardio row: ellipticals, recumbent bikes',
  U4:'Mirror wall: DB rack, kettlebells, adjustable + flat benches, plyo box',
  U5:'Mid-floor beside track: cable/dual-pulley, ab bench, stability ball',
  U6:'Leg cluster: hip-thrust machines, 45° leg press, seated leg press',
  U7:'Far-end corner: squat rack + barbell, band/KB rack',
  U8:'Far end, cardio side: Rogue plate tree, belt squat, landmine, adjustable DBs',
  U9:'Far end beside track: fixed straight + EZ bars',
};

// Weekly layout from plan_v1.md; dow 0=Mon
export const WEEK_LAYOUT = {
  early: { 0:'pushA', 2:'pullA', 4:'legs' }, // W1-2 (+ W2 optional Sat ppb)
  late:  { 0:'pushA', 1:'pullA', 3:'legs', 5:'ppb' }, // W3+
};

export const FOODS = [
 ['Banana (1 medium)',105,1],['Apple (1)',95,0],['Dates (3)',200,2],['Boiled egg (1)',78,6],['Omelette (2 eggs)',190,13],
 ['Chicken breast grilled (150 g)',250,46],['Chicken tikka (1 leg piece)',260,30],['Chicken karahi (1 cup)',380,30],['Chicken biryani (1 plate)',550,25],
 ['Seekh kebab (2)',250,18],['Beef qeema (1 cup)',400,30],['Mutton curry (1 cup)',420,28],['Nihari (1 cup)',450,25],['Haleem (1 cup)',350,20],
 ['Fish fry (150 g)',330,30],['Daal chana (1 cup)',270,14],['Daal mash (1 cup)',300,15],['Mixed sabzi (1 cup)',150,4],['Chana chaat (1 cup)',220,9],
 ['Roti / chapati (1)',120,4],['Paratha (1)',300,6],['Aloo paratha (1)',330,7],['Naan (1)',290,9],['Plain rice (1 cup)',205,4],
 ['Halwa puri breakfast',900,20],['Samosa (1)',260,5],['Dahi / yogurt (1 cup)',150,9],['Raita (1 cup)',120,6],['Greek yogurt (170 g)',100,17],
 ['Whey protein (1 scoop)',120,24],['Oats (50 g dry)',190,7],['Milk (1 glass)',150,8],['Lassi salted (1 glass)',150,8],['Lassi sweet (1 glass)',260,8],
 ['Doodh patti chai',120,3],['Chai, no sugar',70,3],['Peanut butter (1 tbsp)',95,4],['Almonds (10)',70,3],['Paneer (100 g)',265,18],
 ['Tuna (1 can)',120,26],['Fruit chaat (1 cup)',120,2],
];

export const METRIC_PICKER = [
 ['steps','steps'],['resting_hr','bpm'],['hrv_ms','ms'],['sleep_h','h'],['vo2max','ml/kg/min'],['weight_kg','kg'],
 ['active_kcal','kcal'],['spo2_pct','%'],['bp_systolic','mmHg'],['bp_diastolic','mmHg'],['recovery_pct','%'],['strain','score'],
];

export const RESEARCH = [];// filled from research.json at runtime
