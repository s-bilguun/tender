import { Locale } from './types';
import { MNT_TO_RMB_RATE } from './product-categories';

export interface BilingualTenderInfo {
  titleZh: string;
  entityZh: string;
  budgetRmb: number;
  budgetRmbFormatted: string;
  guaranteeRmb: number;
  guaranteeRmbFormatted: string;
  categoryTagZh: string;
  summaryZh?: string;
}

// Common Mongolian Procuring Entity translation dictionary
const ENTITY_TRANSLATION_MAP: Record<string, string> = {
  'Боловсролын ерөнхий газар': '蒙古国教育总局 (General Authority for Education)',
  'Хан-Уул дүүргийн худалдан авах ажиллагааны алба': '汉乌拉区政府采购处',
  'Хан-Уул дүүргийн Засаг даргын Тамгын газар': '汉乌拉区政府办公厅',
  'Баянзүрх дүүргийн Засаг даргын Тамгын газар': '巴彦珠尔赫区政府办公厅',
  'Баянзүрх дүүргийн худалдан авах ажиллагааны алба': '巴彦珠尔赫区政府采购处',
  'Сүхбаатар дүүргийн Засаг даргын Тамгын газар': '苏赫巴托尔区政府办公厅',
  'Сүхбаатар дүүргийн худалдан авах ажиллагааны алба': '苏赫巴托尔区政府采购处',
  'Чингэлтэй дүүргийн Засаг даргын Тамгын газар': '青格勒泰区政府办公厅',
  'Сонгинохайрхан дүүргийн Засаг даргын Тамгын газар': '松根海尔汗区政府办公厅',
  'Сонгинохайрхан дүүргийн худалдан авах ажиллагааны алба': '松根海尔汗区政府采购处',
  'Баянгол дүүргийн Засаг даргын Тамгын газар': '巴彦高勒区政府办公厅',
  'Баянгол дүүргийн худалдан авах ажиллагааны алба': '巴彦高勒区政府采购处',
  'Нийслэлийн худалдан авах ажиллагааны газар': '乌兰巴托市政府集中采购局',
  'Төрийн худалдан авах ажиллагааны газар': '蒙古国国家政府采购署 (SPA)',
  'Эрүүл мэндийн яам': '蒙古国卫生部 (Ministry of Health)',
  'Зам, тээврийн хөгжлийн яам': '蒙古国交通运输发展部',
  'Зам, тээврийн яам': '蒙古国交通运输部',
  'Барилга, хот байгуулалтын яам': '蒙古国建筑与城市发展部',
  'Хот байгуулалт, барилга, орон сууцжуулалтын яам': '蒙古国城市建设与住房部',
  'Эрчим хүчний яам': '蒙古国能源部 (Ministry of Energy)',
  'Хүнс, хөдөө аж ахуй, хөнгөн үйлдвэрийн яам': '蒙古国食品农牧业与轻工业部',
  'Уул уурхай, хүнд үйлдвэрийн яам': '蒙古国矿业与重工业部',
  'Аж үйлдвэр, эрдэс баялгийн яам': '蒙古国工业与矿产资源部',
  'Байгаль орчин, уур амьсгалын өөрчлөлтийн яам': '蒙古国环境与气候变化部',
  'Цахим хөгжил, инновац, харилцаа холбооны яам': '蒙古国数字发展与通信部',
  'Улаанбаатар дулааны сүлжээ ТӨХК': '乌兰巴托供热管网国有股份公司',
  'Улаанбаатар цахилгаан түгээх сүлжээ ТӨХК': '乌兰巴托配电网国有股份公司 (UBEDN)',
  'Диспетчерийн үндэсний төв ТӨХК': '蒙古国家电力调度中心国有公司',
  'Цахилгаан дамжуулах үндэсний сүлжээ ТӨХК': '蒙古国家高压输电网公司',
  'Дулааны дөрөвдүгээр цахилгаан станц ТӨХК': '乌兰巴托第四热电厂 (CHP-4)',
  'Дулааны гуравдугаар цахилгаан станц ТӨХК': '乌兰巴托第三热电厂 (CHP-3)',
  'Амгалан дулааны станц ТӨХК': '阿木古楞供热站国有公司',
  'Эрдэнэт үйлдвэр ТӨХК': '额尔登特铜钼矿国有企业 (Erdenet Mining)',
  'Эрдэнэс Тавантолгой ХК': '珍宝塔温陶勒盖煤炭股份公司 (ETT)',
  'Тавантолгой ХК': '塔温陶勒盖煤矿股份公司',
  'Багануур ХК': '巴嘎诺尔煤矿股份公司',
  'Шивээ-Овоо ХК': '希威敖包煤矿股份公司',
  'Монголын төмөр зам ТӨХК': '蒙古铁路国有股份公司 (MTZ)',
  'Улаанбаатар төмөр зам ХНН': '乌兰巴托铁路局合资公司 (UBTZ)',
  'Улсын нэгдүгээр төв эмнэлэг': '蒙古国第一国立中央医院',
  'Улсын хоёрдугаар төв эмнэлэг': '蒙古国第二国立中央医院',
  'Улсын гуравдугаар төв эмнэлэг': '蒙古国第三国立中央医院',
  'Хавдар судлалын үндэсний төв': '蒙古国国家肿瘤癌症中心',
  'Гэмтэл согог судлалын үндэсний төв': '蒙古国国家骨科创伤研究中心',
  'Эх, хүүхдийн эрүүл мэндийн үндэсний төв': '蒙古国国家妇幼保健中心',
  'Халдварт өвчин судлалын үндэсний төв': '蒙古国国家传染病研究中心',
  'Шүүхийн шийдвэр гүйцэтгэх ерөнхий газар': '蒙古国司法执行总局',
  'Онцгой байдлын ерөнхий газар': '蒙古国国家紧急情况总局 (消防应急)',
  'Цагдаагийн ерөнхий газар': '蒙古国国家警察总局',
  'Хил хамгаалах ерөнхий газар': '蒙古国边防总局',
  'Гаалийн ерөнхий газар': '蒙古国海关总局',
  'Татварын ерөнхий газар': '蒙古国税务总局',
  'Иргэний нисэхийн ерөнхий газар': '蒙古国民航总局 (MCAA)',
  'Ус сувгийн удирдах газар': '乌兰巴托市政水务局 (USUG)',
  'Орон сууц нийтийн аж ахуйн удирдах газар': '乌兰巴托市政公用事业管理局',
};

