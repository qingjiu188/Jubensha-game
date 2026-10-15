/* =========================================================
 * 身份 / 异能总表 —— 来源：《副本异能.docx》
 * ---------------------------------------------------------
 * 100 个身份，每个身份绑定一个唯一异能。
 * 身份即系统分发的代号，全局唯一，不允许重复占用。
 * 本表为唯一数据源：禁止在此之外新增身份或异能。
 * ========================================================= */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface IdentityEntry {
  /** 稳定编号 i001 ~ i100 */
  id: string;
  /** 所属类别，如「通灵与神秘学类」 */
  category: string;
  /** 身份 —— 由系统分发，作为玩家代号 */
  identity: string;
  /** 与该身份绑定的异能名 */
  ability: string;
  /** 叙事向描述 */
  desc: string;
  /** 触发方式：[主动] / [主动开关] / [被动常驻] / [被动触发] / [交互触发] */
  trigger: string;
  /** 消耗，如「20SP」「10SP/回合」「献祭20SP或20HP」 */
  cost: string;
  /** 发动门槛（SP 下限），如「20SP」 */
  threshold: string;
  /** 冷却回合数（0 = 无冷却） */
  cd: number;
  /** 核心效果 */
  effect: string;
  /** 副作用 / 代价 */
  sideEffect: string;
  /** 稀有度（文档原始值） */
  rarity: Rarity;
}

