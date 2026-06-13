# 로컬 LLM 번역 비교 보고서

- **생성**: 2026-05-29T00:32:26
- **테스트 책**: A Christmas Carol (pg46) — Charles Dickens
- **테스트 페이지**: 3페이지, 17단락, 6296자

## ⚡ 속도 / 안정성 매트릭스

| 모델 | 소요(초) | 단락 파싱 | 성공률 | 추정 토큰/초 |
|:---|---:|:---:|:---:|---:|
| Claude (기존) | 106.3 | 17/17 | ✅ | 8.1 |
| EXAONE 7.8B | 315.7 | -1/17 | ❌ | 4.7 |
| EXAONE 32B | 1770.1 | -1/17 | ❌ | 1.0 |
| Qwen2.5 32B | 1093.4 | 17/17 | ✅ | 0.5 |
| DeepSeek-R1 14B | 610.6 | -1/17 | ❌ | 2.0 |
| DeepSeek-R1 32B | 2089.1 | 17/17 | ✅ | 0.2 |

## 📖 단락별 번역 비교

### 단락 1

**[원문]**
> Seeing clearly that it would be useless to pursue their point, the gentlemen withdrew. Scrooge resumed his labours with an improved opinion of himself, and in a more facetious temper than was usual with him.

**[Claude (기존)]**
> 자신들의 주장을 더 밀어붙여 봐야 소용없다는 것을 분명히 깨달은 신사들은 물러갔다. 스크루지는 자신에 대한 만족감이 한층 높아진 채, 평소보다 더 익살스러운 기분으로 일을 다시 시작했다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 그들이 그들의 주장을 계속하기가 무용할 것임을 명확히 인식하고 난 후, 양반들은 물러났다. 스코지지는 자신에 대한 개선된 평가와 그의 습관보다는 좀 더 유쾌한 기분으로 자신의 업무를 재개했다.

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 그들은 더 이상 그 주장을 펼치는 것이 무용하다고 보고 철수했다. 스크루지는 자신에 대한 평가를 개선하고 평소보다 유쾌한 기분으로 업무에 착수했다.

---

### 단락 2

**[원문]**
> Meanwhile the fog and darkness thickened so, that people ran about with flaring links, proffering their services to go before horses in carriages, and conduct them on their way. The ancient tower of a church, whose gruff old bell was always peeping slily down at Scrooge out of a Gothic window in the wall, became invisible, and struck the hours and quarters in the clouds, with tremulous vibrations afterwards as if its teeth were chattering in its frozen head up there. The cold became intense. In the main street, at the corner of the court, some labourers were repairing the gas-pipes, and had lighted a great fire in a brazier, round which a party of ragged men and boys were gathered: warming their hands and winking their eyes before the blaze in rapture. The water-plug being left in solitude, its overflowings sullenly congealed, and turned to misanthropic ice. The brightness of the shops where holly sprigs and berries crackled in the lamp heat of the windows, made pale faces ruddy as they passed. Poulterers' and grocers' trades became a splendid joke: a glorious pageant, with which it was next to impossible to believe that such dull principles as bargain and sale had anything to do. The Lord Mayor, in the stronghold of the mighty Mansion House, gave orders to his fifty cooks and butlers to keep Christmas as a Lord Mayor's household should; and even the little tailor, whom he had fined five shillings on the previous Monday for being drunk and bloodthirsty in the streets, stirred up to-morrow's pudding in his garret, while his lean wife and the baby sallied out to buy the beef.