// District & Province name mapping
const DISTRICT_MAP: [RegExp, string][] = [
  [/Хан-Уул\s*дүүр/i, '汉乌拉区'],
  [/Баянзүрх\s*дүүр/i, '巴彦珠尔赫区'],
  [/Сүхбаатар\s*дүүр/i, '苏赫巴托尔区'],
  [/Чингэлтэй\s*дүүр/i, '青格勒泰区'],
  [/Сонгинохайрхан\s*дүүр/i, '松根海尔汗区'],
  [/Баянгол\s*дүүр/i, '巴彦高勒区'],
  [/Налайх\s*дүүр/i, '纳来哈区'],
  [/Багануур\s*дүүр/i, '巴嘎诺尔区'],
  [/Багахангай\s*дүүр/i, '巴嘎杭爱区'],
  [/Улаанбаатар|Нийслэл/i, '乌兰巴托市'],
  [/Дорноговь/i, '东戈壁省(扎门乌德口岸)'],
  [/Өмнөговь/i, '南戈壁省(甘其毛都口岸)'],
  [/Дархан-Уул|Дархан/i, '达尔汗省'],
  [/Сэлэнгэ/i, '色楞格省'],
  [/Орхон|Эрдэнэт/i, '鄂尔浑省(额尔登特)'],
  [/Хөвсгөл/i, '库苏古尔省'],
  [/Архангай/i, '后杭爱省'],
  [/Өвөрхангай/i, '前杭爱省'],
  [/Төв\s*аймаг/i, '中央省'],
  [/Булган/i, '布尔干省'],
  [/Ховд/i, '科布多省'],
  [/Баян-Өлгий/i, '巴彦乌列盖省'],
  [/Увс/i, '乌布苏省'],
  [/Завхан/i, '扎布汗省'],
  [/Говь-Алтай/i, '戈壁阿尔泰省'],
  [/Баянхонгор/i, '巴彦洪戈尔省'],
  [/Дундговь/i, '中戈壁省'],
  [/Хэнтий/i, '肯特省'],
  [/Дорнод/i, '东方省'],
  [/Сүхбаатар\s*аймаг/i, '苏赫巴托尔省(毕其格图口岸)'],
  [/Говьсүмбэр/i, '戈壁苏木贝尔省'],
];

