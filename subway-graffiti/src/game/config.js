export const GAME_CONFIG = {
  width: 750,
  height: 1334,
  baseColor: 0x1a1a2e,
  accentColor: 0xe94560,
  secondaryColor: 0x533483,
  warningColor: 0xf39c12,
  successColor: 0x2ecc71,

  graffiti: {
    targetRadius: 50,
    perfectRadius: 20,
    shrinkSpeed: 120,
    spawnInterval: 1200,
    maxTargets: 4,
    perfectScore: 100,
    goodScore: 50,
    missScore: -20
  },

  patrol: {
    guardSpeed: 150,
    flashRadius: 120,
    spawnInterval: 4000,
    maxGuards: 3,
    caughtPenalty: 500,
    safeZoneRadius: 80
  },

  map: {
    stationCount: 8,
    unlockScorePerStation: 1000
  },

  skins: [
    { id: 'default', name: '街头蓝', color: '#3498db', unlockScore: 0 },
    { id: 'fire', name: '烈焰红', color: '#e74c3c', unlockScore: 2000 },
    { id: 'neon', name: '霓虹绿', color: '#2ecc71', unlockScore: 5000 },
    { id: 'royal', name: '皇家紫', color: '#9b59b6', unlockScore: 10000 },
    { id: 'gold', name: '黄金色', color: '#f1c40f', unlockScore: 20000 },
    { id: 'cosmic', name: '宇宙粉', color: '#e84393', unlockScore: 50000 }
  ],

  audio: {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4
  },

  difficulty: {
    normal: {
      name: '普通',
      shrinkSpeedMultiplier: 1,
      patrolRangeMultiplier: 1,
      scoreMultiplier: 1
    },
    hard: {
      name: '困难',
      baseShrinkSpeedMultiplier: 1.3,
      basePatrolRangeMultiplier: 1.2,
      baseScoreMultiplier: 1.5,
      shrinkSpeedPerStation: 0.15,
      patrolRangePerStation: 0.1,
      scorePerStation: 0.2,
      maxShrinkSpeedMultiplier: 2.5,
      maxPatrolRangeMultiplier: 2,
      maxScoreMultiplier: 3,
      extraGuardSpeed: 30,
      extraGuardPerStation: 10
    }
  }
}