**[Claude (기존)]**
> 그러는 동안 안개와 어둠은 점점 짙어져, 사람들은 활활 타오르는 횃불을 들고 뛰어다니며 마차를 끄는 말 앞에서 길을 안내해주겠다고 자청하며 다녔다. 벽의 고딕풍 창문에서 늘 스크루지를 슬며시 내려다보던, 거친 옛 종이 달린 낡은 교회 탑은 보이지 않게 되어, 구름 속에서 시각과 15분을 알렸고, 마치 저 위 얼어붙은 머리에서 이가 덜덜 떨리는 듯 떨리는 진동을 그 뒤에 남겼다. 추위는 매서워졌다. 큰길 모퉁이 골목에서는 몇몇 인부들이 가스관을 수리하면서 화로에 큰 불을 피웠고, 그 주위에는 누더기를 걸친 사내들과 소년들 한 무리가 모여 황홀하게 그 불꽃 앞에서 손을 녹이고 눈을 깜빡이고 있었다. 홀로 남겨진 급수전은 흘러넘친 물이 침울하게 얼어붙어 인간을 혐오하는 듯한 얼음으로 변했다. 호랑가시나무 가지와 열매가 창가 등불의 열기에 톡톡 소리를 내며 빛나는 가게들의 환한 빛은, 그 앞을 지나가는 창백한 얼굴들을 발그레하게 만들었다. 가금류 가게와 식료품 가게의 장사는 그야말로 멋진 농담 같았다. 흥정이니 매매니 하는 따분한 원리가 그것과 관련이 있다고는 도저히 믿기지 않는, 영광스러운 행렬이었다. 위풍당당한 시장 관저의 요새 안에서 시장은 50명의 요리사와 집사들에게 시장의 가문답게 크리스마스를 보내라고 명령했다. 그리고 지난 월요일에 길거리에서 술 취해 난동을 부린 죄로 5실링의 벌금을 매겼던 그 작은 재단사조차, 다락방에서 내일의 푸딩을 휘저었고, 그의 야윈 아내와 아기는 쇠고기를 사러 밖으로 나섰다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 그 사이에 안개와 어둠이 더욱 짙어져 사람들은 불빛을 들고 말들 앞에서 길을 인도해 주겠다며 마차를 타고 다니는 사람들에게 서비스를 제공하며 뛰어다녔다. 스코지지를 항상 벽의 고딕 창문 너머로 슬쩍 내려다보던 교회의 오래된 탑은 보이지 않게 되었고, 구름 속에서 시간을 치다가 마치 그 위에 있는 얼어붙은 머리에서 이를 떨리는 것처럼 후에 흔들렸다. 추위가 극도로 심해졌다. 주요 거리의 한 모퉁이에서는 노동자들이 가스 파이프를 수리하고 있었고, 그들은 큰 불을 피워놓았으며, 몇몇 낡은 옷을 입은 남성들과 소년들이 불 앞에서 손을 녹이며 황홀한 눈빛으로 번쩍이는 불꽃을 바라보며 모여 있었다. 물栓被留给了孤独，它的溢流沮丧地凝固了，变成了愤世嫉俗的冰。商店里挂着冬青树枝和浆果，在窗户里的灯热中噼啪作响，使苍白的脸庞变得红润起来。禽肉商和杂货商的生意变成了一场辉煌的表演：一个与买卖这样的枯燥原则几乎无关的壮丽景象。在强大的市政厅要塞中的市长命令他的五十名厨师和服务员像一个市长的家庭一样庆祝圣诞节；甚至那个因在街上醉酒和嗜血而在前一个星期一被罚款五先令的小裁缝，在阁楼里搅拌着明天的布丁，而他瘦弱的妻子和孩子则出去买牛肉。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 한편, 안개와 어둠이 짙어지면서 사람들이 화려한 등불을 들고 말 앞에서 길을 dẫn겠다며 자원봉사자로 나섰다. 성당의 옛 탑은 그 거친 종이 항상 고딕 창문 너머 스크루지를窺伺하다가, 결국 안개 속에 사라지고 구름 속에서 시간을 알렸다. 추위는 극심해졌다. 주大街에서 어떤 노동자들은 가스관을 수리하며 큰 불을 피웠고, 그 주변에 모여든 낡은 옷 입은 남자들과 아이들은 화를 보며 손을 녹이고 있었다. 수도꼭지에서는 외로움에 차서 얼어붙은 물이 흘렀다. 가게 창문에서 Holly가 반짝이는 빛으로 지나가는 사람들의 блед한 얼굴을 화사하게 만들었다. 도축업자와杂货店 주인의 직업은 웃기고 화려한 행렬 같았다. 시장 판매원들은 크리스마스를 맞아 집안을 장식했다. 작은缝纫店主는 전날에 취하고 거친 모습으로 벌금을 받았지만, 그는 다음 날 요리를 하며 가난한 아내와 아이가 소고기를 사러 나갔다.