// Comprehensive Product and Scope keyword mapping (110+ Mongolian procurement roots)
const KEYWORD_TRANSLATION_MAP: [RegExp, string][] = [
  // IT & Electronics
  [/зөөврийн\s*компьютер|ноутбүүк|нөүтбүүк/i, '笔记本电脑设备'],
  [/компьютер|компьютерийн\s*тоног\s*төхөөрөмж/i, '台式电脑与计算机设备'],
  [/сервер|хадгалах\s*төхөөрөмж|дата\s*төв/i, '服务器与数据中心存储设备'],
  [/хэвлэгч|принтер|хувилагч|хор/i, '打印机/复印机及耗材硒鼓'],
  [/дэлгэц|монитор|интерактив|ухаалаг\s*самбар/i, '交互式智慧大屏与显示器'],
  [/програм\s*хангамж|программ\s*хангамж|лиценз|систем\s*хөгжүүлэлт/i, '软件系统开发与数字化授权'],
  [/сүлжээний\s*тоног|маршрутизатор|коммутатор|свич/i, '网络交换机与通信传输设备'],

  // Medical & Healthcare
  [/эмнэлгийн\s*тоног\s*төхөөрөмж|эмнэлгийн\s*багаж/i, '医疗器械与临床诊疗设备'],
  [/эм[\s,]+эмнэлгийн\s*хэрэгсэл|эм\s*бэлдмэл/i, '药品制剂与医用耗材物资'],
  [/хүчилтөрөгчийн\s*станц|хүчилтөрөгчийн\s*үйлдвэр/i, '医用制氧机与集中供氧系统'],
  [/шүдний|эрүү\s*нүүр/i, '口腔牙科综合诊疗设备'],
  [/хэт\s*авиан|эхо\s*аппарат/i, '医用彩色超声诊断仪(B超)'],
  [/рентген|томограф|мрт|ктг/i, '医用X射线(DR)/CT影像诊断系统'],
  [/лабораторийн\s*урвалж|оношлуур|реактив|биохими/i, '实验室体外诊断试剂与耗材'],
  [/ариутгал|автоклав|халдваргүйжүүлэлт/i, '医用高压灭菌器与消毒设备'],
  [/түргэн\s*тусламжийн\s*машин|эмнэлгийн\s*автомашин/i, '医疗急救监护型救护车'],

  // Power, Electrical & Heating
  [/хүчний\s*кабель|кабель\s*шугам|цахилгааны\s*утас|кабель/i, '高低压电力电缆与线缆物资'],
  [/трансформатор|дэд\s*станц|хуваарилах\s*байгууламж/i, '电力变压器及高低压成套开关柜'],
  [/цахилгаан\s*дамжуулах|агаарын\s*шугам|тулгуур/i, '高压架空输电线路及电杆塔材'],
  [/хэмжүүр|тоолуур|реле|автомат\s*таслуур|контролёр/i, '智能电表/继电保护与自动化控制模块'],
  [/генератор|дизель\s*станц|нөөц\s*эх\s*үүсвэр|ups/i, '柴油发电机组与UPS不间断电源'],
  [/нарны\s*цахилгаан|сэргээгдэх|аккумлятор|батарей/i, '光伏新能源设备与储能蓄电池'],
  [/дулааны\s*шугам|дулааны\s*сүлжээ|узель|ялтаст\s*солилцуур/i, '城市集中供热管网与板式换热器机组'],
  [/уурын\s*зуух|халаалтын\s*зуух|зуухны\s*засвар|бойлер/i, '工业燃煤/燃气锅炉及供暖设备'],

  // Water, Pumps, Valves & Piping
  [/шахуурга|насос|гүний\s*худаг|ус\s*соруулах/i, '工业水泵/深井潜水泵及泵站配件'],
  [/хаалт\s*арматур|хавхлага|задвижка|фланец/i, '工业阀门、法兰及管件连接件'],
  [/ган\s*хоолой|полиэтилен\s*хоолой|пэ\s*хоолой|труба|шугам\s*хоолой/i, '无缝钢管/PE给排水管道与保温管材'],
  [/цэвэр[\s,]+бохир\s*ус|ариутгах\s*татуурга|ус\s*цэвэршүүлэх/i, '市政给排水管网与污水处理工程'],

  // Mining, Drilling & Heavy Industry
  [/өрөмдлөг|цооног|өрмийн\s*хошуу|өрмийн\s*штанга/i, '矿山地质钻探设备、钻杆钻头及耗材'],
  [/буталж\s*шигших|бутлуур|шигшүүр|тээрмийн\s*бөмбөлөг|хуяг/i, '矿山破碎筛分设备、球磨机钢球与衬板'],
  [/конвейер|тууз|ролик|редуктор/i, '矿用皮带输送机、托辊及减速机配件'],
  [/тельфер|гүүрэн\s*кран|өргөх\s*механизм|лифт/i, '电动葫芦、桥式起重机及特种升降电梯'],
  [/хөдөлгүүр|цахилгаан\s*мотор|компрессор|хийн\s*шахуурга/i, '高压电机、空气压缩机及动力总成'],
  [/гагнуур|электрод|хүчилтөрөгч|ацетилен/i, '工业焊接设备、焊条焊丝及工业气体'],
  [/ган\s*бөмбөлөг|ган\s*хуудас|арматур|төмөр\s*бэлдэц|металл/i, '耐磨钢球、钢板型材与金属结构件'],
  [/химийн\s*бодис|уурхайн\s*урвалж|флотаци/i, '选矿浮选药剂与工业化工原料'],

  // Vehicles, Heavy Machinery & Spare Parts
  [/экскаватор|бульдозер|ковш|ачигч|индүү|грейдер/i, '挖掘机/装载机/平地机等工程机械'],
  [/хог\s*тээврийн|хогийн\s*машин|зам\s*цэвэрлэгээний\s*машин/i, '环卫垃圾清运车与市政清扫特种车'],
  [/гал\s*унтраах\s*автомашин|онцгой\s*байдлын/i, '消防救援特种车辆与抢险装备'],
  [/автобус|нийтийн\s*тээвэр/i, '城市公交大巴与客运车辆'],
  [/ачааны\s*автомашин|самосвал|чирэгч/i, '重型自卸卡车与货运半挂牵引车'],
  [/суудлын\s*автомашин|туулах\s*чадвар\s*сайтай|автомашин/i, '四驱越野车与公务乘用车辆'],
  [/автомашины\s*дугуй|хүнд\s*механизмын\s*дугуй|дугуй/i, '矿用工程机械轮胎与汽车轮胎'],
  [/сэлбэг\s*хэрэгсэл|сэлбэг|эд\s*анги|агрегат/i, '机械设备与车辆原厂零配件供应'],
  [/тос[\s,]+тосолгоо|гидрийн\s*тос|хөдөлгүүрийн\s*тос/i, '工业润滑油、液压油与防冻液物资'],
  [/шатахуун|дизель\s*түлш|бензин|түлш/i, '汽柴油大宗成品油燃料供应'],

  // Civil Works, Roads & Construction
  [/авто\s*зам|замын\s*хучилт|асфальт|замын\s*засвар/i, '沥青混凝土公路铺设与道路养护工程'],
  [/гүүр|ус\s*зайлуулах\s*хоолой|нүхэн\s*гарц/i, '公路桥梁、涵洞及市政雨水排水工程'],
  [/замын\s*тэмдэг|гэрэл\s*дохио|гэрэлтүүлэг/i, '道路交通标志标线与市政路灯照明工程'],
  [/явган\s*хүний\s*зам|тохижилт|ногоон\s*байгууламж/i, '市政人行道铺装与城市园林绿化亮化工程'],
  [/сургуулийн\s*барилга|цэцэрлэгийн\s*барилга|дотуур\s*байр/i, '学校/幼儿园教学楼及宿舍建设维修改造'],
  [/эмнэлгийн\s*барилга|эрүүл\s*мэндийн\s*төв/i, '医院门诊住院楼建设与装修改造工程'],
  [/барилга\s*угсралт|барилгын\s*ажил|өргөтгөл/i, '房屋建筑主体施工与扩建工程'],
  [/их\s*засвар|урсгал\s*засвар|засварын\s*ажил/i, '建筑设施大修翻新与维修改造工程'],
  [/дулаалга|фасад|пасад|гадна\s*засал/i, '建筑外墙保温节能改造与幕墙工程'],
  [/дээврийн\s*засвар|дээвэр/i, '建筑屋面防水保温维修改造工程'],
  [/цемент|бетон\s*зуурмаг|элс[\s,]+хайрга|тоосго|барилгын\s*материал/i, '水泥、商品混凝土及大宗建筑建材供应'],

  // Furniture, Security, Uniforms, Food & Services
  [/оффисын\s*тавилга|албан\s*тасалгааны\s*тавилга|тавилга|эд\s*хогшил/i, '现代办公家具、档案柜及室内软装采购'],
  [/сургуулийн\s*ширээ|ширээ\s*сандал|партын\s*ком|ор[\s,]+матрас/i, '学校课桌椅、宿舍床铺及教学家具设备'],
  [/хүүхдийн\s*тоглоомын|спорт\s*талбай|хиймэл\s*зүлэг/i, '室外儿童游乐设施与人工草坪运动场地'],
  [/хяналтын\s*камер|камержуулалт|дохиолол|камер/i, '高清视频监控安防系统与智能门禁工程'],
  [/ажлын\s*хувцас|дүрэмт\s*хувцас|хөдөлмөр\s*хамгааллын|гутал|бээлий/i, '防寒劳保防护服、安全鞋及特种工装定制'],
  [/хүнсний\s*бүтээгдэхүүн|хүнсний\s*материал|үдийн\s*хоол|мах|гурил|сүү/i, '大宗食品粮油、肉奶制品及学生营养餐供应'],
  [/бичиг\s*хэрэг|цаас|маягт|хэвлэл/i, 'A4办公用纸、文具耗材及印刷服务'],
  [/зураг\s*төсөв|тэзү|инженер\s*геологи|зөвлөх\s*үйлчилгээ/i, '工程勘察设计、可研报告(ТЭЗҮ)与咨询服务'],
  [/даатгал|аудит|үнэлгээ/i, '资产评估、财务审计与商业保险服务'],
];

