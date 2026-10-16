import { Locale } from './types';
import { MNT_TO_RMB_RATE } from './product-categories';

interface BilingualTenderInfo {
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
  'Сүхбаатар дүүргийн Засаг даргын Тамгын газар': '苏赫巴托尔区政府办公厅',
  'Чингэлтэй дүүргийн Засаг даргын Тамгын газар': '青格勒泰区政府办公厅',
  'Сонгинохайрхан дүүргийн Засаг даргын Тамгын газар': '松根海尔汗区政府办公厅',
  'Баянгол дүүргийн Засаг даргын Тамгын газар': '巴彦高勒区政府办公厅',
  'Эрүүл мэндийн яам': '蒙古国卫生部 (Ministry of Health)',
  'Зам, тээврийн хөгжлийн яам': '蒙古国交通运输发展部',
  'Барилга, хот байгуулалтын яам': '蒙古国建筑与城市发展部',
  'Эрчим хүчний яам': '蒙古国能源部 (Ministry of Energy)',
  'Хүнс, хөдөө аж ахуй, хөнгөн үйлдвэрийн яам': '蒙古国农业与轻工业部',
  'Уул уурхай, хүнд үйлдвэрийн яам': '蒙古国矿业与重工业部',
  'Улаанбаатар дулааны сүлжээ ТӨХК': '乌兰巴托供热管网国有股份公司',
  'Улаанбаатар цахилгаан түгээх сүлжээ ТӨХК': '乌兰巴托配电网国有股份公司',
  'Эрдэнэт үйлдвэр ТӨХК': '额尔登特铜矿国有股份公司',
  'Эрдэнэс Тавантолгой ХК': '珍宝塔温陶勒盖煤炭股份公司 (ETT)',
  'Монголын төмөр зам ТӨХК': '蒙古铁路国有股份公司 (MTZ)',
  'Улсын нэгдүгээр төв эмнэлэг': '蒙古国第一国立中央医院',
  'Улсын хоёрдугаар төв эмнэлэг': '蒙古国第二国立中央医院',
  'Улсын гуравдугаар төв эмнэлэг': '蒙古国第三国立中央医院',
  'Хавдар судлалын үндэсний төв': '蒙古国国家癌症研究中心',
  'Гэмтэл согог судлалын үндэсний төв': '蒙古国国家骨科创伤中心',
  'Шүүхийн шийдвэр гүйцэтгэх ерөнхий газар': '蒙古国司法执行总局',
  'Онцгой байдлын ерөнхий газар': '蒙古国国家紧急情况总局 (消防救援)',
  'Цагдаагийн ерөнхий газар': '蒙古国警察总局',
};

// District name mapping
const DISTRICT_MAP: [RegExp, string][] = [
  [/Хан-Уул\s*дүүрэг/i, '汉乌拉区'],
  [/Баянзүрх\s*дүүрэг/i, '巴彦珠尔赫区'],
  [/Сүхбаатар\s*дүүрэг/i, '苏赫巴托尔区'],
  [/Чингэлтэй\s*дүүрэг/i, '青格勒泰区'],
  [/Сонгинохайрхан\s*дүүрэг/i, '松根海尔汗区'],
  [/Баянгол\s*дүүрэг/i, '巴彦高勒区'],
  [/Налайх\s*дүүрэг/i, '纳来哈区'],
  [/Багануур\s*дүүрэг/i, '巴嘎诺尔区'],
  [/Багахангай\s*дүүрэг/i, '巴嘎杭爱区'],
  [/Улаанбаатар\s*хот/i, '乌兰巴托市'],
  [/Дорноговь\s*аймаг/i, '东戈壁省 (扎门乌德口岸)'],
  [/Өмнөговь\s*аймаг/i, '南戈壁省 (甘其毛都/策克口岸)'],
  [/Дархан-Уул\s*аймаг/i, '达尔汗乌拉省'],
  [/Сэлэнгэ\s*аймаг/i, '色楞格省 (苏赫巴托尔口岸)'],
  [/Орхон\s*аймаг/i, '鄂尔浑省 (额尔登特)'],
  [/Хөвсгөл\s*аймаг/i, '库苏古尔省'],
  [/Архангай\s*аймаг/i, '后杭爱省'],
  [/Төв\s*аймаг/i, '中央省'],
  [/Булган\s*аймаг/i, '布尔干省'],
  [/Ховд\s*аймаг/i, '科布多省'],
  [/Баян-Өлгий\s*аймаг/i, '巴彦乌列盖省'],
];