---

### 단락 3

**[원문]**
> Foggier yet, and colder. Piercing, searching, biting cold. If the good Saint Dunstan had but nipped the Evil Spirit's nose with a touch of such weather as that, instead of using his familiar weapons, then indeed he would have roared to lusty purpose. The owner of one scant young nose, gnawed and mumbled by the hungry cold as bones are gnawed by dogs, stooped down at Scrooge's keyhole to regale him with a Christmas carol: but at the first sound of

**[Claude (기존)]**
> 안개는 더욱 짙어졌고, 추위는 더욱 매서워졌다. 살을 에고, 뼛속까지 파고드는, 깨물어대는 추위였다. 만일 선량한 성 던스턴이 그 익숙한 무기 대신 그런 날씨로 악령의 코끝을 살짝 꼬집기만 했더라도, 그는 정말이지 우렁차게 비명을 지르게 만들었으리라. 굶주린 추위에 갉아먹히고 우물거려져, 마치 개에게 뜯기는 뼈처럼 된 어느 빈약하고 어린 코의 주인은, 스크루지의 열쇠구멍 앞에 몸을 굽혀 그를 위해 크리스마스 캐롤로 흥을 돋우려 했다. 그러나 첫 소리가 울리자마자—

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 更浓重、更冷了。刺骨、搜寻、咬人的寒冷。如果善良的圣邓斯坦用这样的天气而不是他常用的武器来夹住邪恶之灵的鼻子，那么它一定会大声咆哮。一个年轻鼻孔的主人被饥饿的寒冷啃噬着，就像狗啃骨头一样，在斯克罗奇的锁眼里蹲下身来为他唱起了圣诞颂歌：但在第一个声音响起时

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 더욱 짙은 안개와 추위였다. 찌르고, 파고들고, 물어뜯는 추위였다. 성 덴스턴이 악령의 코를 이 날씨로 잡아먹였다면, 그는 분명히 힘찬 소리를 내며 울부짖었을 것이다. 한 남자는 추위에 의해 뼈처럼 깎인 코로 스크루지의锁孔에 크리스마스 카를 구슬렸다. 그러나 처음 소리를 들은 순간,

---

### 단락 4

**[원문]**
> "God bless you, merry gentleman!          May nothing you dismay!"

**[Claude (기존)]**
> "그대에게 신의 축복이 있기를, 즐거운 신사여! 그대를 낙담시키는 일이 없기를!"

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> “上帝保佑你，快乐的绅士！愿没有什么能让你沮丧！”

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> “하느님께서 당신을 축복하세요, 즐거운 기사님! 당신에게는 아무런 근심이 없기를 바랍니다!”

---

### 단락 5

**[원문]**
> Scrooge seized the ruler with such energy of action, that the singer fled in terror, leaving the keyhole to the fog and even more congenial frost.

**[Claude (기존)]**
> 스크루지가 어찌나 격렬한 기세로 자를 움켜쥐었던지, 노래 부르던 이는 공포에 질려 달아났고, 열쇠구멍은 안개와 한층 더 어울리는 서리에게 넘겨졌다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 斯克罗吉用如此有力的动作抓起尺子，以至于歌手因恐惧而逃离，留下门锁给雾和更适宜的霜。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 스크루지는 통제不住하게 룰러를 집어들었고, 가수는 공포에 질려 도망쳤다.锁孔은 안개와 더 차가운严寒에 맡겨졌다.

---

### 단락 6

**[원문]**
> At length the hour of shutting up the counting-house arrived. With an ill-will Scrooge dismounted from his stool, and tacitly admitted the fact to the expectant clerk in the Tank, who instantly snuffed his candle out, and put on his hat.

**[Claude (기존)]**
> 마침내 사무실 문을 닫을 시각이 왔다. 스크루지는 마지못해 의자에서 내려왔고, 칸막이 안에서 기다리고 있던 서기에게 그 사실을 묵묵히 인정해 주었다. 서기는 즉시 촛불을 꺼버리고 모자를 썼다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 终于到了关闭记账室的时间。斯克罗吉不情愿地从凳子上下来，并默许了等候中的职员在水箱里的期待，后者立刻熄灭了他的蜡烛并戴上了帽子。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 마침내 사무실 문을 닫는 시간이 되었다. 스크루지는 의자에서 내려오며 기대고 있던 계산서係员에게 사실을黙시적으로 인정했다. 그 즉시 그는 촛불을 끄고 모자를 썼다.