// Bidirectional Chinese & English -> Mongolian Cyrillic search keyword expansion
const MULTILINGUAL_SEARCH_DICTIONARY: Array<{ match: RegExp; mnTerms: string[] }> = [
  // IT & Computers
  { match: /电脑|计算机|笔记本|台式机|computer|laptop|\bpc\b/i, mnTerms: ['компьютер', 'ноутбүүк', 'тоног төхөөрөмж'] },
  { match: /服务器|数据中心|存储|网络|交换机|server|storage|network|switch/i, mnTerms: ['сервер', 'сүлжээ', 'дата'] },
  { match: /软件|系统|信息化|数字化|授权|software|\bsystem\b|\bit\b|license/i, mnTerms: ['програм', 'систем', 'лиценз', 'мэдээллийн технологи'] },
  { match: /打印|复印|耗材|硒鼓|printer|toner/i, mnTerms: ['хэвлэгч', 'принтер', 'хор'] },
  { match: /显示器|大屏|黑板|平板|monitor|screen|display/i, mnTerms: ['дэлгэц', 'самбар', 'монитор'] },

  // Medical & Hospital
  { match: /医疗|医院|器械|临床|诊断|medical|hospital|clinic/i, mnTerms: ['эмнэлэг', 'эмнэлгийн', 'эрүүл мэнд', 'оношилгоо'] },
  { match: /药品|医药|耗材|试剂|medicine|drug|pharma|reagent/i, mnTerms: ['эм', 'урвалж', 'оношлуур', 'лаборатори'] },
  { match: /救护车|急救|ambulance/i, mnTerms: ['түргэн тусламж', 'автомашин'] },
  { match: /超声|b超|x光|\bct\b|核磁|x-?ray|ultrasound/i, mnTerms: ['рентген', 'эхо', 'хэт авиан', 'томограф'] },

  // Power, Cables & Energy
  { match: /电缆|电线|线缆|光缆|cable|wire/i, mnTerms: ['кабель', 'цахилгааны утас'] },
  { match: /变压器|变电站|开关柜|配电|transformer|substation|switchgear/i, mnTerms: ['трансформатор', 'дэд станц', 'цахилгаан'] },
  { match: /电力|电网|输电|电杆|能源|power|electricity|energy|grid/i, mnTerms: ['цахилгаан', 'эрчим хүч', 'агаарын шугам'] },
  { match: /发电机|电源|太阳能|光伏|蓄电池|电池|generator|solar|battery|\bups\b/i, mnTerms: ['генератор', 'нарны', 'аккумлятор', 'батарей'] },
  { match: /供热|暖气|锅炉|热电|换热|heating|boiler|thermal/i, mnTerms: ['дулаан', 'зуух', 'халаалт'] },

  // Water, Pumps & Pipes
  { match: /水泵|抽水|潜水泵|泵|pump/i, mnTerms: ['шахуурга', 'насос'] },
  { match: /阀门|法兰|管件|valve|flange/i, mnTerms: ['хаалт', 'хавхлага', 'арматур', 'фланец'] },
  { match: /管道|钢管|水管|pe管|pipe|pipeline|tube/i, mnTerms: ['хоолой', 'шугам хоолой', 'труба'] },
  { match: /水处理|污水|给排水|净水|water|sewage/i, mnTerms: ['цэвэр ус', 'бохир ус', 'ус цэвэршүүлэх'] },

  // Mining, Drilling & Heavy Industry
  { match: /矿|煤矿|铜矿|选矿|矿山|mining|mine|coal|copper/i, mnTerms: ['уурхай', 'эрдэнэт', 'тавантолгой', 'нүүрс', 'баяжуулах'] },
  { match: /钻探|钻机|钻头|钻杆|drilling|drill/i, mnTerms: ['өрөмдлөг', 'өрмийн', 'цооног'] },
  { match: /破碎|筛分|球磨机|钢球|衬板|crusher|mill|grinding/i, mnTerms: ['бутлуур', 'шигшүүр', 'бөмбөлөг', 'хуяг'] },
  { match: /输送机|皮带|托辊|电机|马达|空压机|conveyor|belt|motor|compressor/i, mnTerms: ['конвейер', 'тууз', 'хөдөлгүүр', 'мотор', 'компрессор'] },
  { match: /起重机|行车|电动葫芦|电梯|升降|crane|hoist|elevator|lift/i, mnTerms: ['кран', 'тельфер', 'лифт', 'өргөх'] },
  { match: /备件|配件|零件|零配件|spare|parts/i, mnTerms: ['сэлбэг', 'эд анги'] },
  { match: /钢材|钢板|钢筋|金属|水泥|建材|steel|metal|cement|concrete/i, mnTerms: ['ган', 'арматур', 'төмөр', 'цемент', 'бетон'] },

  // Vehicles, Machinery & Fuel
  { match: /挖掘机|推土机|装载机|压路机|工程机械|excavator|bulldozer|loader|machinery/i, mnTerms: ['экскаватор', 'бульдозер', 'ачигч', 'механизм'] },
  { match: /汽车|车辆|卡车|越野车|皮卡|大巴|公交|vehicle|\bcars?\b|truck|\bbus(es)?\b/i, mnTerms: ['автомашин', 'машин', 'автобус', 'самосвал'] },
  { match: /垃圾车|消防车|特种车|环卫|garbage|fire truck/i, mnTerms: ['хог тээврийн', 'гал унтраах', 'автомашин'] },
  { match: /轮胎|机油|润滑油|液压油|\btires?\b|\btyres?\b|lubricant|\boil\b/i, mnTerms: ['дугуй', 'тосолгоо', 'гидрийн тос'] },
  { match: /柴油|汽油|燃油|成品油|燃料|fuel|diesel|gasoline|petrol/i, mnTerms: ['шатахуун', 'дизель', 'түлш', 'бензин'] },

  // Roads, Bridges & Construction
  { match: /道路|公路|沥青|柏油|路面|road|highway|asphalt/i, mnTerms: ['авто зам', 'зам', 'асфальт', 'хучилт'] },
  { match: /桥梁|涵洞|隧道|bridge|culvert/i, mnTerms: ['гүүр'] },
  { match: /路灯|照明|亮化|绿化|lighting|street light|landscaping/i, mnTerms: ['гэрэлтүүлэг', 'тохижилт', 'ногоон байгууламж'] },
  { match: /建筑|施工|房屋|大楼|土建|扩建|construction|building/i, mnTerms: ['барилга', 'угсралт', 'өргөтгөл'] },
  { match: /装修|大修|维修|翻新|改造|外墙|保温|屋顶|防水|renovation|repair|roof|facade/i, mnTerms: ['их засвар', 'засвар', 'дулаалга', 'фасад', 'дээвэр'] },

  // Furniture, Security, Education, Food & Uniforms
  { match: /家具|办公桌|椅子|文件柜|课桌|床|furniture|desk|chair/i, mnTerms: ['тавилга', 'ширээ', 'сандал'] },
  { match: /学校|幼儿园|教育|宿舍|操场|school|kindergarten|education/i, mnTerms: ['сургууль', 'цэцэрлэг', 'боловсрол', 'дотуур байр'] },
  { match: /监控|摄像头|安防|报警|门禁|camera|cctv|security/i, mnTerms: ['камер', 'хяналтын', 'дохиолол'] },
  { match: /服装|工作服|劳保|防护服|制服|安全鞋|uniform|clothing|workwear|ppe/i, mnTerms: ['хувцас', 'хөдөлмөр хамгааллын', 'гутал'] },
  { match: /食品|粮食|面粉|肉|牛奶|餐饮|营养餐|\bfood\b|\bmeat\b|catering/i, mnTerms: ['хүнс', 'махан', 'хоол', 'гурил'] },

  // Major Buyers
  { match: /额尔登特|erdenet/i, mnTerms: ['эрдэнэт'] },
  { match: /塔温陶勒盖|\bett\b|tavan\s*tolgoi/i, mnTerms: ['тавантолгой', 'эрдэнэс тавантолгой'] },
  { match: /铁路|火车|railway|railroad|\bubtz\b|\bmtz\b/i, mnTerms: ['төмөр зам'] },
  { match: /乌兰巴托|市政|ulaanbaatar/i, mnTerms: ['улаанбаатар', 'нийслэл'] },
];

