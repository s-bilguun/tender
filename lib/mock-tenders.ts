import { TenderItem } from './types';

export const MOCK_MONGOLIAN_TENDERS: TenderItem[] = [
  {
    invitationId: 1789954081812,
    invitationNumber: "БХЯ/20260102031",
    tenderCode: "БХЯ/20260102031",
    tenderName: "Цэргийн төв эмнэлгийн тоног төхөөрөмжийг шинэчлэх төслийн III үе шатны эмнэлгийн тоног төхөөрөмж бэлтгэн нийлүүлэгчийг сонгон шалгаруулах",
    budgetEntityName: "Батлан хамгаалах яам",
    totalBudget: 40955200000,
    tenderTypeCode: "PRODUCT",
    tenderTypeName: "Бараа",
    industry: "medical",
    industryName: "Эрүүл мэнд, эмнэлгийн тоног төхөөрөмж",
    publishDate: "2026-09-28T09:00:00Z",
    receiveDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // ~18 hours left (Critical urgency)
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "Мэс заслын иж бүрэн тоног төхөөрөмж, сэхээн амьдруулах тасгийн 16 ширхэг дижитал монитор, соронзон резонанст томографийн (MRI 3.0T) аппаратыг суурилуулах, 24 сарын баталгаат засвар үйлчилгээ үзүүлэх.",
    eligibility_requirements: [
      "Эрүүл мэндийн яамны эмнэлгийн тоног төхөөрөмж нийлүүлэх тусгай зөвшөөрөл (Хүчинтэй хугацаа 2027 он хүртэл)",
      "Сүүлийн 2 жилийн борлуулалтын орлого 20 тэрбум төгрөгөөс багагүй байх",
      "Үйлдвэрлэгчийн албан ёсны эрхийн гэрчилгээ (Authorized Distributor Certificate)"
    ],
    historical_flags: "Өмнөх II шатны нийлүүлэлттэй ижил үйлдвэрлэгчийн стандарт шаардсан, өндөр төсөвтэй төсөл.",
    raw_data: {
      pdfFileName: "ТШББ_ЦТЭ_Тоног_төхөөрөмж.pdf"
    }
  },
  {
    invitationId: 1789954091997,
    invitationNumber: "АШУҮИСЭ/20260102004",
    tenderCode: "АШУҮИСЭ/20260102004",
    tenderName: "АШУҮИС-ийн Их сургуулийн эмнэлэгт 2026 оны хэрэгцээт эм, эмнэлгийн хэрэгсэл, лабораторийн урвалж нийлүүлэх",
    budgetEntityName: "Анагаахын шинжлэх ухааны үндэсний их сургуулийн эмнэлэг",
    totalBudget: 1920883000,
    tenderTypeCode: "PRODUCT",
    tenderTypeName: "Бараа",
    industry: "medical",
    industryName: "Эрүүл мэнд, эм",
    publishDate: "2026-09-29T10:00:00Z",
    receiveDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // ~2 days left (Urgent)
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "Улсын эмийн бүртгэлд бүртгэгдсэн 142 нэр төрлийн зайлшгүй шаардлагатай эм, дуслын шингэн, цусны биохимийн анализаторын урвалж бодисуудыг стандартын дагуу нийлүүлж дуусгах.",
    eligibility_requirements: [
      "Эм, эмнэлгийн хэрэгсэл ханган нийлүүлэх тусгай зөвшөөрөл (GSP, GDP стандарт хангасан агуулах)",
      "Борлуулалтын орлого сүүлийн 1 жилд 1.5 тэрбум төгрөгөөс доошгүй байх",
      "Эмийн чанарын гэрчилгээ (CoA) хавсаргах"
    ],
    historical_flags: "Жил бүр зарлагддаг тогтмол нийлүүлэлтийн гэрээ, зах зээлийн жишиг үнэтэй нийцсэн.",
    raw_data: {
      pdfFileName: "ТББ_Эм_бэлдмэл_2026.pdf"
    }
  },
  {
    invitationId: 1789954114561,
    invitationNumber: "УБЦТС/20260102005",
    tenderCode: "УБЦТС/20260102005",
    tenderName: "10кВ болон 0.4кВ-ын цахилгаан дамжуулах агаарын болон кабель шугамын шинэчлэлтийн кабель утас нийлүүлэх",
    budgetEntityName: "Улаанбаатар цахилгаан түгээх сүлжээ ТӨХК",
    totalBudget: 1835251762,
    tenderTypeCode: "PRODUCT",
    tenderTypeName: "Бараа",
    industry: "construction",
    industryName: "Барилга, дэд бүтэц",
    publishDate: "2026-09-30T14:30:00Z",
    receiveDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Active
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "ААБл-10кВ 3x240 мм2 хүчний кабель 15,000 метр, СИП-4 4x95 мм2 тусгаарлагчтай утас 25,000 метр, кабелийн муфт болон холболтын дагалдах хэрэгслүүдийг Улаанбаатар хот дахь төв агуулахад нийлүүлнэ.",
    eligibility_requirements: [
      "Цахилгаан дамжуулах шугамын материал үйлдвэрлэх эсвэл нийлүүлэх эрхийн гэрчилгээ",
      "MNS IEC стандартын тохирлын гэрчилгээтэй байх",
      "Тендерийн баталгаа: 18,352,517 төгрөг цахимаар байршуулах"
    ],
    historical_flags: "Төрийн өмчит компаниас зарласан томоохон дэд бүтцийн нийлүүлэлт.",
    raw_data: {
      pdfFileName: "ТББ_Кабель_утас.pdf"
    }
  },
  {
    invitationId: 1789440121429,
    invitationNumber: "ӨМАЦЦСЕБС2/20260102009",
    tenderCode: "ӨМАЦЦСЕБС2/20260102009",
    tenderName: "Ерөнхий боловсролын 2-р сургуулийн 8-12-р ангийн сурагчдын үдийн цай, халуун хоолны үйлчилгээ үзүүлэгчийг сонгон шалгаруулах",
    budgetEntityName: "Өмнөговь аймгийн Цогтцэций сумын ерөнхий боловсролын хоёрдугаар сургууль",
    totalBudget: 343440000,
    tenderTypeCode: "JOB",
    tenderTypeName: "Ажил",
    industry: "food",
    industryName: "Хүнс, хоол үйлчилгээ",
    publishDate: "2026-09-18T00:00:00Z",
    receiveDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "2026-2027 оны хичээлийн жилд 850 сурагчийн эрүүл ахуйн шаардлага хангасан шим тэжээллэг халуун хоол, үдийн цайны үйлчилгээг сургуулийн гал тогоонд стандартын дагуу бэлтгэн хүргэх.",
    eligibility_requirements: [
      "Нийтийн хоол үйлдвэрлэл, үйлчилгээний тусгай зөвшөөрөл (ХАБЭА, HACCP)",
      "Мэргэжлийн тогооч, ахлах технологичтой байх лавлагаа",
      "Эрүүл мэндийн үзлэгийн дэвтэр бүрэн баталгаажсан байх"
    ],
    historical_flags: "Орон нутгийн төсвийн санхүүжилттэй, хүүхдийн хоолны чанарт өндөр шалгууртай.",
    raw_data: {
      pdfFileName: "ТШББ_Үдийн_хоол_Цогтцэций.pdf"
    }
  },
  {
    invitationId: 1789954125889,
    invitationNumber: "ЦХХХЯ/20260102012",
    tenderCode: "ЦХХХЯ/20260102012",
    tenderName: "Төрийн үйлчилгээний нэгдсэн систем E-Mongolia 5.0 шинэчлэлт, хиймэл оюун (AI) туслах чатбот модуль хөгжүүлэлт",
    budgetEntityName: "Цахим хөгжил, инновац, харилцаа холбооны яам",
    totalBudget: 3200000000,
    tenderTypeCode: "JOB",
    tenderTypeName: "Ажил",
    industry: "it",
    industryName: "Мэдээллийн технологи, програм хангамж",
    publishDate: "2026-10-01T11:00:00Z",
    receiveDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "E-Mongolia системийн microservices архитектурын шинэчлэл, төрийн 1,200 гаруй үйлчилгээний лавлахыг Монгол хэлний LLM загварт суурилсан AI чатботаар автоматжуулах, кибер аюулгүй байдлын аудит хийлгэх.",
    eligibility_requirements: [
      "МТ болон Програм хангамж боловсруулах тусгай зөвшөөрөл",
      "ISO/IEC 27001 болон ISO 9001 чанарын удирдлагын гэрчилгээтэй байх",
      "Сүүлийн 3 жилд ижил төстэй өндөр ачаалалтай (1M+ хэрэглэгч) төрийн систем хөгжүүлсэн туршлага"
    ],
    historical_flags: "Монгол улсын цахим шилжилтийн тэргүүлэх чиглэлийн стратеги төсөл.",
    raw_data: {
      pdfFileName: "ТШББ_EMongolia_AI_Module.pdf"
    }
  },
  {
    invitationId: 1789954139988,
    invitationNumber: "ЗТЯ/20260201015",
    tenderCode: "ЗТЯ/20260201015",
    tenderName: "Улаанбаатар - Дархан чиглэлийн 4 эгнээ хатуу хучилттай авто замын засвар арчлалт, гүүрийн бэхэлгээний ажил",
    budgetEntityName: "Зам, тээврийн хөгжлийн яам",
    totalBudget: 15800000000,
    tenderTypeCode: "JOB",
    tenderTypeName: "Ажил",
    industry: "construction",
    industryName: "Барилга, зам тээвэр",
    publishDate: "2026-09-25T08:00:00Z",
    receiveDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day left (Critical)
    docStatusCode: "RECEIVE_TENDER",
    docStatusName: "Тендер хүлээн авч байгаа",
    full_scope_of_work: "Авто замын 48.5 км-ээс 82.3 км хүртэлх хучилтын эвдрэлийг асфальт бетоноор нөхөх, замын ус зайлуулах хоолой 14 ширхэг солих, тэмдэг тэмдэглэгээг олон улсын стандартаар шинэчлэх.",
    eligibility_requirements: [
      "Авто зам, гүүр барих тусгай зөвшөөрөл (ЗТЯ-ны хүчинтэй Зөвшөөрөл)",
      "Асфальт бетоны суурин үйлдвэр болон индүү, дэвсэгч 12-оос доошгүй өөрийн механизмуудтай байх",
      "Борлуулалтын орлого сүүлийн 3 жилийн дунджаар 10 тэрбумаас дээш байх"
    ],
    historical_flags: "Улсын чанартай төв коридорын яаралтай засвар арчлалтын төсөл.",
    raw_data: {
      pdfFileName: "ТББ_Дархан_Автозам_Засвар.pdf"
    }
  }
];