// Product and Scope keyword mapping
const KEYWORD_TRANSLATION_MAP: [RegExp, string][] = [
  [/зөөврийн\s*компьютер|ноутбүүк|нөүтбүүк/i, '笔记本电脑 (Laptops)'],
  [/компьютер|компьютерийн\s*тоног\s*төхөөрөмж/i, '台式电脑与计算机设备'],
  [/сервер|серверийн\s*төхөөрөмж/i, '服务器与数据存储设备'],
  [/хэвлэгч|принтер|хувилагч/i, '打印复印一体机设备'],
  [/дэлгэц|монитор|интерактив\s*самбар/i, '交互式多媒体智慧黑板/显示器'],
  [/эмнэлгийн\s*тоног\s*төхөөрөмж/i, '医疗设备与检测仪器'],
  [/эм[\s,]+эмнэлгийн\s*хэрэгсэл/i, '药品制剂与医用耗材'],
  [/хүчилтөрөгчийн\s*станц/i, '医用集中供氧中心站'],
  [/шүдний\s*эмчилгээний\s*төхөөрөмж/i, '牙科综合治疗台设备'],
  [/хэт\s*авиан\s*оношилгоо|эхо/i, '医用彩色超声诊断系统 (B超)'],
  [/рентген\s*аппарат/i, '数字化医用X射线摄影系统 (DR)'],
  [/лабораторийн\s*урвалж|оношлуур/i, '体外诊断生化试剂'],
  [/хүчний\s*кабель|цахилгааны\s*утас/i, '高低压电力电缆'],
  [/трансформатор|дэд\s*станц/i, '变压器及箱式变电站'],
  [/цахилгаан\s*дамжуулах\s*агаарын\s*шугам/i, '高压输电线路工程'],
  [/дулааны\s*шугам\s*сүлжээ/i, '城市集中供热管网管道'],
  [/цэвэр[\s,]+бохир\s*усны\s*шугам/i, '市政给排水排污管网'],
  [/ус\s*цэвэршүүлэх\s*байгууламж/i, '净水处理设施与水处理设备'],
  [/барилга\s*угсралт/i, '房屋建筑安装工程'],
  [/их\s*засвар|урсгал\s*засвар/i, '既有建筑大修翻新改造'],
  [/дулаалга|пасад/i, '建筑外墙节能保温改造'],
  [/дээврийн\s*засвар/i, '建筑屋面防水维修改造'],
  [/авто\s*зам|замын\s*хучилт/i, '沥青柏油公路路面工程'],
  [/гүүр|хоолой/i, '跨线公路桥梁涵洞工程'],
  [/экскаватор|бульдозер|индүү/i, '挖掘机/推土机/压路机重型机械'],
  [/хог\s*тээврийн\s*машин|хогийн\s*машин/i, '环卫压缩式垃圾清运车'],
  [/гал\s*унтраах\s*автомашин/i, '特种消防灭火救援车'],
  [/түргэн\s*тусламжийн\s*машин/i, '急救监护型救护车'],
  [/автомашин|суудлын\s*автомашин/i, '公务乘用车/越野车辆'],
  [/шатахуун|дизель\s*түлш|бензин/i, '汽柴油大宗成品油供应'],
  [/хүнсний\s*бүтээгдэхүүн|хүнс/i, '米面粮油与大宗生鲜食品'],
  [/үдийн\s*хоол|үдийн\s*цай/i, '中小学幼儿园学生营养配餐'],
  [/мах[\s,]+махан\s*бүтээгдэхүүн/i, '清真/冷冻牛羊肉大宗肉品'],
  [/оффисын\s*тавилга|албан\s*тасалгааны\s*тавилга/i, '钢木办公家具与文件柜'],
  [/сургуулийн\s*ширээ\s*сандал|партын\s*ком/i, '中小学学生标准化环保升降课桌椅'],
  [/хүүхдийн\s*тоглоомын\s*талбай/i, '室外儿童无动力游乐设施'],
  [/спорт\s*талбай|хиймэл\s*зүлэг/i, '人工草坪足球场与运动场地'],
  [/камер|хяналтын\s*систем/i, '网络高清安防视频监控系统'],
  [/харуул\s*хамгаалалт/i, '专业安保值守巡逻服务'],
  [/цэвэрлэгээ|ариутгал/i, '综合保洁与专业消毒灭菌服务'],
  [/ажлын\s*хувцас|дүрэмт\s*хувцас/i, '防静电安全劳保防护工装'],
  [/бичиг\s*хэрэг/i, '办公文具与打印纸张物资'],
  [/сурах\s*бичиг|хэвлэл/i, '教材图书印刷出版服务'],
];

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
    : `¥${budgetRmb.toLocaleString()} 元`;

  const guaranteeRmbFormatted = guaranteeRmb >= 10000
    ? `¥${(guaranteeRmb / 10000).toFixed(2)} 万元`
    : `¥${guaranteeRmb.toLocaleString()} 元`;

  // 1. Entity Translation
  let entityZh = '';
  if (budgetEntityName) {
    if (ENTITY_TRANSLATION_MAP[budgetEntityName]) {
      entityZh = ENTITY_TRANSLATION_MAP[budgetEntityName];
    } else {
      // Check district match
      for (const [re, dist] of DISTRICT_MAP) {
        if (re.test(budgetEntityName)) {
          entityZh = `${dist}相关单位 (${budgetEntityName})`;
          break;
        }
      }
      if (!entityZh) {
        entityZh = budgetEntityName;
      }
    }
  }

  // 2. Title Translation
  const cleanName = (tenderName || '').trim();
  let matchedKeywordZh = '';
  for (const [re, zh] of KEYWORD_TRANSLATION_MAP) {
    if (re.test(cleanName)) {
      matchedKeywordZh = zh;
      break;
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
  else if (/эмч|эмнэлэг/i.test(cleanName)) beneficiaryZh = '医院临床用';
  else if (/сурагч|хүүхэд/i.test(cleanName)) beneficiaryZh = '学生用';
  else if (/ажилтан|албан\s*хаагч/i.test(cleanName)) beneficiaryZh = '员工办公用';

  let actionZh = '采购项目';
  if (/барилга|угсралт|засвар|хийх|гүйцэтгэх/i.test(cleanName) || tenderTypeCode === 'JOB') {
    actionZh = '工程承包项目';
  } else if (/үйлчилгээ|сургалт|аудит/i.test(cleanName) || tenderTypeCode === 'SERVICE') {
    actionZh = '服务项目';
  }

  let categoryTagZh = '物资采购';
  if (tenderTypeCode === 'JOB') categoryTagZh = '工程施工';
  else if (tenderTypeCode === 'SERVICE') categoryTagZh = '咨询服务';
  else if (/it|компьютер|програм/i.test(cleanName)) categoryTagZh = 'IT数字化';
  else if (/эм|эмнэлэг/i.test(cleanName)) categoryTagZh = '医疗器械';
  else if (/кабель|эрчим\s*хүч/i.test(cleanName)) categoryTagZh = '电力能源';

  let titleZh = '';
  if (matchedKeywordZh) {
    const parts = [
      matchedDistrictZh,
      beneficiaryZh,
      matchedKeywordZh,
      actionZh
    ].filter(Boolean);
    titleZh = `[${categoryTagZh}] ${parts.join('')} (~${budgetRmbFormatted})`;
  } else {
    // General fallback
    const prefix = matchedDistrictZh ? `[${matchedDistrictZh}] ` : '';
    titleZh = `${prefix}${categoryTagZh}：${cleanName} (~${budgetRmbFormatted})`;
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