export function expandMultilingualSearchTerms(rawQuery?: string | null): string[] {
  if (!rawQuery || !rawQuery.trim()) return [];
  const cleaned = rawQuery.trim();
  const expanded = new Set<string>();

  // Match against dictionary
  for (const entry of MULTILINGUAL_SEARCH_DICTIONARY) {
    if (entry.match.test(cleaned)) {
      for (const mn of entry.mnTerms) {
        expanded.add(mn);
      }
    }
  }

  // If the input already contains Cyrillic or Latin tender codes/words, keep them too
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (!/[\u4e00-\u9fa5]/.test(tok)) {
      expanded.add(tok);
    }
  }

  return Array.from(expanded);
}

export function translateExtractedHighlightZh(
  tenderName: string,
  itemsCount: number,
  firstItemName?: string,
  bidSecurityReq?: string,
  deliveryPeriod?: string
): string {
  const info = getBilingualTenderInfo(tenderName);
  const parts: string[] = [];

  if (itemsCount > 0) {
    parts.push(`已从官方 ТШББ 标书提取 ${itemsCount} 项采购明细（含数量与技术参数）`);
  } else {
    parts.push(`已解析官方 ТШББ 招标文件技术规格书与投标人须知 (BDS)`);
  }

  if (bidSecurityReq) {
    if (/шаардахгүй|үгүй/i.test(bidSecurityReq)) {
      parts.push('免交投标保证金 (0₮)');
    } else {
      parts.push(`保证金：${bidSecurityReq.slice(0, 35)}`);
    }
  }

  if (deliveryPeriod) {
    parts.push(`交货/工期：${deliveryPeriod.slice(0, 30)}`);
  }

  return parts.join(' • ');
}