---

### 단락 7

**[원문]**
> "You'll want all day to-morrow, I suppose?" said Scrooge.

**[Claude (기존)]**
> "내일은 하루 종일 쉬고 싶겠지?" 스크루지가 말했다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> "你明天一整天都要休假吧？" 斯克鲁奇问道。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> “내일 하루 종일 원하겠죠?” 스크루지가 말했다.

---

### 단락 8

**[원문]**
> "It's not convenient," said Scrooge, "and it's not fair. If I was to stop half-a-crown for it, you'd think yourself ill-used, I'll be bound?"

**[Claude (기존)]**
> "그건 편치 않은 일이야," 스크루지가 말했다. "공평하지도 않고. 만약 내가 그 대가로 반 크라운을 깎는다면, 자네는 자신이 부당한 대우를 받았다고 생각하겠지, 안 그래?"

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> "这不方便," 斯克鲁奇说, "也不公平。如果我扣掉半天的工资，你会觉得自己被亏待了，对吗？"

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 스크루지는 “편리하지 않고 공평하지 않다”며, 만약 절반의 금액을 요구한다면 그는 자신이 불공정하게 대해졌다고 생각할 거라고 말했다.

---

### 단락 9

**[원문]**
> "And yet," said Scrooge, "you don't think me ill-used, when I pay a day's wages for no work."

**[Claude (기존)]**
> "그런데도," 스크루지가 말했다. "일도 안 하는 날에 하루치 임금을 주는데, 자네는 내가 부당한 대우를 받는다고 생각하지 않는단 말이야."

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> "然而，" 斯克鲁奇说，"当我不为任何工作支付一天的工资时，你并不认为自己受到了不公平对待。"

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 그리고 “당신은 내가 하루 임금을 지급하는 대가로 아무 일도 하지 않는다는 사실에 불만이 없다”며 말했다.

---

### 단락 10

**[원문]**
> The clerk observed that it was only once a year.

**[Claude (기존)]**
> 서기는 그것이 일 년에 한 번뿐이라고 말했다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 职员指出这是一年只有一次的事情。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 서기사는 단순히 한 해에 한 번이라고 관찰했다.

---

### 단락 11

**[원문]**
> "A poor excuse for picking a man's pocket every twenty-fifth of December!" said Scrooge, buttoning his great-coat to the chin. "But I suppose you must have the whole day. Be here all the earlier next morning."

**[Claude (기존)]**
> "매년 12월 25일마다 남의 주머니를 터는 데 대한 변변찮은 핑계로구먼!" 스크루지가 외투 단추를 턱밑까지 채우며 말했다. "하지만 자네야 하루 종일 쉬어야겠지. 그 다음 날 아침에는 그만큼 더 일찍 나오게."

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> "一个可怜的借口，在每年十二月二十五日掏空一个人的钱包！" 斯克鲁奇一边扣上他的大衣直到下巴处说道，"但我想你必须整个白天都休息。明天早上早点来上班。"

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 스크루지는 “25일마다 남의 주머니를 털어먹는 빈약한 변명이다!”라며, 다음날 아침 일찍 오라고 말했다.

---

### 단락 12

**[원문]**
> The clerk promised that he would; and Scrooge walked out with a growl. The office was closed in a twinkling, and the clerk, with the long ends of his white comforter dangling below his waist (for he boasted no great-coat), went down a slide on Cornhill, at the end of a lane of boys, twenty times, in honour of its being Christmas Eve, and then ran home to Camden Town as hard as he could pelt, to play at blindman's-buff.