export const LINES = [
  {
    id: 1,
    name: '1号线 - 红',
    color: '#e94560',
    stations: [
      {
        id: 's1-1', name: '起点站', x: 100, y: 300, unlocked: true,
        graffiti: { shrinkSpeed: 80, spawnInterval: 1600, maxTargets: 3, perfectRadius: 28, targetRadius: 55 },
        patrol: { guardSpeed: 100, flashRadius: 100, spawnInterval: 5500, maxGuards: 2, safeZoneRadius: 100, laserEnabled: false, duration: 18 },
        feedback: {
          start: '涂鸦之旅从这里开始！',
          complete: '首站告捷！继续前进！',
          perfect: ['漂亮!', '完美出手!', '太准了!'],
          good: ['不错!', '还可以', '稳了'],
          miss: ['差一点', '没跟上', '再来'],
          caught: ['被保安发现了!', '小心巡逻!']
        }
      },
      {
        id: 's1-2', name: '老街区', x: 250, y: 200, unlocked: false,
        graffiti: { shrinkSpeed: 100, spawnInterval: 1400, maxTargets: 3, perfectRadius: 24, targetRadius: 50 },
        patrol: { guardSpeed: 120, flashRadius: 110, spawnInterval: 5000, maxGuards: 2, safeZoneRadius: 90, laserEnabled: false, duration: 19 },
        feedback: {
          start: '老街区的砖墙等你来创作！',
          complete: '老街焕新颜！干得漂亮！',
          perfect: ['复古范儿!', '经典之作!', '老炮儿!'],
          good: ['有内味儿', '还行', '凑合'],
          miss: ['手生了', '没那味儿', '差远了'],
          caught: ['老街坊报警了!', '治安员来了!']
        }
      },
      {
        id: 's1-3', name: '商业中心', x: 400, y: 300, unlocked: false,
        graffiti: { shrinkSpeed: 150, spawnInterval: 900, maxTargets: 5, perfectRadius: 18, targetRadius: 45 },
        patrol: { guardSpeed: 180, flashRadius: 140, spawnInterval: 3200, maxGuards: 4, safeZoneRadius: 70, laserEnabled: true, duration: 22 },
        feedback: {
          start: '商业中心人多眼杂，速战速决！',
          complete: '在CBD留下了你的印记！牛逼！',
          perfect: ['都市速度!', '光速涂鸦!', '效率之王!'],
          good: ['跟上节奏', '没掉队', '还行吧'],
          miss: ['太慢了!', '跟不上节奏', '被人流冲散了'],
          caught: ['商场保安围过来了!', '监控拍到你了!']
        }
      },
      {
        id: 's1-4', name: '艺术区', x: 550, y: 200, unlocked: false,
        graffiti: { shrinkSpeed: 110, spawnInterval: 1100, maxTargets: 4, perfectRadius: 32, targetRadius: 60 },
        patrol: { guardSpeed: 110, flashRadius: 90, spawnInterval: 5000, maxGuards: 2, safeZoneRadius: 95, laserEnabled: false, duration: 20 },
        feedback: {
          start: '艺术区是涂鸦者的天堂，尽情发挥吧！',
          complete: '艺术品诞生！艺术家就是你！',
          perfect: ['艺术大师!', '灵魂作品!', ' museum-worthy!'],
          good: ['有想法', '创意不错', '有点东西'],
          miss: ['灵感枯竭', '没状态', '画崩了'],
          caught: ['策展人看不下去了!', '艺术警察!']
        }
      },
      {
        id: 's1-5', name: '大学城', x: 650, y: 350, unlocked: false,
        graffiti: { shrinkSpeed: 130, spawnInterval: 1000, maxTargets: 4, perfectRadius: 22, targetRadius: 48, comboBonus: true },
        patrol: { guardSpeed: 140, flashRadius: 115, spawnInterval: 4000, maxGuards: 3, safeZoneRadius: 85, laserEnabled: false, duration: 21 },
        feedback: {
          start: '大学城的学弟学妹们看着你呢！',
          complete: '学霸级操作！校园传说诞生！',
          perfect: ['学霸级!', 'GPA 4.0!', '满分答卷!'],
          good: ['及格线', '飘过', '还行吧同学'],
          miss: ['挂科了', '重修吧', '逃课被抓'],
          caught: ['宿管阿姨来了!', '校警巡逻!']
        }
      },
      {
        id: 's1-6', name: '科技园', x: 500, y: 450, unlocked: false,
        graffiti: { shrinkSpeed: 160, spawnInterval: 850, maxTargets: 5, perfectRadius: 16, targetRadius: 42 },
        patrol: { guardSpeed: 170, flashRadius: 150, spawnInterval: 3000, maxGuards: 4, safeZoneRadius: 65, laserEnabled: true, duration: 23 },
        feedback: {
          start: '科技园安保严密，黑客级操作才能通过！',
          complete: '防火墙已突破！你是最牛的黑客艺术家！',
          perfect: ['0 bug!', '完美编译!', 'AC了!'],
          good: ['能跑就行', '勉强通过', '没崩'],
          miss: ['编译错误', 'stack overflow', 'segment fault'],
          caught: ['网管发现异常流量!', '安全警报触发!']
        }
      },
      {
        id: 's1-7', name: '河畔公园', x: 300, y: 480, unlocked: false,
        graffiti: { shrinkSpeed: 90, spawnInterval: 1500, maxTargets: 3, perfectRadius: 26, targetRadius: 52 },
        patrol: { guardSpeed: 90, flashRadius: 85, spawnInterval: 6000, maxGuards: 2, safeZoneRadius: 110, laserEnabled: false, duration: 18 },
        feedback: {
          start: '河畔风景优美，放松心情涂鸦吧~',
          complete: '与自然融为一体！惬意！',
          perfect: ['清风徐来!', '诗情画意!', '岁月静好!'],
          good: ['挺惬意', '还不错', '舒服'],
          miss: ['手滑了', '被风吹歪了', '走神了'],
          caught: ['公园管理员来了!', '遛弯大爷举报!']
        }
      },
      {
        id: 's1-8', name: '终点站', x: 150, y: 550, unlocked: false,
        graffiti: { shrinkSpeed: 180, spawnInterval: 750, maxTargets: 6, perfectRadius: 14, targetRadius: 40, scoreMultiplier: 1.5 },
        patrol: { guardSpeed: 200, flashRadius: 160, spawnInterval: 2500, maxGuards: 5, safeZoneRadius: 60, laserEnabled: true, duration: 25, scoreMultiplier: 1.5 },
        feedback: {
          start: '终点站！终极考验！是时候展现真正的技术了！',
          complete: '1号线全线征服！传奇涂鸦艺术家！',
          perfect: ['LEGENDARY!', '神级操作!', '封神之战!'],
          good: ['不愧是你', '稳住了', '通关水平'],
          miss: ['功亏一篑', '最后一站翻车', '翻车现场'],
          caught: ['特警出动!', '终极安保!']
        }
      }
    ]
  },
  {
    id: 2,
    name: '2号线 - 蓝',
    color: '#3498db',
    stations: [
      {
        id: 's2-1', name: '北站', x: 100, y: 700, unlocked: true,
        graffiti: { shrinkSpeed: 85, spawnInterval: 1500, maxTargets: 3, perfectRadius: 26, targetRadius: 54 },
        patrol: { guardSpeed: 110, flashRadius: 105, spawnInterval: 5200, maxGuards: 2, safeZoneRadius: 95, laserEnabled: false, duration: 18 },
        feedback: {
          start: '北站人来人往，开启2号线的旅程！',
          complete: '北站打卡成功！旅途愉快！',
          perfect: ['准时发车!', '正点到达!', '完美启程!'],
          good: ['赶上车了', '还不赖', '顺利'],
          miss: ['错过车次', '晚点了', '没赶上'],
          caught: ['乘警注意到你了!', '车站保安!']
        }
      },
      {
        id: 's2-2', name: '体育馆', x: 250, y: 800, unlocked: false,
        graffiti: { shrinkSpeed: 140, spawnInterval: 950, maxTargets: 4, perfectRadius: 20, targetRadius: 46, scoreMultiplier: 1.2 },
        patrol: { guardSpeed: 160, flashRadius: 130, spawnInterval: 3800, maxGuards: 3, safeZoneRadius: 75, laserEnabled: false, duration: 21 },
        feedback: {
          start: '体育馆！拿出运动健儿的速度与激情！',
          complete: '冠军级表现！打破记录！',
          perfect: ['GOAL!', '绝杀!', 'MVP!'],
          good: ['助攻到手', '拿到篮板', '进攻有效'],
          miss: ['打铁了', '被盖帽', '失误了'],
          caught: ['裁判吹哨!', '教练换人!']
        }
      },
      {
        id: 's2-3', name: '博物馆', x: 400, y: 700, unlocked: false,
        graffiti: { shrinkSpeed: 100, spawnInterval: 1300, maxTargets: 3, perfectRadius: 18, targetRadius: 48 },
        patrol: { guardSpeed: 130, flashRadius: 140, spawnInterval: 4500, maxGuards: 3, safeZoneRadius: 80, laserEnabled: true, duration: 20 },
        feedback: {
          start: '博物馆历史厚重，小心那些古董安保！',
          complete: '在历史上留下了你的一笔！',
          perfect: ['国宝级!', '无价之宝!', '载入史册!'],
          good: ['有收藏价值', '珍贵', '文物级'],
          miss: ['赝品', '残破了', '修复失败'],
          caught: ['文物警察!', '警报响了!']
        }
      },
      {
        id: 's2-4', name: '音乐厅', x: 550, y: 800, unlocked: false,
        graffiti: { shrinkSpeed: 120, spawnInterval: 1000, maxTargets: 4, perfectRadius: 24, targetRadius: 50, rhythmMode: true },
        patrol: { guardSpeed: 125, flashRadius: 100, spawnInterval: 4800, maxGuards: 2, safeZoneRadius: 88, laserEnabled: false, duration: 20 },
        feedback: {
          start: '音乐厅！跟随节拍，画出你的旋律！',
          complete: '演奏完毕！满堂喝彩！BRAVO!',
          perfect: ['完美音符!', '天籁之音!', 'encore!'],
          good: ['合得上拍', '跑调不多', '在调上'],
          miss: ['跑调了', '没踩上拍', '走音严重'],
          caught: ['乐队指挥瞪你了!', '后台保安!']
        }
      },
      {
        id: 's2-5', name: '大剧院', x: 650, y: 950, unlocked: false,
        graffiti: { shrinkSpeed: 145, spawnInterval: 900, maxTargets: 4, perfectRadius: 20, targetRadius: 44, scoreMultiplier: 1.3 },
        patrol: { guardSpeed: 165, flashRadius: 135, spawnInterval: 3500, maxGuards: 4, safeZoneRadius: 70, laserEnabled: true, duration: 22 },
        feedback: {
          start: '大剧院的舞台属于你！好戏开场！',
          complete: '演出大获成功！谢幕！',
          perfect: ['精彩绝伦!', '戏精本精!', '奥斯卡级!'],
          good: ['演技在线', '不功不过', '合格表演'],
          miss: ['忘词了', '笑场了', '演砸了'],
          caught: ['舞台监督!', '幕后工作人员!']
        }
      },
      {
        id: 's2-6', name: '美术馆', x: 500, y: 1050, unlocked: false,
        graffiti: { shrinkSpeed: 115, spawnInterval: 1150, maxTargets: 4, perfectRadius: 28, targetRadius: 56, comboBonus: true },
        patrol: { guardSpeed: 115, flashRadius: 95, spawnInterval: 5200, maxGuards: 2, safeZoneRadius: 92, laserEnabled: false, duration: 19 },
        feedback: {
          start: '美术馆！在这里，你的涂鸦就是展品！',
          complete: '作品被美术馆永久收藏！骄傲！',
          perfect: ['传世之作!', '印象派大师!', '野兽派!'],
          good: ['有笔触', '构图不错', '后现代感'],
          miss: ['审美疲劳', '不知所云', '美术不及格'],
          caught: ['策展人不满!', '美术馆保卫!']
        }
      },
      {
        id: 's2-7', name: '图书馆', x: 300, y: 1080, unlocked: false,
        graffiti: { shrinkSpeed: 95, spawnInterval: 1400, maxTargets: 3, perfectRadius: 22, targetRadius: 50 },
        patrol: { guardSpeed: 95, flashRadius: 145, spawnInterval: 5500, maxGuards: 2, safeZoneRadius: 105, laserEnabled: false, duration: 19 },
        feedback: {
          start: '嘘...图书馆要安静，偷偷涂鸦别出声！',
          complete: '在书页间留下了你的墨水，漂亮！',
          perfect: ['字字珠玑!', '妙笔生花!', '一本好书!'],
          good: ['文笔通顺', '值得一读', '开卷有益'],
          miss: ['错别字', '词不达意', '翻页太快'],
          caught: ['图书管理员瞪你!', '嘘...小声点!']
        }
      },
      {
        id: 's2-8', name: '南站', x: 150, y: 1150, unlocked: false,
        graffiti: { shrinkSpeed: 190, spawnInterval: 700, maxTargets: 6, perfectRadius: 12, targetRadius: 38, scoreMultiplier: 2 },
        patrol: { guardSpeed: 210, flashRadius: 170, spawnInterval: 2200, maxGuards: 5, safeZoneRadius: 55, laserEnabled: true, duration: 28, scoreMultiplier: 2 },
        feedback: {
          start: '南站！2号线最终BOSS！全力以赴！',
          complete: '2号线全线贯通！你就是地铁涂鸦之王！',
          perfect: ['UNSTOPPABLE!', '封神!', '至高杰作!'],
          good: ['通关了', '险胜', '不容易'],
          miss: ['倒在终点', '功败垂成', '差亿点'],
          caught: ['南站终极安保!', '全线封锁!']
        }
      }
    ]
  }
]