export function getBilingualTenderInfo(
  tenderName: string,
  budgetEntityName?: string,
  totalBudget?: number,
  tenderTypeCode?: string
): BilingualTenderInfo {
  const budget = Number(totalBudget) || 0;
  const budgetRmb = Math.round(budget / MNT_TO_RMB_RATE);
  const guaranteeRmb = Math.round(budgetRmb * 0.01);

  const budgetRmbFormatted = budgetRmb >= 10000
    ? `¥${(budgetRmb / 10000).toFixed(1)} 万元`
    : `¥${budgetRmb.toLocaleString('en-US')} 元`;

  const guaranteeRmbFormatted = guaranteeRmb >= 10000
    ? `¥${(guaranteeRmb / 10000).toFixed(2)} 万元`
    : `¥${guaranteeRmb.toLocaleString('en-US')} 元`;

  // 1. Entity Translation
  let entityZh = '';
  if (budgetEntityName) {
    if (ENTITY_TRANSLATION_MAP[budgetEntityName]) {
      entityZh = ENTITY_TRANSLATION_MAP[budgetEntityName];
    } else {
      for (const [mnKey, zhVal] of Object.entries(ENTITY_TRANSLATION_MAP)) {
        if (budgetEntityName.toLowerCase().includes(mnKey.toLowerCase())) {
          entityZh = zhVal;
          break;
        }
      }
      if (!entityZh) {
        for (const [re, dist] of DISTRICT_MAP) {
          if (re.test(budgetEntityName)) {
            entityZh = `${dist}采购单位 (${budgetEntityName})`;
            break;
          }
        }
      }
      if (!entityZh) {
        entityZh = budgetEntityName;
      }
    }
  }

  // 2. Title Translation
  const cleanName = (tenderName || '').trim();
  const matchedKeywordsZh: string[] = [];
  for (const [re, zh] of KEYWORD_TRANSLATION_MAP) {
    if (re.test(cleanName)) {
      if (!matchedKeywordsZh.includes(zh)) {
        matchedKeywordsZh.push(zh);
      }
      if (matchedKeywordsZh.length >= 2) break;
    }
  }

  let matchedDistrictZh = '';
  for (const [re, dist] of DISTRICT_MAP) {
    if (re.test(cleanName) || (budgetEntityName && re.test(budgetEntityName))) {
      matchedDistrictZh = dist;
      break;
    }
  }

  let beneficiaryZh = '';
  if (/багш\s*нарт|багш/i.test(cleanName)) beneficiaryZh = '教师专用';
  else if (/эмч|эмнэлэг/i.test(cleanName)) beneficiaryZh = '医院临床';
  else if (/сурагч|хүүхэд/i.test(cleanName)) beneficiaryZh = '学校学生';
  else if (/уурхай|баяжуулах|үйлдвэр/i.test(cleanName)) beneficiaryZh = '矿山工业';

  let actionZh = '采购项目';
  if (/барилга|угсралт|засвар|хийх|гүйцэтгэх|шинэчлэл/i.test(cleanName) || tenderTypeCode === 'JOB') {
    actionZh = '工程承包项目';
  } else if (/үйлчилгээ|сургалт|аудит|зураг\s*төсөв|тэзү|зөвлөх/i.test(cleanName) || tenderTypeCode === 'SERVICE') {
    actionZh = '技术服务项目';
  }

  let categoryTagZh = '物资采购';
  if (tenderTypeCode === 'JOB') categoryTagZh = '工程施工';
  else if (tenderTypeCode === 'SERVICE') categoryTagZh = '技术服务';
  else if (/it|компьютер|програм|сервер|сүлжээ/i.test(cleanName)) categoryTagZh = 'IT数字化';
  else if (/эм|эмнэлэг|оношлуур|лаборатори/i.test(cleanName)) categoryTagZh = '医疗医药';
  else if (/кабель|эрчим\s*хүч|цахилгаан|дулаан|зуух|трансформатор/i.test(cleanName)) categoryTagZh = '电力能源';
  else if (/өрөмдлөг|уурхай|шахуурга|насос|сэлбэг|кран|тельфер|конвейер/i.test(cleanName)) categoryTagZh = '矿山机电';
  else if (/авто\s*зам|гүүр|асфальт|гэрэлтүүлэг/i.test(cleanName)) categoryTagZh = '市政路桥';

  let titleZh = '';
  if (matchedKeywordsZh.length > 0) {
    const parts = [
      matchedDistrictZh,
      beneficiaryZh,
      matchedKeywordsZh.join('与'),
      actionZh
    ].filter(Boolean);
    titleZh = `[${categoryTagZh}] ${parts.join('')} (~${budgetRmbFormatted})`;
  } else {
    const prefix = matchedDistrictZh ? `${matchedDistrictZh}` : '蒙古国政府采购';
    titleZh = `[${categoryTagZh}] ${prefix}${actionZh} — ${cleanName.slice(0, 38)} (~${budgetRmbFormatted})`;
  }

  return {
    titleZh,
    entityZh: entityZh || budgetEntityName || '采购业主单位',
    budgetRmb,
    budgetRmbFormatted,
    guaranteeRmb,
    guaranteeRmbFormatted,
    categoryTagZh,
  };
}