**[Claude (기존)]**
> 서기는 그렇게 하겠다고 약속했고, 스크루지는 으르렁거리며 사무실을 나섰다. 사무실은 눈 깜짝할 사이에 닫혔고, 외투를 자랑할 수 없는 처지였던 서기는 흰 목도리의 긴 자락을 허리 아래로 늘어뜨린 채, 콘힐 거리에서 소년들이 줄지어 미끄럼을 타는 끄트머리에 끼어들어, 크리스마스 이브임을 기념해 스무 번이나 미끄럼을 탔다. 그러고는 캠던 타운의 집까지 죽기 살기로 달려가서 술래잡기 놀이를 했다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 职员答应他会这样做；斯克鲁奇带着一声咆哮走了出去。办公室很快就被关闭了，那个穿着长毛围巾垂到腰下的职员（因为他没有大衣）在科恩希尔的一条小巷尽头与一群男孩一起滑下了二十次雪橇，以庆祝这是平安夜，然后他尽可能快地跑回了卡姆登镇去玩捉迷藏。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 서기사는 약속했고 스크루지는 꾸emporarily growled. 사무실은 순식간에 닫히고 서기사는 카메든 타운으로 빨리 달려가 눈먼 사람과 놀기 위해 집으로 돌아갔다.

---

### 단락 13

**[원문]**
> Scrooge took his melancholy dinner in his usual melancholy tavern; and having read all the newspapers, and beguiled the rest of the evening with his banker's-book, went home to bed. He lived in chambers which had once belonged to his deceased partner. They were a gloomy suite of rooms, in a lowering pile of building up a yard, where it had so little business to be, that one could scarcely help fancying it must have run there when it was a young house, playing at hide-and-seek with other houses, and forgotten the way out again. It was old enough now, and dreary enough, for nobody lived in it but Scrooge, the other rooms being all let out as offices. The yard was so dark that even Scrooge, who knew its every stone, was fain to grope with his hands. The fog and frost so hung about the black old gateway of the house, that it seemed as if the Genius of the Weather sat in mournful meditation on the threshold.

**[Claude (기존)]**
> 스크루지는 평소처럼 우울한 선술집에서 우울한 저녁을 먹었다. 그리고 모든 신문을 다 읽고, 남은 저녁 시간을 통장으로 달래며 보낸 뒤 집으로 돌아가 잠자리에 들었다. 그는 죽은 동업자가 한때 소유하고 있던 방에서 살았다. 그곳은 음울한 방들이 늘어선 곳으로, 안마당 위쪽에 우뚝 솟은 음산한 건물 속에 있었다. 너무나 그곳에 있을 까닭이 없는 곳이라, 마치 그 집이 어렸을 적에 다른 집들과 숨바꼭질을 하다가 그 안으로 뛰어 들어와서는 다시 나가는 길을 잊어버린 게 아닐까 하는 상상을 떨치기 어려울 정도였다. 이제는 충분히 낡고 충분히 음울해서, 다른 방들은 모두 사무실로 세놓아져 있고 스크루지 말고는 아무도 그 집에 살지 않았다. 안마당은 너무 어두워서 그 안의 돌 하나하나까지 다 알고 있는 스크루지조차 두 손으로 더듬어야 할 정도였다. 안개와 서리가 그 집의 검고 낡은 대문에 얼마나 무겁게 드리워져 있었던지, 마치 날씨의 정령이 그 문턱 위에 앉아 슬픈 사색에 잠겨 있는 것 같았다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 斯克鲁奇在他的老酒馆里吃了一顿忧郁的晚餐；读完了所有的报纸，并用他的银行账簿打发了晚上的其余时间，然后回家睡觉。他住在曾经属于已故合伙人的一间公寓里。这是一套阴暗的房间，在一个院子里耸立着一座低矮的大楼，它在那里显得如此格格不入，以至于人们几乎无法避免想象它在年轻时可能和其他房子一起玩捉迷藏游戏，却忘记了再次找到出路的方法。现在它足够老了，也足够凄凉了，因为除了斯克鲁奇之外没有人住在这里，其他的房间都被租出去作为办公室使用。院子是如此黑暗，即使熟悉每一块石头的斯克鲁奇也不得不用手摸索着前进。雾气和霜冻围绕在房子那漆黑古老的入口处，仿佛天气之灵坐在门槛上陷入了哀伤的沉思。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 스크루지는 슬픈 식사를 했고, 신문을 읽으며 저녁을 보냈다. 그는 고인 파트너의 방에 살았는데, 어두운 방은 창공에 쌓인 건물 안쪽에 있었다. 그는 손으로 길을 찾으며 어두운 마ews지를 지나갔다.