export const IDENTITIES: IdentityEntry[] = [
  { id: "i001", category: "通灵与神秘学类", identity: "灵媒", ability: "灵视", desc: "能够看到残留的灵体和隐藏的血字提示，但持续使用会快速消耗理智值并引来恶灵。",trigger: "[主动开关]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "高亮灵体/血字线索，智力+3", sideEffect: "恶灵遭遇率+30%，SP<20强制关闭并眩晕1回合", rarity: "rare" },
  { id: "i002", category: "通灵与神秘学类", identity: "降神师", ability: "附灵", desc: "可短暂让亡魂附体以获得死前记忆或怪力，但附身结束后会陷入短暂的虚弱和幻觉。",trigger: "[主动]", cost: "30SP", threshold: "30SP", cd: 5, effect: "获得死前记忆(获1条核心线索)或武力+5持续2回合", sideEffect: "结束后虚弱2回合(全属性-2)，50%概率陷入幻觉", rarity: "epic" },
  { id: "i003", category: "通灵与神秘学类", identity: "驱魔人", ability: "圣痕", desc: "在皮肤上刻画符文可形成短暂的驱魔结界，但每次使用都会对自身造成真实的烧伤伤害。",trigger: "[主动]", cost: "20SP+10HP", threshold: "25SP", cd: 3, effect: "形成驱魔结界，抵挡一次即死攻击或秒杀低级灵体", sideEffect: "自身承受真实烧伤(HP-10)，SP流失速度+20%持续3回合", rarity: "epic" },
  { id: "i004", category: "通灵与神秘学类", identity: "盲眼先知", ability: "盲听", desc: "失去视觉但能听到方圆百米内所有灵魂的低语和怪物的脚步声，极易因噪音过大导致精神崩溃。",trigger: "[被动常驻]", cost: "10SP/回合", threshold: "30SP", cd: 0, effect: "失去视觉(画面描述变暗)，但自动感知百米内怪物位置与数量", sideEffect: "噪音过大，每回合有15%概率精神崩溃(SP-15)", rarity: "rare" },
  { id: "i005", category: "通灵与神秘学类", identity: "通灵板操作员", ability: "灵界通讯", desc: "可通过通灵板向特定区域的灵体提问并获得指引，但提问内容会被附近的恶灵窃听并设下陷阱。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 4, effect: "向灵体提问，获得1个关于当前谜题的明确提示", sideEffect: "提问内容被恶灵窃听，下一回合必定触发一次怪物袭击", rarity: "rare" },
  { id: "i006", category: "通灵与神秘学类", identity: "灵体摄影师", ability: "灵界快门", desc: "用特制相机可拍下灵体的真实位置和弱点，但闪光灯会激怒被拍到的灵体。",trigger: "[主动]", cost: "10SP", threshold: "15SP", cd: 2, effect: "拍下灵体真实位置与弱点，下次攻击该灵体必定暴击", sideEffect: "闪光灯激怒灵体，该灵体仇恨锁定你，移动速度+50%", rarity: "common" },
  { id: "i007", category: "通灵与神秘学类", identity: "招魂者", ability: "灵魂羁绊", desc: "能与一个友善的灵体建立契约让其帮忙侦查，但灵体死亡时玩家会承受同等的精神冲击。",trigger: "[主动]", cost: "25SP", threshold: "30SP", cd: 6, effect: "召唤友善灵体侦查1个未探索房间，传回线索", sideEffect: "灵体若被消灭，你承受同等精神冲击(SP-30)", rarity: "rare" },
  { id: "i008", category: "通灵与神秘学类", identity: "阴阳眼童子", ability: "童言无忌", desc: "能看穿幻象和伪装成人类的怪物，但说出真相后会遭到怪物的仇恨锁定。",trigger: "[被动触发]", cost: "0SP", threshold: "20SP", cd: 0, effect: "自动看穿伪装成人类的怪物，智力识破判定自动成功", sideEffect: "说出真相后，该怪物仇恨锁定你，且无法被常规手段安抚", rarity: "rare" },
  { id: "i009", category: "通灵与神秘学类", identity: "守灵人", ability: "镇魂曲", desc: "哼唱特定旋律可让周围的低级灵体陷入沉睡，但歌声也会掩盖怪物靠近的脚步声。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 3, effect: "哼唱旋律，使当前房间低级灵体沉睡3回合", sideEffect: "歌声掩盖环境音，潜行/听觉判定-3，无法察觉背后偷袭", rarity: "common" },
  { id: "i010", category: "通灵与神秘学类", identity: "灵媒学徒", ability: "共情", desc: "能感知灵体生前的强烈情绪从而推断其死因，但会被该情绪反噬导致操作方向反向。",trigger: "[主动]", cost: "10SP", threshold: "15SP", cd: 2, effect: "感知灵体情绪推断死因，获取1条背景线索", sideEffect: "被情绪反噬，下一回合操作方向反向(如想往左走会往右)", rarity: "common" },
  { id: "i011", category: "医疗与科学类", identity: "法医", ability: "尸语者", desc: "触摸尸体可重现其死亡前最后十秒的画面，但会亲身体验死者临死前的剧痛和恐惧。",trigger: "[交互触发]", cost: "25SP", threshold: "30SP", cd: 3, effect: "触摸尸体重现死前10秒，直接获取1条死因核心线索", sideEffect: "亲身体验剧痛(HP-10, SP-5)，下回合禁止奔跑", rarity: "rare" },
  { id: "i012", category: "医疗与科学类", identity: "精神病医生", ability: "心理暗示", desc: "可对NPC或怪物施加短暂的催眠使其停滞，但对无心智的怪物无效且会消耗大量精神力。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 4, effect: "催眠人形NPC/怪物使其停滞2回合", sideEffect: "对无心智怪物无效，若失败则遭到精神反噬(SP-15)", rarity: "rare" },
  { id: "i013", category: "医疗与科学类", identity: "外科医生", ability: "痛觉阻断", desc: "可切断自身的痛觉神经，在受伤时保持绝对冷静且移动速度不降，但无法察觉致命伤直到失血倒地。",trigger: "[主动开关]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "受伤时保持绝对冷静，HP低于30不触发重伤惩罚", sideEffect: "无法察觉致命伤，HP归零前不会有任何警告提示", rarity: "rare" },
  { id: "i014", category: "医疗与科学类", identity: "药剂师", ability: "肾上腺素", desc: "可注射自制药剂短暂爆发体力逃离追杀，但药效过后会陷入严重的视野模糊和肢体颤抖。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 4, effect: "爆发体力，敏捷+5持续2回合，可强制脱离战斗", sideEffect: "药效过后视野模糊(命中/搜索判定-3)且肢体颤抖2回合", rarity: "common" },
  { id: "i015", category: "医疗与科学类", identity: "病理学家", ability: "毒素嗅觉", desc: "能闻出空气中的微量毒素、瘴气或怪物分泌的费洛蒙，但无法分辨气味来源的具体方向。",trigger: "[被动常驻]", cost: "3SP/回合", threshold: "15SP", cd: 0, effect: "自动感知空气中的微量毒素/瘴气，免疫轻度毒伤", sideEffect: "无法分辨气味来源方向，且自身会持续散发微弱药味", rarity: "common" },
  { id: "i016", category: "医疗与科学类", identity: "疯狂科学家", ability: "机械过载", desc: "可强行让损坏的电子设备或机关超负荷运转，但极易引发爆炸或短路招来怪物。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 5, effect: "强行修复/超负荷运转电子设备，直接解开机关或电击怪物", sideEffect: "30%概率引发爆炸(自身HP-15)或短路招来怪物", rarity: "epic" },
  { id: "i017", category: "医疗与科学类", identity: "护士", ability: "急救本能", desc: "在黑暗中能凭直觉找到医疗用品和急救箱的位置，但使用药品时有概率产生抗药性或副作用。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "在黑暗中自动感知医疗用品位置，使用药品HP恢复+20%", sideEffect: "15%概率产生抗药性(该药品效果减半)", rarity: "common" },
  { id: "i018", category: "医疗与科学类", identity: "解剖学者", ability: "弱点洞察", desc: "观察怪物几秒后能看穿其生理弱点，但凝视期间自身无法移动。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 3, effect: "凝视怪物3秒看穿生理弱点，下次攻击造成双倍伤害", sideEffect: "凝视期间自身无法移动，且被其他怪物攻击时无法闪避", rarity: "rare" },
  { id: "i019", category: "医疗与科学类", identity: "催眠师", ability: "记忆宫殿", desc: "可在脑海中构建安全的记忆空间以快速恢复理智值，但每次进入都有概率迷失在潜意识深处。",trigger: "[主动]", cost: "30SP", threshold: "40SP", cd: 5, effect: "进入潜意识快速恢复30点SP", sideEffect: "10%概率迷失在潜意识深处，陷入【昏迷】2回合", rarity: "epic" },
  { id: "i020", category: "医疗与科学类", identity: "病毒研究员", ability: "感染共生", desc: "主动感染轻微病毒以获得对某种毒气或怪物体液的免疫力，但会持续扣除最大生命值。",trigger: "[主动]", cost: "20SP+10最大HP", threshold: "30SP", cd: 8, effect: "主动感染轻微病毒，获得对特定毒气/体液的完全免疫", sideEffect: "永久扣除10点最大HP，且每天需要寻找抑制剂否则SP持续流失", rarity: "epic" },
  { id: "i021", category: "探索与调查类", identity: "调查记者", ability: "真相嗅觉", desc: "靠近关键线索或隐藏房间时心跳会加速，但心跳声过大会掩盖环境中的危险预警。",trigger: "[被动常驻]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "靠近关键线索/隐藏房间时心跳加速(系统给出模糊方向提示)", sideEffect: "心跳声过大，掩盖环境危险预警，潜行判定-3", rarity: "common" },
  { id: "i022", category: "探索与调查类", identity: "战地摄影师", ability: "危险预知", desc: "在按下快门前0.5秒能预判即将发生的致命危险并自动闪避，但相机胶卷极其珍贵。",trigger: "[被动触发]", cost: "10SP/次", threshold: "25SP", cd: 0, effect: "遭遇致命危险时自动闪避(免除一次致命伤害)", sideEffect: "相机胶卷极其珍贵，每局游戏仅限触发3次", rarity: "epic" },
  { id: "i023", category: "探索与调查类", identity: "民俗学者", ability: "古籍解读", desc: "能瞬间看懂任何古老的诅咒文字和神秘符号，但阅读不可名状的文字会直接增加疯狂值。",trigger: "[交互触发]", cost: "15SP", threshold: "20SP", cd: 2, effect: "瞬间看懂古老诅咒/符号，直接破解相关谜题", sideEffect: "阅读不可名状文字，直接增加疯狂值(SP-10)", rarity: "rare" },
  { id: "i024", category: "探索与调查类", identity: "考古学家", ability: "历史回溯", desc: "触摸古迹可看到该地点过去的场景，但可能会看到不该看的恐怖画面导致理智狂掉。",trigger: "[交互触发]", cost: "20SP", threshold: "30SP", cd: 4, effect: "触摸古迹看到过去场景，获取1条隐藏背景线索", sideEffect: "可能看到恐怖画面，导致理智狂掉(SP-15)，50%概率引来灵体", rarity: "rare" },
  { id: "i025", category: "探索与调查类", identity: "侦探", ability: "演绎法", desc: "收集到三个以上线索后可在脑海中自动推理出下一步行动指南，但推理错误会遭到精神惩罚。",trigger: "[主动]", cost: "25SP", threshold: "30SP", cd: 5, effect: "收集3条线索后自动推理出下一步行动指南(系统直接给选项)", sideEffect: "若推理错误，遭到精神惩罚(SP-20)且线索作废", rarity: "epic" },
  { id: "i026", category: "探索与调查类", identity: "探险家", ability: "直觉寻路", desc: "在迷宫或复杂建筑中总能感知到出口或安全屋的大致方向，但容易忽略身边的隐藏陷阱。",trigger: "[被动常驻]", cost: "3SP/回合", threshold: "15SP", cd: 0, effect: "在迷宫/复杂建筑中自动感知出口/安全屋大致方向", sideEffect: "容易忽略身边隐藏陷阱，敏捷(闪避陷阱)判定-2", rarity: "common" },
  { id: "i027", category: "探索与调查类", identity: "窃听专家", ability: "声波放大", desc: "可听到隔壁房间或墙后的对话和动静，但佩戴耳机时会完全丧失对背后袭击的感知。",trigger: "[主动开关]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "听到隔壁/墙后对话和动静，获取NPC情报", sideEffect: "佩戴耳机时完全丧失对背后袭击的感知，背后受击无法闪避", rarity: "common" },
  { id: "i028", category: "探索与调查类", identity: "密码破解者", ability: "数字直觉", desc: "看到密码锁或加密文件时能迅速感知正确的数字组合，但解密过程需要消耗大量时间且无法中断。",trigger: "[交互触发]", cost: "20SP", threshold: "25SP", cd: 3, effect: "看到密码锁迅速感知正确组合，直接开锁", sideEffect: "解密过程需要消耗1个完整回合，且期间无法中断/移动", rarity: "rare" },
  { id: "i029", category: "探索与调查类", identity: "地图绘制师", ability: "空间记忆", desc: "走过一次的地方能在脑海中生成精确的3D地图并标记已探索区域，但无法标记动态移动的怪物。",trigger: "[被动常驻]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "走过一次的地方自动生成精确3D地图，标记已探索区域", sideEffect: "无法标记动态移动的怪物，且地图不会显示隐藏房间", rarity: "rare" },
  { id: "i030", category: "探索与调查类", identity: "都市传说收集者", ability: "传说具象", desc: "说出当地的都市传说可短暂召唤出传说中的物品，但传说本身可能会成真并攻击玩家。",trigger: "[主动]", cost: "30SP", threshold: "40SP", cd: 8, effect: "说出当地传说召唤传说物品(强力道具/线索)", sideEffect: "传说本身可能会成真并攻击你(召唤出对应怪物)", rarity: "legendary" },
  { id: "i031", category: "边缘与黑暗职业类", identity: "盗墓贼", ability: "寻龙点穴", desc: "能感知地下空洞、暗门和埋藏的陪葬品，但极易触发古老的防盗机关或唤醒守墓怪物。",trigger: "[被动常驻]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "自动感知地下空洞/暗门/陪葬品位置", sideEffect: "极易触发古老防盗机关(敏捷判定-2)，或唤醒守墓怪物", rarity: "rare" },
  { id: "i032", category: "边缘与黑暗职业类", identity: "入殓师", ability: "死者尊严", desc: "为尸体整理仪容可安抚其灵魂使其不攻击自己，但整理过程需要耗费大量时间且不能被打断。",trigger: "[交互触发]", cost: "15SP", threshold: "20SP", cd: 3, effect: "整理尸体仪容，安抚其灵魂使其不攻击自己，并掉落遗物", sideEffect: "整理过程需耗费1个完整回合，且期间不能被打断", rarity: "common" },
  { id: "i033", category: "边缘与黑暗职业类", identity: "屠夫", ability: "血腥威慑", desc: "身上带有浓烈的血腥味，能震慑低级怪物使其不敢靠近，但会吸引体型庞大的顶级掠食者。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "身上带浓烈血腥味，震慑低级怪物使其不敢靠近", sideEffect: "会吸引体型庞大的顶级掠食者(遭遇BOSS概率+20%)", rarity: "rare" },
  { id: "i034", category: "边缘与黑暗职业类", identity: "小偷", ability: "暗影潜行", desc: "在黑暗中移动时几乎不发出声音且身形变淡，但一旦进入光照区域或心跳过快就会立刻显形。",trigger: "[主动开关]", cost: "8SP/回合", threshold: "25SP", cd: 0, effect: "黑暗中移动无声且身形变淡，潜行判定+5", sideEffect: "进入光照区域或心跳过快(受惊吓)时立刻显形并眩晕1回合", rarity: "rare" },
  { id: "i035", category: "边缘与黑暗职业类", identity: "纵火犯", ability: "火焰亲和", desc: "能徒手点燃物品且对火焰伤害有极高抗性，但会消耗周围的氧气并引发烟雾导致窒息。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 4, effect: "徒手点燃物品，对火焰伤害极高抗性，可驱散怕光怪物", sideEffect: "消耗周围氧气(引发烟雾导致全队ST-10)，易引发火灾", rarity: "epic" },
  { id: "i036", category: "边缘与黑暗职业类", identity: "杀手", ability: "致命直觉", desc: "能预判敌人下一次攻击的轨迹并完美闪避，但只能用于对抗有实体的人形怪物。",trigger: "[被动触发]", cost: "10SP/次", threshold: "30SP", cd: 0, effect: "预判人形怪物下一次攻击轨迹并完美闪避", sideEffect: "只能用于对抗有实体的人形怪物，对灵体/野兽无效", rarity: "epic" },
  { id: "i037", category: "边缘与黑暗职业类", identity: "拾荒者", ability: "废物利用", desc: "能将场景中的垃圾快速组合成一次性陷阱或武器，但制作过程会发出巨大噪音。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 3, effect: "将垃圾组合成一次性陷阱/武器(造成30点伤害或困住怪物2回合)", sideEffect: "制作过程发出巨大噪音，吸引周围3个房间内的怪物", rarity: "common" },
  { id: "i038", category: "边缘与黑暗职业类", identity: "骗子", ability: "伪装大师", desc: "可短暂改变自己的外貌伪装成场景中的雕像或低级怪物，但被识破后会遭到集火。",trigger: "[主动]", cost: "25SP", threshold: "30SP", cd: 5, effect: "改变外貌伪装成雕像/低级怪物，混入怪物群中获取情报", sideEffect: "被识破后(智力<20)遭到集火，且伪装期间无法攻击", rarity: "rare" },
  { id: "i039", category: "边缘与黑暗职业类", identity: "走私犯", ability: "空间口袋", desc: "拥有一个容量有限的异次元口袋可存放关键道具，但每次存取都会引来灵体窥视。",trigger: "[被动常驻]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "拥有异次元口袋，随身物品栏容量+5，可存放活物", sideEffect: "每次存取物品都会引来灵体窥视(增加1点环境腐化度)", rarity: "rare" },
  { id: "i040", category: "边缘与黑暗职业类", identity: "守夜人", ability: "黑暗视觉", desc: "在完全无光的环境下视物如白昼，但瞳孔无法适应任何光源，遇到手电筒或闪光弹会短暂致盲。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "完全无光环境下视物如白昼，暗处所有判定+2", sideEffect: "瞳孔无法适应光源，遇到手电筒/闪光弹会短暂致盲2回合", rarity: "common" },
  { id: "i041", category: "特殊状态与弱势群体类", identity: "聋哑人", ability: "震动感知", desc: "听不到声音但能通过地面和墙壁的震动感知怪物的体型和移动速度，极度依赖触觉。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "听不到声音，但通过震动感知怪物体型/速度，免疫音波攻击", sideEffect: "极度依赖触觉，无法察觉远程声音线索，交涉判定-3", rarity: "common" },
  { id: "i042", category: "特殊状态与弱势群体类", identity: "梦游者", ability: "梦境穿梭", desc: "可在特定地点入睡进入梦境世界，梦境中可穿过实体门，但醒来后身体会极度虚弱。",trigger: "[主动]", cost: "30SP", threshold: "40SP", cd: 6, effect: "入睡进入梦境，可穿过实体门进行侦查", sideEffect: "醒来后身体极度虚弱(ST归零)，且梦境中可能遭遇梦魇", rarity: "epic" },
  { id: "i043", category: "特殊状态与弱势群体类", identity: "精神分裂者", ability: "多重人格", desc: "可在不同人格间切换（如力量型、敏捷型），但切换时会有短暂的失控期且容易引发幻觉。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 3, effect: "切换人格(力量型武力+5/敏捷型敏捷+5)持续3回合", sideEffect: "切换时有1回合失控期(无法操作)，且容易引发幻觉", rarity: "epic" },
  { id: "i044", category: "特殊状态与弱势群体类", identity: "轮椅患者", ability: "机械改造", desc: "轮椅经过改装可短暂加速冲刺或攀爬台阶，但一旦损坏只能靠手爬行，且目标变大极易被攻击。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 4, effect: "轮椅短暂加速冲刺或攀爬台阶，敏捷+3持续2回合", sideEffect: "轮椅一旦损坏(受击)只能靠手爬行(敏捷-5)，且目标变大", rarity: "rare" },
  { id: "i045", category: "特殊状态与弱势群体类", identity: "孕妇", ability: "生命庇护", desc: "腹中胎儿的生命力可形成微弱的保护罩抵挡一次致命攻击，但每次抵挡都会让胎儿虚弱。",trigger: "[被动触发]", cost: "0SP", threshold: "20SP", cd: 0, effect: "胎儿生命力形成保护罩，抵挡一次致命攻击", sideEffect: "每次抵挡让胎儿虚弱，抵挡3次后胎儿死亡，玩家SP上限永久-20", rarity: "legendary" },
  { id: "i046", category: "特殊状态与弱势群体类", identity: "孤儿", ability: "孩童体型", desc: "体型娇小可钻入通风管等狭小空间躲避怪物，但力量极小无法搬动重物或推开堵死的门。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "体型娇小可钻入通风管/狭小空间躲避怪物", sideEffect: "力量极小，无法搬动重物/推开堵死的门，武力上限锁定为30", rarity: "common" },
  { id: "i047", category: "特殊状态与弱势群体类", identity: "瘾君子", ability: "戒断反应", desc: "在极度恐惧时可通过注射药物获得短暂的无痛觉和亢奋状态，但药效过后会陷入严重的幻觉。",trigger: "[主动]", cost: "10SP+20HP", threshold: "15SP", cd: 5, effect: "极度恐惧时注射药物，获得2回合无痛觉(HP低于0不死)和亢奋", sideEffect: "药效过后陷入严重幻觉(SP-30)，且 ST 强制归零", rarity: "rare" },
  { id: "i048", category: "特殊状态与弱势群体类", identity: "昏迷者", ability: "灵魂出窍", desc: "肉体可进入假死状态，灵魂出窍进行侦查，但灵魂状态无法触碰实体且容易被灵体吞噬。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 5, effect: "肉体假死，灵魂出窍侦查，免疫物理伤害", sideEffect: "灵魂无法触碰实体，且容易被灵体吞噬(若SP归零则直接BE)", rarity: "epic" },
  { id: "i049", category: "特殊状态与弱势群体类", identity: "连体双胞胎", ability: "双生感应", desc: "两人可共享视觉和听觉，一人受伤另一人可分担伤害，但如果其中一人死亡，另一人会立刻精神崩溃。",trigger: "[被动常驻]", cost: "0SP", threshold: "20SP", cd: 0, effect: "两人共享视觉/听觉，一人受伤另一人可分担50%伤害", sideEffect: "若其中一人死亡，另一人立刻精神崩溃(SP归零)", rarity: "epic" },
  { id: "i050", category: "特殊状态与弱势群体类", identity: "失忆者", ability: "碎片闪回", desc: "接触特定物品时会闪回关键剧情或密码，但闪回期间角色会陷入僵直且周围会刷新怪物。",trigger: "[交互触发]", cost: "15SP", threshold: "25SP", cd: 3, effect: "接触特定物品闪回关键剧情/密码，直接获取线索", sideEffect: "闪回期间角色僵直1回合，且周围必定刷新1只怪物", rarity: "rare" },
  { id: "i051", category: "宗教与信仰类", identity: "女巫", ability: "毒药解药", desc: "每隔十回合能制造一瓶解药或一瓶毒药，毒药可以对怪造成伤害，解药可以恢复队友以及自己的生命值，一瓶只能够恢复五十生命值，允许多人使用但总恢复不得高于五十",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 10, effect: "制造1瓶药(解药回50HP/毒药造成50伤害)，可多人使用", sideEffect: "占用1个行动回合，且毒药若被友军误食效果翻倍", rarity: "epic" },
  { id: "i052", category: "宗教与信仰类", identity: "神父", ability: "圣水祝福", desc: "可将普通水转化为圣水，对恶魔有奇效，但每天只能制作有限数量且需要消耗自身的血液。",trigger: "[主动]", cost: "15SP+5HP", threshold: "25SP", cd: 3, effect: "将普通水转化为圣水，对恶魔造成巨额伤害/驱散", sideEffect: "每天限3次，需消耗自身血液(HP-5)", rarity: "rare" },
  { id: "i053", category: "宗教与信仰类", identity: "修女", ability: "忏悔室", desc: "可创造一个半径两米的绝对安全区，怪物无法进入，但在此区域内玩家也无法攻击或使用道具。",trigger: "[主动]", cost: "30SP", threshold: "40SP", cd: 8, effect: "创造半径两米绝对安全区3回合，怪物无法进入", sideEffect: "区域内玩家无法攻击/使用道具，且SP持续流失5/回合", rarity: "legendary" },
  { id: "i054", category: "宗教与信仰类", identity: "异端裁判官", ability: "审判之眼", desc: "可看穿伪装成人类的恶魔并造成精神震慑，但直视恶魔真容会导致自身永久扣除部分理智上限。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 4, effect: "看穿伪装成人类的恶魔并造成精神震慑(眩晕2回合)", sideEffect: "直视恶魔真容导致自身永久扣除5点SP上限", rarity: "epic" },
  { id: "i055", category: "宗教与信仰类", identity: "邪教徒", ability: "黑暗献祭", desc: "可通过献祭自身的血液或理智值，向邪神祈求强大的临时增益或召唤触手攻击敌人。",trigger: "[主动]", cost: "献祭20SP或20HP", threshold: "20SP", cd: 3, effect: "向邪神祈求强力临时增益(全属性+3)或召唤触手攻击", sideEffect: "增益结束后陷入虚弱，或触手可能无差别攻击周围所有人", rarity: "epic" },
  { id: "i056", category: "宗教与信仰类", identity: "苦行僧", ability: "肉体苦弱", desc: "通过自残可大幅度提升移动速度和力量，但会持续流血并留下无法愈合的伤痕。",trigger: "[主动]", cost: "10HP", threshold: "15SP", cd: 2, effect: "自残大幅提升移动速度(敏捷+5)和力量(武力+5)持续2回合", sideEffect: "持续流血(每回合HP-3)，留下无法愈合的伤痕(最大HP-5)", rarity: "rare" },
  { id: "i057", category: "宗教与信仰类", identity: "占星师", ability: "星象指引", desc: "能根据当前的星象预测接下来一小时内会发生的特殊事件（如怪物潮），但预测可能因干扰而出错。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 6, effect: "预测接下来1小时内特殊事件(如怪物潮/安全屋刷新)", sideEffect: "预测可能因干扰出错(20%概率给出完全相反的情报)", rarity: "rare" },
  { id: "i058", category: "宗教与信仰类", identity: "萨满", ability: "图腾庇护", desc: "可在地面放置图腾减缓范围内怪物的移动速度，但图腾会散发特殊气味吸引其他区域的怪物。",trigger: "[主动]", cost: "25SP", threshold: "30SP", cd: 5, effect: "放置图腾减缓范围内怪物移动速度50%，持续3回合", sideEffect: "图腾散发特殊气味，吸引其他区域的怪物向此聚集", rarity: "rare" },
  { id: "i059", category: "宗教与信仰类", identity: "预言家", ability: "死亡倒计时", desc: "能看到自己或NPC头顶的死亡倒计时以提前规避危险，但无法改变倒计时归零的既定事实。",trigger: "[被动常驻]", cost: "10SP/回合", threshold: "30SP", cd: 0, effect: "能看到自己/NPC头顶死亡倒计时，提前规避危险", sideEffect: "无法改变倒计时归零的既定事实，且看到倒计时会增加焦虑(SP-2/回合)", rarity: "legendary" },
  { id: "i060", category: "宗教与信仰类", identity: "驱魔学徒", ability: "圣物共鸣", desc: "靠近被诅咒的圣物时能感知其怨念并解除部分封印，但会被圣物中的恶灵持续精神污染。",trigger: "[交互触发]", cost: "15SP", threshold: "25SP", cd: 3, effect: "感知被诅咒圣物怨念，解除部分封印获取强力道具", sideEffect: "被圣物中恶灵持续精神污染，SP上限临时-10直到副本结束", rarity: "rare" },
  { id: "i061", category: "宗教与信仰类", identity: "末日信徒", ability: "狂热信仰", desc: "理智值越低，对怪物的伤害和抗性越高，但理智归零时会直接异化为怪物（游戏结束）。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "理智值越低，对怪物伤害和抗性越高(SP<30时全属性+3)", sideEffect: "理智归零时直接异化为怪物(触发Bad Ending)", rarity: "epic" },
  { id: "i062", category: "现代科技与工程类", identity: "黑客", ability: "电子幽灵", desc: "可入侵监控摄像头和电子门锁，但入侵时会在网络上留下痕迹，引来电子恶灵。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 2, effect: "入侵监控/电子门锁，获取地图全貌或开门(智力自动成功)", sideEffect: "在网络上留下痕迹，下一回合必定触发“电子恶灵”追击", rarity: "rare" },
  { id: "i063", category: "现代科技与工程类", identity: "电工", ability: "线路掌控", desc: "能徒手连接断裂的电缆并控制场景内的电力分配，可制造短路电击怪物，但自身有触电风险。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 4, effect: "控制场景电力分配，制造短路电击怪物(造成40伤害)", sideEffect: "自身有触电风险(20%概率自身HP-15)", rarity: "rare" },
  { id: "i064", category: "现代科技与工程类", identity: "机械师", ability: "万物修复", desc: "可快速修复损坏的发电机和武器，但修复后的物品耐久度上限会永久降低。",trigger: "[交互触发]", cost: "15SP", threshold: "20SP", cd: 2, effect: "快速修复损坏发电机/武器，恢复其100%耐久", sideEffect: "修复后的物品耐久度上限永久降低20%", rarity: "common" },
  { id: "i065", category: "现代科技与工程类", identity: "无人机操作员", ability: "空中视角", desc: "可释放无人机进行高空侦查和引怪，但无人机电量有限且被击落时会损失重要零件。",trigger: "[主动]", cost: "10SP", threshold: "20SP", cd: 3, effect: "释放无人机高空侦查/引怪，获取安全路线", sideEffect: "无人机电量有限(限用3次)，被击落时损失重要零件(扣除1件道具)", rarity: "rare" },
  { id: "i066", category: "现代科技与工程类", identity: "程序员", ability: "代码篡改", desc: "能修改场景内部分电子设备的运行逻辑（如让电梯反向），但会引发系统崩溃导致随机故障。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 6, effect: "修改电子设备运行逻辑(如电梯反向/门锁死)", sideEffect: "引发系统崩溃导致随机故障(如全图断电/警报大作)", rarity: "epic" },
  { id: "i067", category: "现代科技与工程类", identity: "无线电爱好者", ability: "频段监听", desc: "可接收到来自其他幸存者或灵界的无线电频段，但长时间监听会听到不可名状的杂音。",trigger: "[主动开关]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "接收幸存者/灵界无线电，获取隐藏情报", sideEffect: "长时间监听听到不可名状杂音，每回合SP-3", rarity: "common" },
  { id: "i068", category: "现代科技与工程类", identity: "3D打印师", ability: "物质重构", desc: "消耗场景中的垃圾可现场打印出钥匙或简单工具，但打印过程噪音极大。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 5, effect: "消耗垃圾打印钥匙/简单工具，直接解开物理谜题", sideEffect: "打印过程噪音极大，吸引周围怪物", rarity: "rare" },
  { id: "i069", category: "现代科技与工程类", identity: "建筑师", ability: "结构透视", desc: "能看穿墙壁看到建筑内部的承重结构和隐藏房间，但无法看穿房间内的具体物品和怪物。",trigger: "[被动常驻]", cost: "8SP/回合", threshold: "25SP", cd: 0, effect: "看穿墙壁看到承重结构和隐藏房间位置", sideEffect: "无法看穿房间内具体物品和怪物，且看穿时智力判定-2", rarity: "rare" },
  { id: "i070", category: "现代科技与工程类", identity: "锁匠", ability: "万能钥匙", desc: "可无声且快速地开启任何机械锁，但每次开锁都会消耗一根特制工具，且对电子锁无效。",trigger: "[交互触发]", cost: "10SP", threshold: "15SP", cd: 1, effect: "无声快速开启任何机械锁", sideEffect: "每次消耗1根特制工具(限5次)，对电子锁无效", rarity: "common" },
  { id: "i071", category: "现代科技与工程类", identity: "声学家", ability: "频率干扰", desc: "可制造特定频率的声波干扰怪物的听觉，但也会让自身陷入短暂的耳鸣和眩晕。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 3, effect: "制造特定频率声波干扰怪物听觉，使其迷失2回合", sideEffect: "自身陷入短暂耳鸣和眩晕，下回合听觉判定-5", rarity: "rare" },
  { id: "i072", category: "艺术、文化与心理类", identity: "画家", ability: "色彩感知", desc: "能看到场景中隐藏的荧光颜料痕迹和灵体留下的情绪色彩，但世界在眼中会失去原本的真实颜色。",trigger: "[被动常驻]", cost: "5SP/回合", threshold: "20SP", cd: 0, effect: "看到隐藏荧光颜料/灵体情绪色彩，搜索判定+3", sideEffect: "世界在眼中失去真实颜色，无法分辨红色(如血液/警告标志)", rarity: "rare" },
  { id: "i073", category: "艺术、文化与心理类", identity: "音乐家", ability: "灵魂共鸣", desc: "演奏乐器可安抚狂暴的怪物或解开声音谜题，但乐器极易损坏且演奏会暴露自身位置。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 4, effect: "演奏乐器安抚狂暴怪物或解开声音谜题", sideEffect: "乐器极易损坏(30%概率碎裂)，且演奏暴露位置", rarity: "rare" },
  { id: "i074", category: "艺术、文化与心理类", identity: "作家", ability: "言灵", desc: "写下的文字有极小概率在现实中成真，但每次使用都会消耗大量理智和寿命。",trigger: "[主动]", cost: "30SP+5最大HP", threshold: "40SP", cd: 10, effect: "写下的文字有极小概率(10%)在现实中成真(如“门开了”)", sideEffect: "每次使用消耗大量理智和寿命(永久-5最大HP)", rarity: "legendary" },
  { id: "i075", category: "艺术、文化与心理类", identity: "演员", ability: "情绪面具", desc: "戴上不同面具可完美模仿怪物特征从而混入怪物群中，但戴久了会分不清自己是谁。",trigger: "[主动]", cost: "25SP", threshold: "30SP", cd: 5, effect: "戴上面具完美模仿怪物特征混入其中", sideEffect: "戴久了分不清自己是谁，持续超过3回合SP-20且无法主动摘下面具", rarity: "epic" },
  { id: "i076", category: "艺术、文化与心理类", identity: "雕塑家", ability: "泥土塑形", desc: "可用场景中的泥土或血肉快速捏出诱饵，但捏出的物品散发恶臭会吸引食腐怪物。",trigger: "[主动]", cost: "15SP", threshold: "20SP", cd: 3, effect: "用泥土/血肉捏出诱饵，吸引怪物注意力3回合", sideEffect: "捏出的物品散发恶臭，吸引食腐怪物，且自身SP-5", rarity: "common" },
  { id: "i077", category: "艺术、文化与心理类", identity: "诗人", ability: "隐喻解读", desc: "能听懂怪物低语中的隐喻从而获得解谜线索，但理解深渊语会直接导致大脑过载。",trigger: "[交互触发]", cost: "15SP", threshold: "25SP", cd: 2, effect: "听懂怪物低语中的隐喻获取解谜线索", sideEffect: "理解深渊语导致大脑过载，SP-10，下回合无法进行智力活动", rarity: "rare" },
  { id: "i078", category: "艺术、文化与心理类", identity: "舞蹈家", ability: "极限闪避", desc: "拥有极高的身体柔韧性，能做出反人类的闪避动作，但体力消耗极快且容易扭伤。",trigger: "[被动触发]", cost: "10SP/次", threshold: "30SP", cd: 0, effect: "做出反人类闪避动作，免除一次物理攻击伤害", sideEffect: "体力消耗极快(ST-20)，且20%概率扭伤(敏捷-3持续2回合)", rarity: "rare" },
  { id: "i079", category: "艺术、文化与心理类", identity: "魔术师", ability: "视觉欺骗", desc: "可制造短暂的视觉幻象迷惑怪物，但幻象一旦被识破，怪物会进入狂暴状态。",trigger: "[主动]", cost: "20SP", threshold: "25SP", cd: 4, effect: "制造短暂视觉幻象迷惑怪物，使其攻击落空", sideEffect: "幻象被识破后(智力<20)，怪物进入狂暴状态(攻击力+50%)", rarity: "rare" },
  { id: "i080", category: "艺术、文化与心理类", identity: "裁缝", ability: "血肉缝合", desc: "可用针线将掉落的怪物肢体或自己的伤口缝合，恢复部分生命值，但过程极其血腥掉san。",trigger: "[交互触发]", cost: "20SP", threshold: "25SP", cd: 3, effect: "用针线缝合伤口/怪物肢体，恢复30HP或制作临时武器", sideEffect: "过程极其血腥，SP-15，且若缝合怪物 limb 可能引发尸变", rarity: "epic" },
  { id: "i081", category: "艺术、文化与心理类", identity: "收藏家", ability: "物品记忆", desc: "触摸任何旧物都能感知其前任主人的强烈记忆片段，但会被记忆中的情感干扰。",trigger: "[交互触发]", cost: "10SP", threshold: "20SP", cd: 2, effect: "触摸旧物感知前任主人记忆片段，获取背景线索", sideEffect: "被记忆情感干扰，下回合容易做出错误判断(智力-2)", rarity: "common" },
  { id: "i082", category: "自然、元素与变异类", identity: "植物学家", ability: "藤蔓操控", desc: "可催生场景中的植物形成屏障或绊倒怪物，但植物会吸收自身的血液作为养分。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 4, effect: "催生植物形成屏障或绊倒怪物(禁锢2回合)", sideEffect: "植物吸收自身血液作为养分(HP-10)", rarity: "rare" },
  { id: "i083", category: "自然、元素与变异类", identity: "气象员", ability: "局部微气候", desc: "能小范围制造浓雾或降雨，浓雾可隐蔽身形，雨水可洗刷血迹，但会消耗大量体力。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 5, effect: "小范围制造浓雾(隐蔽身形)或降雨(洗刷血迹)", sideEffect: "消耗大量体力(ST-20)，且浓雾会降低全队视野", rarity: "epic" },
  { id: "i084", category: "自然、元素与变异类", identity: "变异者", ability: "肢体再生", desc: "断肢可在短时间内重新长出，但再生过程伴随剧痛且新长出的肢体可能畸形。",trigger: "[被动触发]", cost: "20SP/次", threshold: "30SP", cd: 0, effect: "断肢短时间内重新长出，恢复肢体功能", sideEffect: "再生伴随剧痛(SP-15)，且新肢体可能畸形(该部位判定-2)", rarity: "epic" },
  { id: "i085", category: "自然、元素与变异类", identity: "兽化人", ability: "野兽直觉", desc: "嗅觉和听觉大幅提升，能追踪怪物或猎物，但兽化时理智会大幅下降，容易敌我不分。",trigger: "[主动开关]", cost: "10SP/回合", threshold: "25SP", cd: 0, effect: "嗅觉/听觉大幅提升，追踪判定+5，武力+2", sideEffect: "兽化时理智大幅下降(SP-5/回合)，容易敌我不分(20%概率攻击队友)", rarity: "rare" },
  { id: "i086", category: "自然、元素与变异类", identity: "冰霜异能者", ability: "温度剥夺", desc: "可冻结小范围的水面或降低怪物体温使其动作迟缓，但自身也会受到冻伤。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 4, effect: "冻结水面或降低怪物体温使其动作迟缓50%", sideEffect: "自身受到冻伤(HP-5, ST-10)，且在火源附近效果减半", rarity: "rare" },
  { id: "i087", category: "自然、元素与变异类", identity: "阴影行者", ability: "影子跳跃", desc: "可潜入阴影中并在另一个阴影处出现实现瞬移，但阴影中可能潜伏着其他恐怖生物。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 3, effect: "潜入阴影并在另一阴影处瞬移，用于逃生/背刺", sideEffect: "阴影中可能潜伏其他恐怖生物(15%概率瞬移后直接遇敌)", rarity: "epic" },
  { id: "i088", category: "自然、元素与变异类", identity: "血液操控者", ability: "血刃", desc: "可操控自身或敌人的血液形成武器，但过度使用会导致自身贫血休克。",trigger: "[主动]", cost: "15SP+10HP", threshold: "25SP", cd: 2, effect: "操控血液形成武器，造成无视防御的真实伤害", sideEffect: "过度使用导致自身贫血休克(HP<30时强制眩晕)", rarity: "epic" },
  { id: "i089", category: "自然、元素与变异类", identity: "寄生虫宿主", ability: "虫群庇护", desc: "体内寄生着特殊虫群，可释放虫群吞噬小型怪物，但虫群会持续啃食内脏。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 5, effect: "释放虫群吞噬小型怪物，或形成护甲抵挡伤害", sideEffect: "虫群持续啃食内脏(HP-3/回合，持续3回合)", rarity: "rare" },
  { id: "i090", category: "自然、元素与变异类", identity: "骨语者", ability: "骸骨操控", desc: "可唤醒地下的骸骨形成骨墙，但操控的骸骨数量受限于自身精神力，且骸骨碎裂会反噬。",trigger: "[主动]", cost: "25SP", threshold: "35SP", cd: 4, effect: "唤醒地下骸骨形成骨墙，抵挡3次攻击", sideEffect: "操控数量受限于精神力，骸骨碎裂时反噬自身(SP-10)", rarity: "rare" },
  { id: "i091", category: "自然、元素与变异类", identity: "光合作用者", ability: "阳光充能", desc: "在阳光下可快速恢复生命和理智，但在黑暗中会迅速衰弱，且极度畏惧强光。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "阳光下快速恢复HP(10/回合)和SP(5/回合)", sideEffect: "黑暗中迅速衰弱(全属性-2)，且极度畏惧强光(闪光弹致盲3回合)", rarity: "rare" },
  { id: "i092", category: "概念、规则与Meta类", identity: "幸运儿", ability: "概率扭曲", desc: "开箱必出好东西、怪物攻击有概率miss，但好运透支后必定会遭遇一次致命厄运。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "开箱必出好东西，怪物攻击20%概率miss", sideEffect: "好运透支后(每局限3次)，必定遭遇一次致命厄运(即死陷阱)", rarity: "legendary" },
  { id: "i093", category: "概念、规则与Meta类", identity: "倒霉蛋", ability: "厄运吸收", desc: "主动吸引周围的陷阱和怪物仇恨以保护队友，但自身生存难度地狱级。",trigger: "[被动常驻]", cost: "0SP", threshold: "10SP", cd: 0, effect: "主动吸引周围陷阱/怪物仇恨保护队友，队友全属性+1", sideEffect: "自身生存难度地狱级(遭遇战概率+50%，陷阱触发率+30%)", rarity: "epic" },
  { id: "i094", category: "概念、规则与Meta类", identity: "时间系异能者", ability: "死亡回溯", desc: "死亡后可回溯到几分钟前，但每次回溯都会让世界的“腐化度”增加，最终导致坏结局。",trigger: "[被动触发]", cost: "50SP", threshold: "50SP", cd: 0, effect: "HP归零时回溯到上一回合，HP恢复至30", sideEffect: "世界腐化度+1(触发隐藏坏结局倒计时)，且本局仅限1次", rarity: "legendary" },
  { id: "i095", category: "概念、规则与Meta类", identity: "空间系异能者", ability: "物品置换", desc: "可将自身与视线内的一个小型物品交换位置用于逃生，但交换后会有短暂的眩晕。",trigger: "[主动]", cost: "30SP", threshold: "40SP", cd: 5, effect: "与视线内小型物品交换位置，用于逃生/获取道具", sideEffect: "交换后有1回合眩晕，且若物品在怪物手中会直接被抓取", rarity: "epic" },
  { id: "i096", category: "概念、规则与Meta类", identity: "规则怪谈受害者", ability: "规则洞察", desc: "能看到场景中隐藏的“规则纸条”并理解其逻辑，但违反规则会遭到即死或严重惩罚。",trigger: "[被动常驻]", cost: "10SP/回合", threshold: "30SP", cd: 0, effect: "自动看到并理解隐藏的“规则纸条”逻辑", sideEffect: "违反规则会遭到即死或严重惩罚(系统不给予任何预警)", rarity: "legendary" },
  { id: "i097", category: "概念、规则与Meta类", identity: "第四面墙突破者", ability: "开发者视角", desc: "能看到怪物的仇恨范围提示和道具高亮，但会被系统判定为病毒遭到“清理者”追杀。",trigger: "[被动常驻]", cost: "15SP/回合", threshold: "40SP", cd: 0, effect: "显示怪物仇恨范围/道具高亮，所有潜行/搜索+5", sideEffect: "被系统判定为病毒，每3回合必定遭到“清理者”追杀", rarity: "legendary" },
  { id: "i098", category: "概念、规则与Meta类", identity: "移动存档点", ability: "生命锚点", desc: "自身可作为一个存档点，死亡后在此复活，但每次复活都会让该地点的怪物变得更强。",trigger: "[主动]", cost: "50SP", threshold: "60SP", cd: 0, effect: "自身作为存档点，死亡后在此复活(HP恢复50%)", sideEffect: "每次复活让该地点怪物变强(属性+20%)，且全图仅限设置1次", rarity: "legendary" },
  { id: "i099", category: "概念、规则与Meta类", identity: "替罪羊", ability: "伤害转移", desc: "可将自身受到的伤害转移给周围的NPC或低级怪物，但转移次数过多会导致自身灵魂破碎。",trigger: "[主动]", cost: "20SP", threshold: "30SP", cd: 2, effect: "将自身受到的伤害100%转移给周围NPC/低级怪物", sideEffect: "转移次数过多(超过3次)导致自身灵魂破碎(SP上限永久-20)", rarity: "epic" },
  { id: "i100", category: "概念、规则与Meta类", identity: "观察者", ability: "绝对旁观", desc: "进入该状态时免疫一切伤害和精神污染，但无法与任何物品互动，且持续时间极短。",trigger: "[主动]", cost: "30SP", threshold: "50SP", cd: 8, effect: "进入该状态3回合，免疫一切伤害和精神污染", sideEffect: "无法与任何物品互动，且持续时间结束后陷入2回合【虚弱】", rarity: "legendary" },
];

/** 身份名 → 条目（O(1) 查询） */
export const IDENTITY_BY_NAME: Record<string, IdentityEntry> = Object.fromEntries(
  IDENTITIES.map((e) => [e.identity, e]),
);

/** 全部身份名（用于唯一性校验与占用统计） */
export const IDENTITY_NAMES: string[] = IDENTITIES.map((e) => e.identity);

/** 异能名 → 条目（存档只存异能名，机制字段从这里补齐） */
export const IDENTITY_BY_ABILITY: Record<string, IdentityEntry> = Object.fromEntries(
  IDENTITIES.map((e) => [e.ability, e]),
);

/** 从身份条目转成存档里的异能快照 */
export function abilityOf(entry: IdentityEntry) {
  return {
    name: entry.ability,
    desc: entry.desc,
    rarity: entry.rarity,
    // 注入 LLM 的完整机制说明：触发方式 + 消耗门槛 + CD + 效果 + 副作用
    bonus:
      `【${entry.ability}】${entry.desc}\n` +
      `机制：触发${entry.trigger}｜消耗 ${entry.cost}｜发动门槛 ${entry.threshold}｜CD ${entry.cd} 回合\n` +
      `效果：${entry.effect}\n` +
      `代价：${entry.sideEffect}`,
    category: entry.category,
    trigger: entry.trigger,
    cost: entry.cost,
    cooldown: entry.cd,
    effect: entry.effect,
    sideEffect: entry.sideEffect,
  };
}