---

### 단락 14

**[원문]**
> Now, it is a fact, that there was nothing at all particular about the knocker on the door, except that it was very large. It is also a fact, that Scrooge had seen it, night and morning, during his whole residence in that place; also that Scrooge had as little of what is called fancy about him as any man in the city of London, even including--which is a bold word--the corporation, aldermen, and livery. Let it also be borne in mind that Scrooge had not bestowed one thought on Marley, since his last mention of his seven years' dead partner that afternoon. And then let any man explain to me, if he can, how it happened that Scrooge, having his key in the lock of the door, saw in the knocker, without its undergoing any intermediate process of change--not a knocker, but Marley's face.

**[Claude (기존)]**
> 자, 그 문에 달린 노커에는 매우 크다는 것 말고는 별달리 특별한 점이 아무것도 없었다는 것은 엄연한 사실이다. 또한 스크루지가 그 집에 살아온 내내 아침저녁으로 그것을 봐왔다는 것도 사실이며, 스크루지가 런던 시 안의 어느 누구 못지않게—심지어 과감히 말하자면—시 조합, 시 참사회원, 시 동업조합원들까지 포함해 그들 누구 못지않게 환상이라 불릴 만한 것이 거의 없는 사람이었다는 것도 사실이다. 또한 스크루지가 그날 오후 7년 전에 죽은 동업자를 언급한 이후로 말리에 대해 단 한 번도 생각해 본 적이 없었다는 사실도 기억해 두자. 그러니 누구라도 설명할 수 있다면 내게 설명해 주기 바란다. 어떻게 스크루지가 문 자물쇠에 열쇠를 꽂은 순간, 그 노커에서—아무런 중간 변형 과정도 없이—노커가 아니라 말리의 얼굴을 보게 되었는지를.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 现在，事实是门上的敲击器并没有什么特别之处，除了它非常大之外。另一个事实是，在斯克鲁奇住在那里期间，他每天早晚都能看到它；而且斯克鲁奇在伦敦城中的人当中几乎没有所谓的想象力，甚至包括——这是一个大胆的词——市议会成员、市长和市民。还必须记住的是，自那天下午最后一次提到已故七年的合伙人马利以来，斯克鲁奇根本没有想过他。然后让任何人解释一下，如果可能的话，斯克鲁奇是如何在把钥匙插进锁里的时候，在敲击器上看到了一张并非敲击器、而是马利的脸。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 문고리를 제외하고 특별한 것은 없었지만, 스크루지는 거기 살 때 항상 보았고, 그는 런던에서 가장 창의성이 없는 사람 중 하나였다. 스크루지가 그날 오후에 7년 전 죽은 파트너인 마리를 마지막으로 언급한 후 전혀 생각하지 않았다. 그럼에도 불구하고, 문고리를 통해 마리의 얼굴을 보았다.

---

### 단락 15

**[원문]**
> Marley's face. It was not in impenetrable shadow as the other objects in the yard were, but had a dismal light about it, like a bad lobster in a dark cellar. It was not angry or ferocious, but looked at Scrooge as Marley used to look: with ghostly spectacles turned up on its ghostly forehead. The hair was curiously stirred, as if by breath or hot air; and, though the eyes were wide open, they were perfectly motionless. That, and its livid colour, made it horrible; but its horror seemed to be in spite of the face and beyond its control, rather than a part of its own expression.

**[Claude (기존)]**
> 말리의 얼굴이었다. 그 얼굴은 안마당의 다른 사물들처럼 짙은 어둠 속에 잠겨 있지 않았고, 어두운 지하 저장고 속의 상한 바닷가재처럼 어떤 음울한 빛을 띠고 있었다. 분노하거나 사납지는 않았으나, 말리가 평소에 짓던 표정 그대로 스크루지를 바라보고 있었다. 유령 같은 안경이 유령 같은 이마 위로 올려져 있었다. 머리카락은 마치 입김이나 더운 공기에 흩날리듯 묘하게 흔들리고 있었고, 두 눈은 활짝 열려 있었지만 완전히 미동이 없었다. 그 점과 그 핏기 없는 색깔이 그것을 끔찍하게 만들었지만, 그 끔찍함은 그 얼굴 자체의 표정이라기보다는 얼굴과는 무관하게, 그리고 얼굴이 통제할 수 없는 어떤 것에서 비롯되는 듯했다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 马利的脸。它不像院子里的其他物体那样处于不可穿透的阴影中，但它周围有一种阴森的光线，就像地窖里的一只坏龙虾一样。它既不愤怒也不凶猛，而是像马利生前一样看着斯克鲁奇：用鬼魂般的眼镜在他的鬼魂般额头上向上翻转着。头发奇怪地被吹动，仿佛有气流或热空气在吹拂；尽管眼睛睁得大大的，但它们完全不动。这和它灰白的颜色让它显得可怕；但它那可怕的神情似乎是在对抗这张脸并超越了它的控制范围，而不是其自身表情的一部分。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 마리의 얼굴은 어두운 셀러에서 나쁜 게驷류처럼 희미한 빛이 있었다. 그는 화나거나 야만스럽지 않았지만, 유령 같은 안경을 쓰고 있었다. 머리는 이상하게 움직였고, 눈은 완전히 고정된 상태였다. 그의 연녹색 피부와 함께 무서웠다.

---

### 단락 16

**[원문]**
> As Scrooge looked fixedly at this phenomenon, it was a knocker again.

**[Claude (기존)]**
> 스크루지가 그 현상을 뚫어지게 바라보자, 그것은 다시 노커가 되어 있었다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 当斯克鲁奇凝视着这个现象时，它又变回了一个敲击器。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 스크루지는 이 현상을 똑바로 바라보며 다시 문고리가 되었다.

---

### 단락 17

**[원문]**
> To say that he was not startled, or that his blood was not conscious of a terrible sensation to which it had been a stranger from infancy, would be untrue. But he put his hand upon the key he had relinquished, turned it sturdily, walked in, and lighted his candle.

**[Claude (기존)]**
> 그가 깜짝 놀라지 않았다거나, 어릴 적부터 한 번도 느껴본 적 없던 그 끔찍한 감각을 그의 피가 의식하지 못했다고 말한다면, 그것은 거짓말일 것이다. 그러나 그는 자신이 놓았던 열쇠에 다시 손을 얹어 단호하게 돌리고는, 안으로 걸어 들어가 촛불을 켰다.

**[EXAONE 7.8B]**
> _(번역 누락)_

**[EXAONE 32B]**
> _(번역 누락)_

**[Qwen2.5 32B]**
> 如果说他没有被吓到，或者说他的血液从未从童年起就感受到这种可怕的感觉，那将是不真实的。但他把手放在已经放弃的钥匙上，坚定地转动了它，走了进去，并点燃了他的蜡烛。

**[DeepSeek-R1 14B]**
> _(번역 누락)_

**[DeepSeek-R1 32B]**
> 그가 놀라지 않았거나 어린 시절부터 느껴본 적 없는おそろ운 감정이 없었다는 것은 거짓말이다. 그러나 그는 열쇠를 돌려 문을 열고 촛불을 켰다.

---

## 🎯 정성 평가 (CEO 직접 채점)

각 모델 종합 1~5점:

| 모델 | 자연스러움 | 문학성 | 정확도 | 종합 | 비고 |
|:---|:---:|:---:|:---:|:---:|:---|
| Claude (기존) | / 5 | / 5 | / 5 | / 5 | |
| EXAONE 7.8B | / 5 | / 5 | / 5 | / 5 | |
| EXAONE 32B | / 5 | / 5 | / 5 | / 5 | |
| Qwen2.5 32B | / 5 | / 5 | / 5 | / 5 | |
| DeepSeek-R1 14B | / 5 | / 5 | / 5 | / 5 | |
| DeepSeek-R1 32B | / 5 | / 5 | / 5 | / 5 | |

## 💡 권고 (스크립트 자동)

- 안정+빠른 로컬 모델: **Qwen2.5 32B** (1093.4초)
- 책 1권(평균 80페이지) 추정: 약 1457.9분
